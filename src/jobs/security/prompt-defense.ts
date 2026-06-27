import { createPromptDefense } from "@stackone/defender";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import type { Readable } from "node:stream";
import { contentHash, stableJobId } from "../domain.ts";
import type { JobCandidate, Logger } from "../types.ts";

const DEFAULT_TOOL_NAME = "linkedin_job_discovery";
const CHILD_RESULT_MARKER = "__JOBS_DEFENDER_RESULT__";

interface DefenseResult {
  allowed: boolean;
  riskLevel: string;
  detections?: string[];
  fieldsSanitized?: string[];
  sanitized?: unknown;
}

interface DiscoveryDefense {
  defendToolResult(value: Record<string, string>, toolName: string): Promise<DefenseResult>;
}

interface DefenseOptions {
  toolName?: string;
  logger?: Logger;
  defense?: DiscoveryDefense;
}

interface SkippedCandidate {
  id: string;
  title: string;
  company: string;
  sourceJobId: string;
  riskLevel: string;
  detections: string[];
  fieldsSanitized: string[];
}

interface DefenseApplicationResult {
  candidates: JobCandidate[];
  skipped: SkippedCandidate[];
}

export class PromptInjectionBlockedError extends Error {
  candidateId: string;
  riskLevel: string;
  detections: string[];
  fieldsSanitized: string[];

  constructor(candidate: JobCandidate, result: DefenseResult) {
    const detections = result.detections?.length ? ` detections=${result.detections.join(",")}` : "";
    super(`Prompt injection blocked for ${candidate.id}: risk=${result.riskLevel}${detections}`);
    this.name = "PromptInjectionBlockedError";
    this.candidateId = candidate.id;
    this.riskLevel = result.riskLevel;
    this.detections = result.detections || [];
    this.fieldsSanitized = result.fieldsSanitized || [];
  }
}

export async function defendDiscoveryCandidates(candidates: JobCandidate[], options: DefenseOptions = {}): Promise<DefenseApplicationResult> {
  const toolName = options.toolName || DEFAULT_TOOL_NAME;
  const log = options.logger || noop;

  if (!options.defense && tier2Enabled()) {
    const results = await defendWithIsolatedTier2(candidates, toolName, log);
    return applyDefenseResults(candidates, results, log);
  }

  const defense = options.defense || createDiscoveryDefense({ enableTier2: false });
  const results = [];

  for (const candidate of candidates) {
    log("checking candidate with Defender", candidateSummary(candidate));
    results.push(await defense.defendToolResult(defenderValue(candidate), toolName));
  }

  return applyDefenseResults(candidates, results, log);
}

async function defendWithIsolatedTier2(candidates: JobCandidate[], toolName: string, log: Logger): Promise<DefenseResult[]> {
  log("starting isolated Defender Tier 2 subprocess", {
    runtime: "node",
    candidates: candidates.length,
    toolName
  });

  const child = spawn("node", ["--input-type=module", "--eval", isolatedDefenderScript()], {
    stdio: ["pipe", "pipe", "pipe"]
  });

  child.stdin.end(JSON.stringify({
    toolName,
    items: candidates.map((candidate) => ({ value: defenderValue(candidate) }))
  }));

  const [stdout, stderr, exitCode] = await Promise.all([
    streamToText(child.stdout),
    streamToText(child.stderr),
    waitForExit(child)
  ]);

  log("isolated Defender Tier 2 subprocess finished", {
    exitCode,
    stdoutCharacters: stdout.length,
    stderrCharacters: stderr.length,
    stderrPreview: preview(stderr)
  });

  return parseIsolatedDefenseResults(stdout, stderr, exitCode);
}

function applyDefenseResults(candidates: JobCandidate[], results: DefenseResult[], log: Logger): DefenseApplicationResult {
  if (results.length !== candidates.length) {
    throw new Error(`Defender returned ${results.length} results for ${candidates.length} candidates`);
  }

  const defended: JobCandidate[] = [];
  const skipped: SkippedCandidate[] = [];

  for (const [index, candidate] of candidates.entries()) {
    const result = results[index];
    log("Defender result", defenderResultSummary(candidate, result));
    if (!result.allowed) {
      const skippedCandidate = skippedCandidateSummary(candidate, result);
      log("skipping prompt-injected candidate", skippedCandidate);
      skipped.push(skippedCandidate);
      continue;
    }
    defended.push(applySanitizedValue(candidate, result.sanitized));
  }

  return { candidates: defended, skipped };
}

function createDiscoveryDefense(options: { enableTier2?: boolean } = {}): DiscoveryDefense {
  return createPromptDefense({
    blockHighRisk: true,
    enableTier2: options.enableTier2 ?? tier2Enabled()
  });
}

function tier2Enabled(): boolean {
  return process.env.JOBS_DEFENDER_TIER2 !== "0";
}

function parseIsolatedDefenseResults(stdout: string, stderr: string, exitCode: number): DefenseResult[] {
  const markerIndex = stdout.lastIndexOf(CHILD_RESULT_MARKER);
  if (markerIndex === -1) {
    throw new Error(`Defender Tier 2 subprocess failed with exit ${exitCode}: ${preview(stderr || stdout, 800)}`);
  }

  const payload = stdout.slice(markerIndex + CHILD_RESULT_MARKER.length).trim().split(/\r?\n/, 1)[0];
  try {
    return JSON.parse(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Defender Tier 2 subprocess returned invalid JSON: ${message}`);
  }
}

function isolatedDefenderScript(): string {
  return `
import { createPromptDefense } from "@stackone/defender";

const input = await new Promise((resolve, reject) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => resolve(data));
  process.stdin.on("error", reject);
});

const payload = JSON.parse(input);
const defense = createPromptDefense({ blockHighRisk: true, enableTier2: true });
const results = await defense.defendToolResults(
  payload.items.map((item) => ({ value: item.value, toolName: payload.toolName }))
);

process.stdout.write("\\n${CHILD_RESULT_MARKER}" + JSON.stringify(results) + "\\n");
`;
}

function defenderValue(candidate: JobCandidate): Record<string, string> {
  return {
    title: candidate.title,
    description: candidate.description,
    notes: candidate.verificationNote,
    content: candidate.rawJson
  };
}

function applySanitizedValue(candidate: JobCandidate, sanitized: unknown): JobCandidate {
  if (!isRecord(sanitized)) return candidate;

  const next = {
    ...candidate,
    title: stringOr(candidate.title, sanitized.title),
    description: stringOr(candidate.description, sanitized.description),
    verificationNote: stringOr(candidate.verificationNote, sanitized.notes)
  };

  next.id = stableJobId(next);
  next.contentHash = contentHash(next);
  next.rawJson = JSON.stringify({
    title: next.title,
    company: next.company,
    companyWebsite: next.companyWebsite,
    publisherCompany: next.publisherCompany,
    url: next.url,
    source: next.source,
    sourceJobId: next.sourceJobId,
    location: next.location,
    remoteScope: next.remoteScope,
    employmentType: next.employmentType,
    salaryRange: next.salaryRange,
    postedAt: next.postedAt,
    description: next.description,
    verificationNote: next.verificationNote
  });

  return next;
}

function stringOr(fallback: string, value: unknown): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function candidateSummary(candidate: JobCandidate): Record<string, string> {
  return {
    id: candidate.id,
    title: candidate.title,
    company: candidate.company,
    url: candidate.url,
    descriptionPreview: preview(candidate.description),
    verificationNotePreview: preview(candidate.verificationNote)
  };
}

function defenderResultSummary(candidate: JobCandidate, result: DefenseResult): Record<string, unknown> {
  return {
    id: candidate.id,
    allowed: result.allowed,
    riskLevel: result.riskLevel,
    detections: result.detections || [],
    fieldsSanitized: result.fieldsSanitized || []
  };
}

function skippedCandidateSummary(candidate: JobCandidate, result: DefenseResult): SkippedCandidate {
  return {
    id: candidate.id,
    title: candidate.title,
    company: candidate.company,
    sourceJobId: candidate.sourceJobId,
    riskLevel: result.riskLevel,
    detections: result.detections || [],
    fieldsSanitized: result.fieldsSanitized || []
  };
}

function preview(value: unknown, length = 240): string {
  if (typeof value !== "string") return "";
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length)}...` : compact;
}

function noop(): void {}

function streamToText(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => { output += chunk; });
    stream.on("error", reject);
    stream.on("end", () => resolve(output));
  });
}

function waitForExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve(code ?? signalToExitCode(signal));
    });
  });
}

function signalToExitCode(signal: NodeJS.Signals | null): number {
  if (!signal) return 1;
  return 128 + (signal === "SIGABRT" ? 6 : 1);
}
