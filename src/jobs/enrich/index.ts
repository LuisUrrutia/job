import { intakePreparedJobCandidates, prepareJobCandidateIntake } from "../candidate-intake.ts";
import { persistRawRun, runAgent } from "../agent-run.ts";
import { linkedInEnrichmentPrompt, renderEnrichmentPrompt } from "./prompts.ts";
import type { AgentRunResult, EnrichmentOptions, EnrichmentResult, JobStore, StoredJobCandidate } from "../types.ts";

interface EnrichmentRun extends AgentRunResult {
  candidate: StoredJobCandidate;
  prompt: string;
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
    const result = await runPromptAgent(options, prompt);
    log("finished enrichment runner", { ...progress, exitCode: result.exitCode });
    runs.push({ candidate, prompt, ...result });
  }

  const failedRuns = runs.filter((run) => run.exitCode !== 0);
  const intakePlan = prepareJobCandidateIntake(runs);
  const stdout = intakePlan.stdout;
  const stderr = runs.map((run) => run.stderr).filter(Boolean).join("\n");
  const combinedPrompt = runs.map((run) => `# ${run.candidate.id}\n${run.prompt}`).join("\n\n");
  const exitCode = failedRuns[0]?.exitCode ?? 0;

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: linkedInEnrichmentPrompt.version,
    prompt: combinedPrompt || linkedInEnrichmentPrompt.template,
    stdout,
    stderr,
    exitCode,
    rawOutputPath: null
  });
  const rawOutputPath = await persistRawRun({ rawDir: options.rawDir, outputPath: options.rawOutputPath }, runId, { stdout, stderr, exitCode });
  if (rawOutputPath) store.saveRunRawOutputPath(runId, rawOutputPath);

  const intake = await intakePreparedJobCandidates(intakePlan, { logger: log });
  if (failedRuns.length > 0) log("skipped failed enrichment runners", failedRuns.map(failedRunDetails));
  if (failedRuns.length > 0 && intake.normalizedCount === 0) {
    const rawOutput = rawOutputPath ? ` Raw output: ${rawOutputPath}` : ` Run ${runId}; inspect agent_runs.stdout/stderr in SQLite.`;
    throw new Error(`All enrichment runners failed; first failure: ${failedRunSummary(failedRuns[0])}.${rawOutput}`);
  }

  store.saveCandidates(runId, intake.candidates);
  log("saved enriched candidates", {
    runId,
    candidates: intake.candidates.length,
    failedCandidates: failedRuns.length,
    rejectedCandidates: intake.rejectedCount,
    rejected: intake.rejectedCandidates
  });

  return {
    runId,
    rawOutputPath,
    requestedCount: candidatesToEnrich.length,
    normalizedCount: intake.normalizedCount,
    failedCandidates: failedRuns.length,
    rejectedCandidates: intake.rejectedCount,
    skippedCandidates: intake.skippedCandidates.length,
    candidates: intake.candidates
  };
}

async function runPromptAgent(options: EnrichmentOptions, prompt: string): Promise<AgentRunResult> {
  const agent = options.runAgent || runAgent;
  return agent({
    runner: options.runner,
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });
}


function failedRunDetails(run: EnrichmentRun): Record<string, unknown> {
  return {
    id: run.candidate.id,
    title: run.candidate.title,
    exitCode: run.exitCode,
    stderr: compactText(run.stderr)
  };
}

function failedRunSummary(run: EnrichmentRun): string {
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
