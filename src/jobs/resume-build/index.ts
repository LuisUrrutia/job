import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { persistRawRun, runAgent } from "../agent-run.ts";
import { linkedInResumeBuildPrompt, renderResumeBuildPrompt } from "./prompts.ts";
import { candidateSlugFromProfile, generateResumeFromJson, slugify } from "../../resume/generator.ts";
import type { AgentRunResult, ApplicationQuestion, CompanyResearch, JobStore, ResumeBuildOptions, ResumeBuildResult, ResumeGenerator, ResumePackage, StoredJobCandidate } from "../types.ts";

const DEFAULT_PROFILE_PATH = "info.json";

interface ResumeBuildRun extends AgentRunResult {
  candidate: StoredJobCandidate;
  company: CompanyResearch;
  questions: ApplicationQuestion[];
  prompt: string;
}

interface ResumeBuildNormalization {
  packages: PendingResumePackage[];
  rejected: number;
}

interface PendingResumePackage {
  candidateId: string;
  resumeJson: Record<string, unknown>;
}

export async function buildResumes(store: JobStore, options: ResumeBuildOptions): Promise<ResumeBuildResult> {
  const log = options.logger || noop;
  const cwd = options.cwd || process.cwd();
  const profilePath = resolvePath(options.profilePath || DEFAULT_PROFILE_PATH, cwd);
  const outputRoot = resolvePath(options.outputRoot || ".", cwd);
  const profile = JSON.parse(await readFile(profilePath, "utf8"));
  if (!isRecord(profile)) throw new Error(`Expected ${profilePath} to contain a JSON object.`);
  const candidateSlug = candidateSlugFromProfile(profile, profilePath);
  const generateResume = options.generateResume || generateResumeFromJson;
  const candidatesToBuild = store.listCandidatesForResumeBuild(Number(options.limit || 25));
  log("loaded resume build candidates", { candidates: candidatesToBuild.length, mode: "serial" });

  const total = candidatesToBuild.length;
  const runs: ResumeBuildRun[] = [];
  const acceptedPackages: PendingResumePackage[] = [];
  const builtPackages: ResumePackage[] = [];
  let missingCompanyCount = 0;
  let rejectedPackages = 0;
  for (const [index, candidate] of candidatesToBuild.entries()) {
    const company = candidate.companyId ? store.getCompanyResearch(candidate.companyId) : null;
    if (!company) {
      missingCompanyCount += 1;
      log("skipping resume candidate without company research", { id: candidate.id, companyId: candidate.companyId });
      continue;
    }
    const questions = store.listApplicationQuestions(candidate.id);
    const prompt = renderResumeBuildPrompt(linkedInResumeBuildPrompt, profile, candidate, company, questions);
    const progress = { position: index + 1, total, id: candidate.id, title: candidate.title };
    log("starting resume build runner", progress);
    const result = await runPromptAgent(options, prompt);
    log("finished resume build runner", { ...progress, exitCode: result.exitCode });
    const run = { candidate, company, questions, prompt, ...result };
    runs.push(run);
    if (run.exitCode !== 0) continue;

    const pendingPackage = normalizeResumeBuildRun(run);
    if (!pendingPackage) {
      rejectedPackages += 1;
      continue;
    }
    acceptedPackages.push(pendingPackage);
    const built = await writeResumePackages([pendingPackage], { outputRoot, candidateSlug, profilePath, cwd, generateResume });
    builtPackages.push(...built);
  }

  const failedRuns = runs.filter((run) => run.exitCode !== 0);
  const stdout = JSON.stringify({ packages: acceptedPackages.map((pkg) => ({ candidateId: pkg.candidateId, resumeJson: pkg.resumeJson })) });
  const stderr = runs.map((run) => run.stderr).filter(Boolean).join("\n");
  const combinedPrompt = runs.map((run) => `# ${run.candidate.id}\n${run.prompt}`).join("\n\n");
  const exitCode = failedRuns[0]?.exitCode ?? 0;

  const runId = store.saveAgentRun({
    runner: options.runner,
    promptVersion: linkedInResumeBuildPrompt.version,
    prompt: combinedPrompt || linkedInResumeBuildPrompt.template,
    stdout,
    stderr,
    exitCode,
    rawOutputPath: null
  });
  const rawOutputPath = await persistRawRun({ rawDir: options.rawDir, outputPath: options.rawOutputPath }, runId, { stdout, stderr, exitCode });
  if (rawOutputPath) store.saveRunRawOutputPath(runId, rawOutputPath);

  if (failedRuns.length > 0) log("skipped failed resume build runners", failedRuns.map(failedRunDetails));
  if (failedRuns.length > 0 && acceptedPackages.length === 0) {
    const rawOutput = rawOutputPath ? ` Raw output: ${rawOutputPath}` : ` Run ${runId}; inspect agent_runs.stdout/stderr in SQLite.`;
    throw new Error(`All resume build runners failed; first failure: ${failedRunSummary(failedRuns[0])}.${rawOutput}`);
  }

  store.saveResumePackages(runId, builtPackages);
  log("saved resume packages", {
    runId,
    packages: builtPackages.length,
    failedCandidates: failedRuns.length,
    rejectedPackages,
    missingCompanies: missingCompanyCount
  });

  return {
    runId,
    rawOutputPath,
    requestedCount: candidatesToBuild.length,
    builtCount: builtPackages.length,
    failedCandidates: failedRuns.length,
    rejectedPackages: rejectedPackages + missingCompanyCount,
    packages: builtPackages
  };
}

async function runPromptAgent(options: ResumeBuildOptions, prompt: string): Promise<AgentRunResult> {
  const agent = options.runAgent || runAgent;
  return agent({
    runner: options.runner,
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });
}

function normalizeResumeBuildRun(run: ResumeBuildRun): PendingResumePackage | null {
  if (run.exitCode !== 0) return null;
  const parsed = parseJson(run.stdout);
  const resumeJson = resumeSourceObject(parsed);
  if (resumeJson && isResumeSourceJson(resumeJson)) {
    return { candidateId: run.candidate.id, resumeJson };
  }
  return null;
}

async function writeResumePackages(
  packages: PendingResumePackage[],
  options: { outputRoot: string; candidateSlug: string; profilePath: string; cwd: string; generateResume: ResumeGenerator }
): Promise<ResumePackage[]> {
  const built: ResumePackage[] = [];
  for (const pending of packages) {
    const targetCompany = text(pending.resumeJson.targetCompany) || "company";
    const companySlug = slugify(targetCompany);
    const jobSlug = slugify(text(pending.resumeJson.jobSlug) || `${companySlug}-${text(pending.resumeJson.targetPosition) || "role"}`);
    const resumePdfPath = join(options.outputRoot, "applications", `${options.candidateSlug}-${jobSlug}-Resume.pdf`);
    await mkdir(dirname(resumePdfPath), { recursive: true });

    const tempDir = await mkdtemp(join(tmpdir(), "jobs-resume-build-"));
    try {
      const tempJsonPath = join(tempDir, `${jobSlug}.json`);
      const tempTexPath = join(tempDir, `${jobSlug}.tex`);
      await writeFile(tempJsonPath, `${JSON.stringify(pending.resumeJson, null, 2)}\n`, "utf8");
      await options.generateResume({
        input: tempJsonPath,
        output: resumePdfPath,
        outputTex: tempTexPath,
        profilePath: options.profilePath,
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }

    built.push({
      candidateId: pending.candidateId,
      resumePdfPath: displayPath(resumePdfPath, options.cwd)
    });
  }
  return built;
}

function resumeSourceObject(parsed: unknown): Record<string, unknown> | null {
  if (!isRecord(parsed)) return null;
  if (isRecord(parsed.resumeJson)) return parsed.resumeJson;
  if (isRecord(parsed.resumeSource)) return parsed.resumeSource;
  if (isRecord(parsed.resume)) return parsed.resume;
  return parsed;
}

function isResumeSourceJson(value: Record<string, unknown>): boolean {
  return isRecord(value.personalInfo) && Array.isArray(value.workExperience) && text(value.targetCompany) !== "";
}

function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    const match = stdout.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function failedRunDetails(run: ResumeBuildRun): Record<string, unknown> {
  return {
    id: run.candidate.id,
    title: run.candidate.title,
    exitCode: run.exitCode,
    stderr: compactText(run.stderr)
  };
}

function failedRunSummary(run: ResumeBuildRun): string {
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

function resolvePath(rawPath: string, cwd: string): string {
  if (rawPath.startsWith("~")) {
    const home = process.env.HOME;
    if (!home) throw new Error("Cannot resolve ~ because HOME is not set.");
    return resolve(home, rawPath.slice(2));
  }
  return isAbsolute(rawPath) ? resolve(rawPath) : resolve(cwd, rawPath);
}

function displayPath(path: string, cwd: string): string {
  const rel = relative(cwd, path);
  return rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : path;
}


function text(value: unknown): string {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function noop(): void {}
