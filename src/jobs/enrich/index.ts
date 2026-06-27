import { normalizeCandidateOutput } from "../candidate-output.ts";
import { normalizeDiscoveryOutputWithReport } from "../discover/normalizer.ts";
import { persistRawRun, runDiscoveryAgent } from "../discover/runners.ts";
import { defendDiscoveryCandidates } from "../security/prompt-defense.ts";
import { buildRunLedger } from "../run-ledger.ts";
import { linkedInEnrichmentPrompt, renderEnrichmentPrompt } from "./prompts.ts";
import type { AgentRunResult, CandidateRejection, EnrichmentOptions, EnrichmentResult, JobCandidate, JobStore, StoredJobCandidate } from "../types.ts";

interface EnrichmentRun extends AgentRunResult {
  candidate: StoredJobCandidate;
  prompt: string;
}

interface NormalizedEnrichmentRun extends EnrichmentRun {
  candidates: JobCandidate[];
  rejected: CandidateRejection[];
  normalizationError: string | null;
}

export async function enrichJobs(store: JobStore, options: EnrichmentOptions): Promise<EnrichmentResult> {
  const log = options.logger || noop;
  const candidatesToEnrich = store.listCandidatesForEnrichment(Number(options.limit || 25));
  log("loaded enrichment candidates", {
    candidates: candidatesToEnrich.length,
    mode: "serial"
  });

  const total = candidatesToEnrich.length;
  const runs: EnrichmentRun[] = [];
  for (const [index, candidate] of candidatesToEnrich.entries()) {
    const prompt = renderEnrichmentPrompt(linkedInEnrichmentPrompt, candidate);
    const progress = { position: index + 1, total, id: candidate.id, title: candidate.title };
    log("starting enrichment runner", progress);
    const result = await runAgent(options, prompt);
    log("finished enrichment runner", { ...progress, exitCode: result.exitCode });
    runs.push({ candidate, prompt, ...result });
  }

  const normalizedRuns = runs.map((run) => normalizeEnrichmentRunOutput(run));
  const failedRuns = normalizedRuns.filter((run) => run.exitCode !== 0 || run.normalizationError);
  const ledger = buildRunLedger("enrichmentRuns", normalizedRuns.map((run) => ({
    label: run.candidate.id,
    ledgerFields: { candidateId: run.candidate.id, title: run.candidate.title },
    exitCode: run.exitCode,
    stdout: run.stdout,
    stderr: run.stderr,
    candidates: run.candidates,
    rejectedCandidates: run.rejected,
    normalizationError: run.normalizationError
  })));
  const runRejectedCandidates = ledger.rejectedCandidates;
  const combinedPrompt = normalizedRuns.map((run) => `# ${run.candidate.id}\n${run.prompt}`).join("\n\n");

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: linkedInEnrichmentPrompt.version,
    prompt: combinedPrompt || linkedInEnrichmentPrompt.template,
    stdout: ledger.stdout,
    stderr: ledger.stderr,
    exitCode: ledger.exitCode,
    rawOutputPath: null
  });
  const rawOutputPath = await persistRawRun({ rawDir: options.rawDir, outputPath: options.rawOutputPath }, runId, { stdout: ledger.stdout, stderr: ledger.stderr, exitCode: ledger.exitCode });
  if (rawOutputPath) store.saveRunRawOutputPath(runId, rawOutputPath);

  const normalization = normalizeDiscoveryOutputWithReport(ledger.stdout);
  const normalizedCandidates = dedupeCandidates(normalization.candidates);
  const rejectedCandidates = [...runRejectedCandidates, ...normalization.rejected];
  if (failedRuns.length > 0) log("skipped failed enrichment runners", failedRuns.map(failedRunDetails));
  if (failedRuns.length > 0 && normalizedCandidates.length === 0) {
    const rawOutput = rawOutputPath ? ` Raw output: ${rawOutputPath}` : ` Run ${runId}; inspect agent_runs.stdout/stderr in SQLite.`;
    throw new Error(`All enrichment runners failed; first failure: ${failedRunSummary(failedRuns[0])}.${rawOutput}`);
  }

  const defenseResult = await defendDiscoveryCandidates(normalizedCandidates, { logger: log });
  const candidates = defenseResult.candidates;
  store.saveCandidates(runId, candidates);
  log("saved enriched candidates", {
    runId,
    candidates: candidates.length,
    failedCandidates: failedRuns.length,
    rejectedCandidates: rejectedCandidates.length,
    rejected: rejectedCandidates
  });

  return {
    runId,
    rawOutputPath,
    requestedCount: candidatesToEnrich.length,
    normalizedCount: normalizedCandidates.length,
    failedCandidates: failedRuns.length,
    rejectedCandidates: rejectedCandidates.length,
    skippedCandidates: defenseResult.skipped.length,
    candidates
  };
}

async function runAgent(options: EnrichmentOptions, prompt: string): Promise<AgentRunResult> {
  const agent = options.runAgent || runDiscoveryAgent;
  return agent({
    runner: options.runner,
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });
}

function normalizeEnrichmentRunOutput(run: EnrichmentRun): NormalizedEnrichmentRun {
  return { ...run, ...normalizeCandidateOutput(run) };
}

function dedupeCandidates(candidates: JobCandidate[]): JobCandidate[] {
  const byId = new Map<string, JobCandidate>();
  for (const candidate of candidates) byId.set(candidate.id, candidate);
  return [...byId.values()];
}

function failedRunDetails(run: NormalizedEnrichmentRun): Record<string, unknown> {
  return {
    id: run.candidate.id,
    title: run.candidate.title,
    exitCode: run.exitCode,
    normalizationError: run.normalizationError,
    stderr: compactText(run.stderr)
  };
}

function failedRunSummary(run: NormalizedEnrichmentRun): string {
  if (run.normalizationError) {
    return `${run.candidate.id} (${run.candidate.title}) returned invalid JSON: ${run.normalizationError}`;
  }

  const details = failedRunDetails(run);
  const stderr = details.stderr ? `: ${details.stderr}` : "";
  return `${details.id} (${details.title}) exited ${details.exitCode}${stderr}`;
}

function compactText(value: string): string {
  return value
    .replace(new RegExp("\\x1b\\[[0-9;]*m", "g"), "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(" | ")
    .slice(0, 800);
}

function noop(): void {}
