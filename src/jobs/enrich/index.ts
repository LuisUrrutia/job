import { normalizeDiscoveryOutput } from "../discover/normalizer.ts";
import { persistRawRun, runDiscoveryAgent } from "../discover/runners.ts";
import { defendDiscoveryCandidates } from "../security/prompt-defense.ts";
import { linkedInEnrichmentPrompt, renderEnrichmentPrompt } from "./prompts.ts";
import type { AgentRunResult, EnrichmentOptions, EnrichmentResult, JobCandidate, JobStore, StoredJobCandidate } from "../types.ts";

const DEFAULT_CONCURRENCY = 4;

interface EnrichmentRun extends AgentRunResult {
  candidate: StoredJobCandidate;
  prompt: string;
}

export async function enrichJobs(store: JobStore, options: EnrichmentOptions): Promise<EnrichmentResult> {
  const log = options.logger || noop;
  const candidatesToEnrich = store.listCandidatesForEnrichment(Number(options.limit || 25));
  const concurrency = Math.max(1, Number(options.concurrency || DEFAULT_CONCURRENCY));
  log("loaded enrichment candidates", {
    candidates: candidatesToEnrich.length,
    concurrency
  });

  const runs = await mapLimited(candidatesToEnrich, concurrency, async (candidate) => {
    const prompt = renderEnrichmentPrompt(linkedInEnrichmentPrompt, candidate);
    log("starting enrichment runner", { id: candidate.id, title: candidate.title });
    const result = await runAgent(options, prompt);
    log("finished enrichment runner", { id: candidate.id, exitCode: result.exitCode });
    return { candidate, prompt, ...result };
  });

  const failed = runs.find((run) => run.exitCode !== 0);
  const stdout = JSON.stringify({
    candidates: runs.flatMap((run) => normalizeEnrichmentRunOutput(run))
  });
  const stderr = runs.map((run) => run.stderr).filter(Boolean).join("\n");
  const combinedPrompt = runs.map((run) => `# ${run.candidate.id}\n${run.prompt}`).join("\n\n");

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: linkedInEnrichmentPrompt.version,
    prompt: combinedPrompt || linkedInEnrichmentPrompt.template,
    stdout,
    stderr,
    exitCode: failed ? failed.exitCode : 0,
    rawOutputPath: null
  });
  const rawOutputPath = await persistRawRun({ rawDir: options.rawDir, outputPath: options.rawOutputPath }, runId, { stdout, stderr, exitCode: failed ? failed.exitCode : 0 });
  if (rawOutputPath) store.saveRunRawOutputPath(runId, rawOutputPath);

  if (failed) {
    const rawOutput = rawOutputPath ? ` Raw output: ${rawOutputPath}` : " Raw output file was not requested; inspect agent_runs.stdout/stderr in SQLite.";
    throw new Error(`Enrichment runner failed with exit code ${failed.exitCode}.${rawOutput}`);
  }

  const normalizedCandidates = dedupeCandidates(normalizeDiscoveryOutput(stdout));
  const defenseResult = await defendDiscoveryCandidates(normalizedCandidates, { logger: log });
  const candidates = defenseResult.candidates;
  store.saveCandidates(runId, candidates);
  log("saved enriched candidates", { runId, candidates: candidates.length });

  return {
    runId,
    rawOutputPath,
    requestedCount: candidatesToEnrich.length,
    normalizedCount: normalizedCandidates.length,
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

function normalizeEnrichmentRunOutput(run: EnrichmentRun): JobCandidate[] {
  if (run.exitCode !== 0) return [];
  return JSON.parse(JSON.stringify(normalizeDiscoveryOutput(run.stdout)));
}

async function mapLimited<TItem, TResult>(items: TItem[], limit: number, mapper: (item: TItem) => Promise<TResult>): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function dedupeCandidates(candidates: JobCandidate[]): JobCandidate[] {
  const byId = new Map<string, JobCandidate>();
  for (const candidate of candidates) byId.set(candidate.id, candidate);
  return [...byId.values()];
}

function noop(): void {}
