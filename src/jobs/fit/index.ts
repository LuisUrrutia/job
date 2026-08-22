import { readFile } from "node:fs/promises";
import { persistAgentRun, runAgent } from "../agent-run.ts";
import { linkedInFitPrompt, renderFitPrompt } from "./prompts.ts";
import type { AgentRunResult, FitDecision, FitOptions, FitResult, FitRunAnalysis, JobStore, StoredJobCandidate } from "../types.ts";

const DEFAULT_PROFILE_PATH = "info.json";
const FIT_CONCURRENCY = 5;
const FIT_OPENCODE_MODEL = "openai/gpt-5.6-sol";
const FIT_OPENCODE_VARIANT = "medium";

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
  log("loaded fit candidates", { candidates: candidatesToAnalyze.length, mode: "parallel", concurrency: FIT_CONCURRENCY });

  const runs = await runFitAgents(candidatesToAnalyze, profile, options, log);
  let lastRunId = 0;
  let lastRawOutputPath: string | null = null;
  for (const run of runs) {
    const { prompt } = run;
    const normalizedRun = normalizeFitRuns([run]);
    const saved = await persistAgentRun(store, { rawDir: options.rawDir, outputPath: options.rawOutputPath }, {
      runner: options.runner,
      promptVersion: linkedInFitPrompt.version,
      prompt,
      stdout: JSON.stringify({ analyses: normalizedRun.analyses }),
      stderr: run.stderr,
      exitCode: run.exitCode,
      rawOutputPath: null
    });
    lastRunId = saved.runId;
    lastRawOutputPath = saved.rawOutputPath;

    if (normalizedRun.analyses.length > 0) {
      store.saveFitAnalyses(saved.runId, normalizedRun.analyses);
      log("saved fit analyses", {
        runId: saved.runId,
        analyses: normalizedRun.analyses.length,
        rejectedAnalyses: normalizedRun.rejected
      });
    }
  }

  const failedRuns = runs.filter((run) => run.exitCode !== 0);
  const normalized = normalizeFitRuns(runs);

  if (failedRuns.length > 0) log("skipped failed fit runners", failedRuns.map(failedRunDetails));
  if (failedRuns.length > 0 && normalized.analyses.length === 0) {
    const rawOutput = lastRawOutputPath ? ` Raw output: ${lastRawOutputPath}` : ` Run ${lastRunId}; inspect agent_runs.stdout/stderr in SQLite.`;
    throw new Error(`All fit runners failed; first failure: ${failedRunSummary(failedRuns[0])}.${rawOutput}`);
  }

  if (runs.length === 0) {
    const saved = await persistAgentRun(store, { rawDir: options.rawDir, outputPath: options.rawOutputPath }, {
      runner: options.runner,
      promptVersion: linkedInFitPrompt.version,
      prompt: linkedInFitPrompt.template,
      stdout: JSON.stringify({ analyses: [] }),
      stderr: "",
      exitCode: 0,
      rawOutputPath: null
    });
    lastRunId = saved.runId;
    lastRawOutputPath = saved.rawOutputPath;
  }

  return {
    runId: lastRunId,
    rawOutputPath: lastRawOutputPath,
    requestedCount: candidatesToAnalyze.length,
    analyzedCount: normalized.analyses.length,
    failedCandidates: failedRuns.length,
    rejectedAnalyses: normalized.rejected,
    analyses: normalized.analyses
  };
}

async function runFitAgents(
  candidates: StoredJobCandidate[],
  profile: unknown,
  options: FitOptions,
  log: NonNullable<FitOptions["logger"]>
): Promise<FitRun[]> {
  const runs = new Array<FitRun>(candidates.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < candidates.length) {
      const index = nextIndex;
      nextIndex += 1;
      const candidate = candidates[index];
      const prompt = renderFitPrompt(linkedInFitPrompt, profile, candidate);
      const progress = { position: index + 1, total: candidates.length, id: candidate.id, title: candidate.title };
      log("starting fit runner", progress);
      const result = await runPromptAgent(options, prompt);
      runs[index] = { candidate, prompt, ...result };
      log("finished fit runner", { ...progress, exitCode: result.exitCode });
    }
  }

  const workers = Array.from({ length: Math.min(FIT_CONCURRENCY, candidates.length) }, () => worker());
  await Promise.all(workers);
  return runs;
}

async function runPromptAgent(options: FitOptions, prompt: string): Promise<AgentRunResult> {
  const agent = options.runAgent || runAgent;
  const isOpenCode = options.runner === "opencode";
  return agent({
    runner: options.runner,
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig,
    model: isOpenCode ? FIT_OPENCODE_MODEL : undefined,
    variant: isOpenCode ? FIT_OPENCODE_VARIANT : undefined
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
  const reportedDecision = fitDecision(raw.decision);
  const reportedScore = fitScore(raw.score);
  const summary = text(raw.summary);
  if (!id || !reportedDecision || reportedScore === null || !summary) return null;

  const missingCoreRequirements = stringList(raw.missingCoreRequirements);
  const hasMissingCoreRequirements = missingCoreRequirements.length > 0;
  const coreRequirementRisk = hasMissingCoreRequirements
    ? `Requisitos centrales sin evidencia suficiente: ${missingCoreRequirements.join(", ")}.`
    : "";
  const risks = stringList(raw.risks);
  if (coreRequirementRisk && !risks.includes(coreRequirementRisk)) risks.unshift(coreRequirementRisk);

  return {
    id,
    decision: hasMissingCoreRequirements ? "dont_apply" : reportedDecision,
    score: hasMissingCoreRequirements ? Math.min(reportedScore, 49) : reportedScore,
    summary: hasMissingCoreRequirements
      ? `No aplicar: faltan requisitos centrales (${missingCoreRequirements.join(", ")}). ${summary}`
      : summary,
    missingCoreRequirements,
    risks,
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
