import { persistRawRun, runAgent } from "../agent-run.ts";
import { linkedInApplicationResearchPrompt, renderApplicationResearchPrompt } from "./prompts.ts";
import type { AgentRunResult, ApplicationQuestion, ApplicationResearch, ApplicationResearchOptions, ApplicationResearchResult, CompanyResearch, JobStore, StoredJobCandidate } from "../types.ts";

interface ApplicationResearchRun extends AgentRunResult {
  candidate: StoredJobCandidate;
  prompt: string;
}

interface ApplicationResearchNormalization {
  researches: ApplicationResearch[];
  rejected: number;
}

export async function researchApplications(store: JobStore, options: ApplicationResearchOptions): Promise<ApplicationResearchResult> {
  const log = options.logger || noop;
  const candidatesToResearch = store.listCandidatesForApplicationResearch(Number(options.limit || 25));
  log("loaded application research candidates", { candidates: candidatesToResearch.length, mode: "serial" });

  const total = candidatesToResearch.length;
  const runs: ApplicationResearchRun[] = [];
  for (const [index, candidate] of candidatesToResearch.entries()) {
    const prompt = renderApplicationResearchPrompt(linkedInApplicationResearchPrompt, candidate);
    const progress = { position: index + 1, total, id: candidate.id, title: candidate.title };
    log("starting application research runner", progress);
    const result = await runPromptAgent(options, prompt);
    log("finished application research runner", { ...progress, exitCode: result.exitCode });
    runs.push({ candidate, prompt, ...result });
  }

  const failedRuns = runs.filter((run) => run.exitCode !== 0);
  const normalized = normalizeApplicationResearchRuns(runs);
  const stdout = JSON.stringify({ researches: normalized.researches });
  const stderr = runs.map((run) => run.stderr).filter(Boolean).join("\n");
  const combinedPrompt = runs.map((run) => `# ${run.candidate.id}\n${run.prompt}`).join("\n\n");
  const exitCode = failedRuns[0]?.exitCode ?? 0;

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: linkedInApplicationResearchPrompt.version,
    prompt: combinedPrompt || linkedInApplicationResearchPrompt.template,
    stdout,
    stderr,
    exitCode,
    rawOutputPath: null
  });
  const rawOutputPath = await persistRawRun({ rawDir: options.rawDir, outputPath: options.rawOutputPath }, runId, { stdout, stderr, exitCode });
  if (rawOutputPath) store.saveRunRawOutputPath(runId, rawOutputPath);

  if (failedRuns.length > 0) log("skipped failed application research runners", failedRuns.map(failedRunDetails));
  if (failedRuns.length > 0 && normalized.researches.length === 0) {
    const rawOutput = rawOutputPath ? ` Raw output: ${rawOutputPath}` : ` Run ${runId}; inspect agent_runs.stdout/stderr in SQLite.`;
    throw new Error(`All application research runners failed; first failure: ${failedRunSummary(failedRuns[0])}.${rawOutput}`);
  }

  store.saveApplicationResearch(runId, normalized.researches);
  log("saved application research", {
    runId,
    researches: normalized.researches.length,
    failedCandidates: failedRuns.length,
    rejectedResearches: normalized.rejected
  });

  return {
    runId,
    rawOutputPath,
    requestedCount: candidatesToResearch.length,
    researchedCount: normalized.researches.length,
    failedCandidates: failedRuns.length,
    rejectedResearches: normalized.rejected,
    researches: normalized.researches
  };
}

async function runPromptAgent(options: ApplicationResearchOptions, prompt: string): Promise<AgentRunResult> {
  const agent = options.runAgent || runAgent;
  return agent({
    runner: options.runner,
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });
}

function normalizeApplicationResearchRuns(runs: ApplicationResearchRun[]): ApplicationResearchNormalization {
  const researches: ApplicationResearch[] = [];
  let rejected = 0;

  for (const run of runs) {
    if (run.exitCode !== 0) continue;
    const parsed = parseJson(run.stdout);
    const rawResearches = rawApplicationResearches(parsed);
    for (const rawResearch of rawResearches) {
      const research = normalizeApplicationResearch(rawResearch, run.candidate.id);
      if (research) researches.push(research);
      else rejected += 1;
    }
  }

  return { researches, rejected };
}

function rawApplicationResearches(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return [];
  if (Array.isArray(parsed.researches)) return parsed.researches;
  if (Array.isArray(parsed.applicationResearches)) return parsed.applicationResearches;
  return [parsed];
}

function normalizeApplicationResearch(raw: unknown, fallbackCandidateId: string): ApplicationResearch | null {
  if (!isRecord(raw)) return null;
  const candidateId = text(raw.candidateId) || text(raw.id) || fallbackCandidateId;
  const company = normalizeCompanyResearch(raw.company, candidateId);
  const applyUrl = text(raw.applyUrl);
  const applyUrlSource = text(raw.applyUrlSource) || applyUrl;
  if (!candidateId || !company || !applyUrl) return null;

  return {
    candidateId,
    company,
    applyUrl,
    applyUrlSource,
    questions: normalizeApplicationQuestions(raw.questions, candidateId)
  };
}

function normalizeCompanyResearch(raw: unknown, fallbackId: string): CompanyResearch | null {
  if (!isRecord(raw)) return null;
  const name = text(raw.name);
  const canonicalWebsite = text(raw.canonicalWebsite);
  const id = text(raw.id) || companyId(name, canonicalWebsite || fallbackId);
  const sourceNotes = text(raw.sourceNotes);
  const sourceUrls = stringList(raw.sourceUrls);
  if (!id || !name || !canonicalWebsite || !sourceNotes || sourceUrls.length === 0) return null;

  return {
    id,
    name,
    canonicalWebsite,
    linkedinCompanyId: text(raw.linkedinCompanyId),
    linkedinUrl: text(raw.linkedinUrl),
    description: text(raw.description),
    mission: text(raw.mission),
    vision: text(raw.vision),
    productsServices: stringList(raw.productsServices),
    businessModel: text(raw.businessModel),
    markets: stringList(raw.markets),
    sourceNotes,
    sourceUrls
  };
}

function normalizeApplicationQuestions(raw: unknown, candidateId: string): ApplicationQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: ApplicationQuestion[] = [];
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item)) continue;
    const question = text(item.question);
    const answerSuggestion = text(item.answerSuggestion);
    if (!question || !answerSuggestion) continue;
    const rawId = text(item.id) || `q${index + 1}`;
    questions.push({
      id: `${candidateId}:${rawId}`,
      candidateId,
      question,
      questionType: text(item.questionType) || "unknown",
      required: Boolean(item.required),
      answerSuggestion,
      answerLanguage: text(item.answerLanguage) || "en",
      evidence: stringList(item.evidence),
      riskNotes: stringList(item.riskNotes),
      sourceUrl: text(item.sourceUrl)
    });
  }
  return questions;
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

function companyId(name: string, fallback: string): string {
  const source = name || fallback;
  return source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function failedRunDetails(run: ApplicationResearchRun): Record<string, unknown> {
  return {
    id: run.candidate.id,
    title: run.candidate.title,
    exitCode: run.exitCode,
    stderr: compactText(run.stderr)
  };
}

function failedRunSummary(run: ApplicationResearchRun): string {
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
