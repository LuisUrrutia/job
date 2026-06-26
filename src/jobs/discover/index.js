import { loadDiscoveryPrompt } from "./prompts.js";
import { normalizeDiscoveryOutput } from "./normalizer.js";
import { persistRawRun, runDiscoveryAgent } from "./runners.js";

export async function discoverJobs(store, options) {
  const prompt = await loadDiscoveryPrompt(options.promptFile);
  const result = await runDiscoveryAgent({
    runner: options.runner,
    fixture: options.fixture,
    prompt: prompt.template,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: prompt.version,
    prompt: prompt.template,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    rawOutputPath: ""
  });
  const rawOutputPath = await persistRawRun(options.rawDir, runId, result);
  store.saveRunRawOutputPath(runId, rawOutputPath);

  if (result.exitCode !== 0) {
    throw new Error(`Discovery runner failed with exit code ${result.exitCode}. Raw output: ${rawOutputPath}`);
  }

  const candidates = normalizeDiscoveryOutput(result.stdout);
  store.saveCandidates(runId, candidates);

  return { runId, rawOutputPath, candidates };
}
