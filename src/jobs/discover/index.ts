import { DEFAULT_DISCOVERY_TERMS, loadDiscoveryPrompt, renderDiscoveryPrompt } from "./prompts.ts";
import { normalizeDiscoveryOutput } from "./normalizer.ts";
import { persistRawRun, runDiscoveryAgent } from "./runners.ts";
import { defendDiscoveryCandidates } from "../security/prompt-defense.ts";
import type { AgentRunResult, DiscoveryOptions, DiscoveryResult, JobCandidate, JobStore, Logger, PromptTemplate } from "../types.ts";

interface SearchRun extends AgentRunResult {
  searchTerm: string;
  prompt: string;
}

interface CombinedRun extends AgentRunResult {
  prompt: string;
  failedSearchTerms: string[];
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
  const result = await runDiscoverySearches({ options, prompt, searchTerms, log });
  log("discovery runner finished", {
    exitCode: result.exitCode,
    stdoutCharacters: result.stdout.length,
    stderrCharacters: result.stderr.length
  });

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: prompt.version,
    prompt: result.prompt,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    rawOutputPath: null
  });
  const rawOutputPath = await persistRawRun({ rawDir: options.rawDir, outputPath: options.rawOutputPath }, runId, result);
  if (rawOutputPath) store.saveRunRawOutputPath(runId, rawOutputPath);
  log("stored discovery run", { runId, rawOutputPath });

  if (result.exitCode !== 0) {
    const rawOutput = rawOutputPath ? ` Raw output: ${rawOutputPath}` : " Raw output file was not requested; inspect agent_runs.stdout/stderr in SQLite.";
    const failedTerms = result.failedSearchTerms.length > 0 ? ` Failed search terms: ${result.failedSearchTerms.join(", ")}.` : "";
    throw new Error(`Discovery runner failed with exit code ${result.exitCode}.${failedTerms}${rawOutput}`);
  }

  const normalizedCandidates = normalizeDiscoveryOutput(result.stdout);
  const dedupedCandidates = dedupeCandidates(normalizedCandidates);
  log("normalized discovery output", {
    candidates: normalizedCandidates.length,
    dedupedCandidates: dedupedCandidates.length,
    ids: dedupedCandidates.map((candidate) => candidate.id)
  });

  const defenseResult = await defendDiscoveryCandidates(dedupedCandidates, { logger: log });
  const candidates = defenseResult.candidates;
  log("prompt defense accepted candidates", {
    candidates: candidates.length,
    skipped: defenseResult.skipped.length,
    skippedIds: defenseResult.skipped.map((candidate) => candidate.id),
    ids: candidates.map((candidate) => candidate.id)
  });
  store.saveCandidates(runId, candidates);
  log("saved discovery candidates", { runId, candidates: candidates.length });

  return {
    runId,
    rawOutputPath,
    normalizedCount: normalizedCandidates.length,
    dedupedCount: dedupedCandidates.length,
    skippedCandidates: defenseResult.skipped.length,
    candidates
  };
}

async function runDiscoverySearches({
  options,
  prompt,
  searchTerms,
  log
}: {
  options: DiscoveryOptions;
  prompt: PromptTemplate;
  searchTerms: string[];
  log: Logger;
}): Promise<CombinedRun> {
  if (searchTerms.length === 0) {
    const renderedPrompt = renderDiscoveryPrompt(prompt, "");
    const result = await runAgent(options, renderedPrompt);
    return { ...result, prompt: renderedPrompt, failedSearchTerms: [] };
  }

  const runs = await Promise.all(searchTerms.map(async (searchTerm) => {
    const renderedPrompt = renderDiscoveryPrompt(prompt, searchTerm);
    log("starting discovery search term", { searchTerm });
    const result = await runAgent(options, renderedPrompt);
    log("finished discovery search term", { searchTerm, exitCode: result.exitCode });
    return { searchTerm, prompt: renderedPrompt, ...result };
  }));

  return aggregateSearchRuns(runs);
}

function aggregateSearchRuns(runs: SearchRun[]): CombinedRun {
  const failedRuns = runs.filter((run) => run.exitCode !== 0);
  const failed = failedRuns[0];

  return {
    stdout: discoveryRunLedgerStdout(runs),
    stderr: discoveryRunLedgerStderr(runs),
    exitCode: failed ? failed.exitCode : 0,
    prompt: discoveryRunLedgerPrompt(runs),
    failedSearchTerms: failedRuns.map((run) => run.searchTerm)
  };
}

async function runAgent(options: DiscoveryOptions, prompt: string): Promise<AgentRunResult> {
  const agent = options.runAgent || runDiscoveryAgent;
  return agent({
    runner: options.runner,
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });
}

function normalizeSearchRunOutput(run: SearchRun): JobCandidate[] {
  if (run.exitCode !== 0) return [];
  return JSON.parse(JSON.stringify(normalizeDiscoveryOutput(run.stdout)));
}

function discoveryRunLedgerStdout(runs: SearchRun[]): string {
  return JSON.stringify({
    candidates: runs.flatMap((run) => normalizeSearchRunOutput(run)),
    searchRuns: runs.map((run) => ({
      searchTerm: run.searchTerm,
      exitCode: run.exitCode,
      stdout: run.stdout
    }))
  });
}

function discoveryRunLedgerPrompt(runs: SearchRun[]): string {
  return runs.map((run) => [
    `# ${run.searchTerm}`,
    `Exit code: ${run.exitCode}`,
    run.prompt
  ].join("\n")).join("\n\n");
}

function discoveryRunLedgerStderr(runs: SearchRun[]): string {
  return runs
    .filter((run) => run.stderr || run.exitCode !== 0)
    .map((run) => [
      `# ${run.searchTerm}`,
      `Exit code: ${run.exitCode}`,
      run.stderr.trim()
    ].filter(Boolean).join("\n"))
    .join("\n\n");
}

function discoverySearchTerms(options: DiscoveryOptions): string[] {
  if (options.searchTerms) return options.searchTerms;
  if ((options.runner || "fixture") === "fixture") return [];
  return DEFAULT_DISCOVERY_TERMS;
}

function dedupeCandidates(candidates: JobCandidate[]): JobCandidate[] {
  const byId = new Map<string, JobCandidate>();
  for (const candidate of candidates) byId.set(candidate.id, candidate);
  return [...byId.values()];
}

function noop(): void {}
