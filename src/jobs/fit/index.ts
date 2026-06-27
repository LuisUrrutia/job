import { readFile } from "node:fs/promises";
import { persistRawRun, runAgent } from "../agent-run.ts";
import { linkedInFitPrompt, renderFitPrompt } from "./prompts.ts";
import type { AgentRunResult, FitDecision, FitOptions, FitResult, FitRunAnalysis, JobStore, StoredJobCandidate } from "../types.ts";

const DEFAULT_PROFILE_PATH = "info.json";

interface FitRun extends AgentRunResult {
  candidate: StoredJobCandidate;
  prompt: string;
}

interface FitNormalization {
  analyses: FitRunAnalysis[];
  rejected: number;
}

export async function analyzeFit(store: JobStore, options: FitOptions): Promise<FitResult> {
  const log = options.logger || noop;
  const profile = JSON.parse(await readFile(options.profilePath || DEFAULT_PROFILE_PATH, "utf8"));
  const candidatesToAnalyze = store.listCandidatesForFit(Number(options.limit || 25));
  log("loaded fit candidates", { candidates: candidatesToAnalyze.length, mode: "serial" });

  const total = candidatesToAnalyze.length;
  const runs: FitRun[] = [];
  for (const [index, candidate] of candidatesToAnalyze.entries()) {
    const prompt = renderFitPrompt(linkedInFitPrompt, profile, candidate);
    const progress = { position: index + 1, total, id: candidate.id, title: candidate.title };
    log("starting fit runner", progress);
    const result = await runPromptAgent(options, prompt);
    log("finished fit runner", { ...progress, exitCode: result.exitCode });
    runs.push({ candidate, prompt, ...result });
  }

  const failedRuns = runs.filter((run) => run.exitCode !== 0);
  const normalized = normalizeFitRuns(runs);
  const stdout = JSON.stringify({ analyses: normalized.analyses });
  const stderr = runs.map((run) => run.stderr).filter(Boolean).join("\n");
  const combinedPrompt = runs.map((run) => `# ${run.candidate.id}\n${run.prompt}`).join("\n\n");
  const exitCode = failedRuns[0]?.exitCode ?? 0;

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: linkedInFitPrompt.version,
    prompt: combinedPrompt || linkedInFitPrompt.template,
    stdout,
    stderr,
    exitCode,
    rawOutputPath: null
  });
  const rawOutputPath = await persistRawRun({ rawDir: options.rawDir, outputPath: options.rawOutputPath }, runId, { stdout, stderr, exitCode });
  if (rawOutputPath) store.saveRunRawOutputPath(runId, rawOutputPath);

  if (failedRuns.length > 0) log("skipped failed fit runners", failedRuns.map(failedRunDetails));
  if (failedRuns.length > 0 && normalized.analyses.length === 0) {
    const rawOutput = rawOutputPath ? ` Raw output: ${rawOutputPath}` : ` Run ${runId}; inspect agent_runs.stdout/stderr in SQLite.`;
    throw new Error(`All fit runners failed; first failure: ${failedRunSummary(failedRuns[0])}.${rawOutput}`);
  }

  store.saveFitAnalyses(runId, normalized.analyses);
  log("saved fit analyses", {
    runId,
    analyses: normalized.analyses.length,
    failedCandidates: failedRuns.length,
    rejectedAnalyses: normalized.rejected
  });

  return {
    runId,
    rawOutputPath,
    requestedCount: candidatesToAnalyze.length,
    analyzedCount: normalized.analyses.length,
    failedCandidates: failedRuns.length,
    rejectedAnalyses: normalized.rejected,
    analyses: normalized.analyses
  };
}

async function runPromptAgent(options: FitOptions, prompt: string): Promise<AgentRunResult> {
  const agent = options.runAgent || runAgent;
  return agent({
    runner: options.runner,
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });
}

function normalizeFitRuns(runs: FitRun[]): FitNormalization {
  const analyses: FitRunAnalysis[] = [];
  let rejected = 0;

  for (const run of runs) {
    if (run.exitCode !== 0) continue;
    const parsed = parseJson(run.stdout);
    const rawAnalyses = rawFitAnalyses(parsed);
    for (const rawAnalysis of rawAnalyses) {
      const analysis = normalizeFitAnalysis(rawAnalysis, run.candidate.id);
      if (analysis) analyses.push(analysis);
      else rejected += 1;
    }
  }

  return { analyses, rejected };
}

function rawFitAnalyses(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return [];
  if (Array.isArray(parsed.analyses)) return parsed.analyses;
  if (Array.isArray(parsed.fitAnalyses)) return parsed.fitAnalyses;
  return [parsed];
}

function normalizeFitAnalysis(raw: unknown, fallbackId: string): FitRunAnalysis | null {
  if (!isRecord(raw)) return null;
  const id = text(raw.id) || fallbackId;
  const decision = fitDecision(raw.decision);
  const score = fitScore(raw.score);
  const summary = text(raw.summary);
  if (!id || !decision || score === null || !summary) return null;

  return {
    id,
    decision,
    score,
    summary,
    risks: stringList(raw.risks),
    evidence: stringList(raw.evidence)
  };
}

function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    const match = stdout.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
}

function fitDecision(value: unknown): FitDecision | null {
  if (value === "apply" || value === "weak_apply" || value === "dont_apply") return value;
  return null;
}

function fitScore(value: unknown): number | null {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function failedRunDetails(run: FitRun): Record<string, unknown> {
  return {
    id: run.candidate.id,
    title: run.candidate.title,
    exitCode: run.exitCode,
    stderr: compactText(run.stderr)
  };
}

function failedRunSummary(run: FitRun): string {
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

function text(value: unknown): string {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function noop(): void {}
