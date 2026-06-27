import { DEFAULT_DISCOVERY_TERMS, loadDiscoveryPrompt, renderDiscoveryPrompt } from "./prompts.ts";
import { intakePreparedJobCandidates, prepareJobCandidateIntake } from "../candidate-intake.ts";
import { persistRawRun, runAgent } from "../agent-run.ts";
import type { AgentRunResult, DiscoveryOptions, DiscoveryResult, JobStore, Logger, PromptTemplate } from "../types.ts";

interface SearchRun extends AgentRunResult {
  searchTerm: string;
  prompt: string;
}

interface CombinedRun {
  runs: SearchRun[];
  prompt: string;
  stderr: string;
  exitCode: number;
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
  const intakePlan = prepareJobCandidateIntake(result.runs);
  const persistedRun = { stdout: intakePlan.stdout, stderr: result.stderr, exitCode: result.exitCode };
  log("discovery runner finished", {
    exitCode: persistedRun.exitCode,
    stdoutCharacters: persistedRun.stdout.length,
    stderrCharacters: persistedRun.stderr.length
  });

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: prompt.version,
    prompt: result.prompt,
    stdout: persistedRun.stdout,
    stderr: persistedRun.stderr,
    exitCode: persistedRun.exitCode,
    rawOutputPath: null
  });
  const rawOutputPath = await persistRawRun({ rawDir: options.rawDir, outputPath: options.rawOutputPath }, runId, persistedRun);
  if (rawOutputPath) store.saveRunRawOutputPath(runId, rawOutputPath);
  log("stored discovery run", { runId, rawOutputPath });

  if (persistedRun.exitCode !== 0) {
    const rawOutput = rawOutputPath ? ` Raw output: ${rawOutputPath}` : " Raw output file was not requested; inspect agent_runs.stdout/stderr in SQLite.";
    throw new Error(`Discovery Agent run failed with exit code ${persistedRun.exitCode}.${rawOutput}`);
  }

  const intake = await intakePreparedJobCandidates(intakePlan, { defend: false, logger: log });
  log("accepted discovery candidates", {
    normalizedCandidates: intake.normalizedCount,
    dedupedCandidates: intake.dedupedCount,
    rejectedCandidates: intake.rejectedCount,
    rejected: intake.rejectedCandidates,
    skippedCandidates: intake.skippedCandidates.length,
    skippedIds: intake.skippedCandidates.map((candidate) => candidate.id),
    ids: intake.candidates.map((candidate) => candidate.id)
  });

  store.saveCandidates(runId, intake.candidates);
  log("saved discovery candidates", { runId, candidates: intake.candidates.length });

  return {
    runId,
    rawOutputPath,
    normalizedCount: intake.normalizedCount,
    dedupedCount: intake.dedupedCount,
    rejectedCandidates: intake.rejectedCount,
    skippedCandidates: intake.skippedCandidates.length,
    candidates: intake.candidates
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
    const result = await runPromptAgent(options, renderedPrompt);
    return {
      runs: [{ searchTerm: "", prompt: renderedPrompt, ...result }],
      prompt: renderedPrompt,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  }

  const runs: SearchRun[] = [];
  for (const searchTerm of searchTerms) {
    const renderedPrompt = renderDiscoveryPrompt(prompt, searchTerm);
    log("starting discovery search term", { searchTerm });
    const result = await runPromptAgent(options, renderedPrompt);
    log("finished discovery search term", { searchTerm, exitCode: result.exitCode });
    runs.push({ searchTerm, prompt: renderedPrompt, ...result });
  }

  const failed = runs.find((run) => run.exitCode !== 0);
  const stderr = runs.map((run) => run.stderr).filter(Boolean).join("\n");
  const combinedPrompt = runs.map((run) => `# ${run.searchTerm}\n${run.prompt}`).join("\n\n");

  return {
    runs,
    stderr,
    exitCode: failed ? failed.exitCode : 0,
    prompt: combinedPrompt
  };
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
