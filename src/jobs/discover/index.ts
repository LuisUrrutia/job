import { DEFAULT_DISCOVERY_TERMS, loadDiscoveryPrompt, renderDiscoveryPrompt } from "./prompts.ts";
import { intakePreparedJobCandidates, prepareJobCandidateIntake } from "../candidate-intake.ts";
import { persistAgentRun, runAgent } from "../agent-run.ts";
import type { AgentRunResult, DiscoveryOptions, DiscoveryResult, JobStore, Logger, PromptTemplate } from "../types.ts";

interface SearchRun extends AgentRunResult {
  searchTerm: string;
  prompt: string;
}


export async function discoverJobs(store: JobStore, options: DiscoveryOptions): Promise<DiscoveryResult> {
  const log = options.logger || noop;
  const prompt = await loadDiscoveryPrompt(options.promptFile);
  const searchTerms = discoverySearchTerms(options);
  log("loaded discovery prompt", {
    name: prompt.name,
    version: prompt.version,
    promptFile: options.promptFile || null,
    promptCharacters: prompt.template.length,
    searchTerms
  });
  log("discovery prompt", prompt.template);

  log("starting discovery runner", {
    runner: options.runner,
    cwd: options.cwd,
    fixture: options.fixture || null,
    mcpConfig: options.mcpConfig || null,
    searchTerms
  });
  const result = await runDiscoverySearches({ store, options, prompt, searchTerms, log });
  const intakePlan = prepareJobCandidateIntake(result.runs);
  const aggregate = await intakePreparedJobCandidates(intakePlan, { defend: false, logger: log });
  const failed = result.runs.find((run) => run.exitCode !== 0);
  if (failed && aggregate.candidates.length === 0) {
    const rawOutput = result.rawOutputPath
      ? ` Raw output: ${result.rawOutputPath}`
      : " Raw output file was not requested; inspect agent_runs.stdout/stderr in SQLite.";
    throw new Error(`Discovery Agent run failed with exit code ${failed.exitCode}.${rawOutput}`);
  }

  log("accepted discovery candidates", {
    normalizedCandidates: aggregate.normalizedCount,
    dedupedCandidates: aggregate.dedupedCount,
    rejectedCandidates: aggregate.rejectedCount,
    rejected: aggregate.rejectedCandidates,
    skippedCandidates: aggregate.skippedCandidates.length,
    skippedIds: aggregate.skippedCandidates.map((candidate) => candidate.id),
    ids: aggregate.candidates.map((candidate) => candidate.id)
  });

  return {
    runId: result.runId,
    rawOutputPath: result.rawOutputPath,
    normalizedCount: aggregate.normalizedCount,
    dedupedCount: aggregate.dedupedCount,
    rejectedCandidates: aggregate.rejectedCount,
    skippedCandidates: aggregate.skippedCandidates.length,
    candidates: aggregate.candidates
  };
}

async function runDiscoverySearches({
  store,
  options,
  prompt,
  searchTerms,
  log
}: {
  store: JobStore;
  options: DiscoveryOptions;
  prompt: PromptTemplate;
  searchTerms: string[];
  log: Logger;
}): Promise<{ runs: SearchRun[]; runId: number; rawOutputPath: string | null }> {
  const terms = searchTerms.length === 0 ? [""] : searchTerms;
  const runs: SearchRun[] = [];
  let lastRunId = 0;
  let lastRawOutputPath: string | null = null;

  for (const searchTerm of terms) {
    const renderedPrompt = renderDiscoveryPrompt(prompt, searchTerm);
    log("starting discovery search term", { searchTerm });
    const result = await runPromptAgent(options, renderedPrompt);
    const run: SearchRun = { searchTerm, prompt: renderedPrompt, ...result };
    runs.push(run);

    const intakePlan = prepareJobCandidateIntake(run);
    const persistedRun = { stdout: intakePlan.stdout, stderr: run.stderr, exitCode: run.exitCode };
    const saved = await persistAgentRun(store, { rawDir: options.rawDir, outputPath: options.rawOutputPath }, {
      runner: options.runner,
      promptVersion: prompt.version,
      prompt: renderedPrompt,
      stdout: persistedRun.stdout,
      stderr: persistedRun.stderr,
      exitCode: persistedRun.exitCode,
      rawOutputPath: null
    });
    lastRunId = saved.runId;
    lastRawOutputPath = saved.rawOutputPath;
    log("stored discovery run", { runId: saved.runId, rawOutputPath: saved.rawOutputPath });
    log("finished discovery search term", { searchTerm, exitCode: run.exitCode });

    if (run.exitCode !== 0) continue;

    const intake = await intakePreparedJobCandidates(intakePlan, { defend: false, logger: log });
    store.saveCandidates(saved.runId, intake.candidates);
    log("saved discovery candidates", { runId: saved.runId, candidates: intake.candidates.length });
  }

  return { runs, runId: lastRunId, rawOutputPath: lastRawOutputPath };
}

async function runPromptAgent(options: DiscoveryOptions, prompt: string): Promise<AgentRunResult> {
  const agent = options.runAgent || runAgent;
  return agent({
    runner: options.runner,
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });
}


function discoverySearchTerms(options: DiscoveryOptions): string[] {
  if (options.searchTerms) return options.searchTerms;
  if ((options.runner || "fixture") === "fixture") return [];
  return DEFAULT_DISCOVERY_TERMS;
}

function noop(): void {}
