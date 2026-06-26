import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, parse, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChildProcess } from "node:child_process";
import type { Readable } from "node:stream";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const DEFAULT_PROFILE_PATH = join(REPO_ROOT, "info.json");
export const DEFAULT_TEMPLATE_PATH = join(REPO_ROOT, "latex", "resume.template.tex");
export const RESUME_SUFFIX = "-Resume";

const HEADLINE_TOKEN = "{{RESUME_HEADLINE}}";
const EXPERIENCE_TOKEN = "{{RESUME_EXPERIENCE}}";
const FULL_NAME_TOKEN = "{{RESUME_FULL_NAME}}";
const NAME_FIRST_TOKEN = "{{RESUME_NAME_FIRST}}";
const NAME_LAST_TOKEN = "{{RESUME_NAME_LAST}}";
const EMAIL_HREF_TOKEN = "{{RESUME_EMAIL_HREF}}";
const EMAIL_LABEL_TOKEN = "{{RESUME_EMAIL_LABEL}}";
const PHONE_HREF_TOKEN = "{{RESUME_PHONE_HREF}}";
const PHONE_LABEL_TOKEN = "{{RESUME_PHONE_LABEL}}";
const LOCATION_TOKEN = "{{RESUME_LOCATION}}";
const LINKEDIN_HREF_TOKEN = "{{RESUME_LINKEDIN_HREF}}";
const LINKEDIN_LABEL_TOKEN = "{{RESUME_LINKEDIN_LABEL}}";
const GITHUB_HREF_TOKEN = "{{RESUME_GITHUB_HREF}}";
const GITHUB_LABEL_TOKEN = "{{RESUME_GITHUB_LABEL}}";
const APPLICATION_SUFFIX = "-application";
const DEFAULT_ITEMIZE_LINE = String.raw`\setlist[itemize]{left=1.2em}`;
const COMPACT_ITEMIZE_LINE = String.raw`\setlist[itemize]{left=1.2em, itemsep=0.2em, topsep=0.3em, parsep=0pt, partopsep=0pt}`;

type JsonObject = Record<string, unknown>;

export interface GenerateResumeOptions {
  input: string;
  template?: string;
  output?: string;
  outputTex?: string;
  headline?: string;
  texOnly?: boolean;
  cwd?: string;
}

export interface CompileTexOptions {
  texPath: string;
  output?: string;
  cwd?: string;
}

export interface GeneratedResume {
  outputPdfPath: string;
  outputTexPath: string;
  compactModeApplied: boolean;
  pageCount: number | null;
}

export interface CompiledResume {
  outputPdfPath: string;
  compactModeApplied: boolean;
  pageCount: number | null;
}

interface CompileOnceResult {
  pageCount: number | null;
  latexOutput: string;
}

export function latexEscape(value: string): string {
  const replacements: Record<string, string> = {
    "\\": String.raw`\textbackslash{}`,
    "&": String.raw`\&`,
    "%": String.raw`\%`,
    "$": String.raw`\$`,
    "#": String.raw`\#`,
    "_": String.raw`\_`,
    "{": String.raw`\{`,
    "}": String.raw`\}`,
    "~": String.raw`\textasciitilde{}`,
    "^": String.raw`\textasciicircum{}`
  };

  return Array.from(value, (char) => replacements[char] ?? char).join("");
}

export function normalizeHeadline(rawTitle: string): string {
  const noSuffix = rawTitle.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return noSuffix || rawTitle.trim();
}

export function slugify(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || "company";
}

export function phoneHref(value: string): string {
  return value.replace(/\s+/g, "");
}

export function hrefFromProfileUrl(value: string): string {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value)) {
    return value;
  }

  return `https://${value}`;
}

export function resolvePath(rawPath: string, cwd = process.cwd()): string {
  if (rawPath.startsWith("~")) {
    const home = process.env.HOME;
    if (!home) {
      throw new Error("Cannot resolve ~ because HOME is not set.");
    }
    return resolve(home, rawPath.slice(2));
  }

  return rawPath.startsWith("/") ? resolve(rawPath) : resolve(cwd, rawPath);
}

export function loadJsonObject(path: string): JsonObject {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!isJsonObject(parsed)) {
    throw new Error(`Expected JSON object in ${path}.`);
  }

  return parsed;
}

export function getPersonalInfo(data: JsonObject, sourceLabel: string): JsonObject {
  const personalInfo = data.personalInfo;
  if (!isJsonObject(personalInfo)) {
    throw new Error(`Missing personalInfo in ${sourceLabel}.`);
  }

  return personalInfo;
}

export function personalInfoValue(personalInfo: JsonObject, field: string, sourceLabel: string): string {
  const value = personalInfo[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing personalInfo.${field} in ${sourceLabel}.`);
  }

  return value.trim();
}

export function candidateSlugFromProfile(profileData: JsonObject, sourceLabel: string): string {
  const personalInfo = getPersonalInfo(profileData, sourceLabel);
  const candidateName = personalInfoValue(personalInfo, "name", sourceLabel);
  const candidateSlug = slugify(candidateName);
  if (candidateSlug === "company") {
    throw new Error(`personalInfo.name in ${sourceLabel} must include at least one ASCII letter or number.`);
  }

  return candidateSlug;
}

export function splitCandidateName(candidateName: string): [string, string] {
  const parts = candidateName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return [parts[0].toUpperCase(), ""];
  }

  return [parts.slice(0, -1).join(" ").toUpperCase(), parts.at(-1)?.toUpperCase() ?? ""];
}

export function inferCompanySlug(inputPath: string, data: JsonObject): string {
  if (typeof data.targetCompany === "string" && data.targetCompany.trim()) {
    return slugify(data.targetCompany);
  }

  const stem = parse(inputPath).name;
  const match = /^(.*?)-(senior|staff|principal|lead|mid|junior|sr|jr)(?:-|$)/i.exec(stem);
  const companyPart = match?.[1] ?? stem;
  return slugify(companyPart);
}

export function inferApplicationSlug(inputPath: string): string | null {
  const stem = parse(inputPath).name;
  if (!stem.endsWith(APPLICATION_SUFFIX)) {
    return null;
  }

  return stem.slice(0, -APPLICATION_SUFFIX.length) || null;
}

export function defaultOutputPdfPath(inputPath: string, data: JsonObject, candidateSlug: string): string {
  const applicationSlug = inferApplicationSlug(inputPath);
  if (applicationSlug) {
    return join(REPO_ROOT, "applications", `${candidateSlug}-${applicationSlug}${RESUME_SUFFIX}.pdf`);
  }

  const companySlug = inferCompanySlug(inputPath, data);
  return join(REPO_ROOT, `${candidateSlug}-${companySlug}${RESUME_SUFFIX}.pdf`);
}

export function defaultOutputPdfPathForTex(texPath: string): string {
  return join(REPO_ROOT, "applications", `${parse(texPath).name}.pdf`);
}

export function extractPageCount(latexOutput: string): number | null {
  const match = /Output written on .* \((\d+) pages?,/.exec(latexOutput);
  return match ? Number.parseInt(match[1], 10) : null;
}

export async function compileOnce(texPath: string, outputPdfPath: string, compileDir?: string): Promise<CompileOnceResult> {
  const targetCompileDir = compileDir ?? dirname(texPath);
  const outputDir = mkdtempSync(join(targetCompileDir, "latexmk-"));

  try {
    const compileInput = relative(targetCompileDir, texPath);
    const outputStem = parse(outputPdfPath).name;
    const proc = spawn(
      "latexmk",
      ["-lualatex", "-halt-on-error", `-jobname=${outputStem}`, `-outdir=${outputDir}`, compileInput],
      {
      cwd: targetCompileDir,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    const [stdout, stderr, exitCode] = await Promise.all([
      streamToText(requireReadable(proc.stdout, "latexmk stdout")),
      streamToText(requireReadable(proc.stderr, "latexmk stderr")),
      waitForExit(proc)
    ]);
    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(stderr);
    }
    if (exitCode !== 0) {
      throw new Error(`latexmk failed with exit code ${exitCode}.`);
    }

    const producedPdf = join(outputDir, `${outputStem}.pdf`);
    mkdirSync(dirname(outputPdfPath), { recursive: true });
    renameSync(producedPdf, outputPdfPath);

    return { pageCount: extractPageCount(stdout), latexOutput: stdout };
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
}

function requireReadable(stream: Readable | null, label: string): Readable {
  if (!stream) throw new Error(`Expected ${label} stream to be available.`);
  return stream;
}

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

export function ensureCompactItemize(texPath: string): boolean {
  const content = readFileSync(texPath, "utf8");
  if (content.includes(COMPACT_ITEMIZE_LINE)) {
    return false;
  }

  const updated = content.includes(DEFAULT_ITEMIZE_LINE)
    ? content.replace(DEFAULT_ITEMIZE_LINE, COMPACT_ITEMIZE_LINE)
    : content.replace(String.raw`\usepackage{enumitem}`, `${String.raw`\usepackage{enumitem}`}\n${COMPACT_ITEMIZE_LINE}`);

  writeFileSync(texPath, updated, "utf8");
  return true;
}

export async function compileTexToPdf(texPath: string, outputPdfPath: string, compileDir?: string): Promise<CompiledResume> {
  let { pageCount } = await compileOnce(texPath, outputPdfPath, compileDir);
  let compactModeApplied = false;

  if (pageCount !== null && pageCount > 2) {
    compactModeApplied = ensureCompactItemize(texPath);
    if (compactModeApplied) {
      console.log("Resume exceeded 2 pages. Recompiling with compact itemize spacing.");
      ({ pageCount } = await compileOnce(texPath, outputPdfPath, compileDir));
    }
  }

  return { outputPdfPath, compactModeApplied, pageCount };
}

export function buildExperienceBlock(workExperience: unknown): string {
  if (!Array.isArray(workExperience)) {
    return "";
  }

  const lines: string[] = [];
  for (const role of workExperience) {
    if (!isJsonObject(role)) {
      continue;
    }

    const title = latexEscape(optionalString(role.title).toUpperCase());
    const location = latexEscape(optionalString(role.location));
    const company = latexEscape(optionalString(role.company));
    const years = latexEscape(optionalString(role.years)).replace(" - ", " {-} ");
    lines.push(String.raw`\WorkExperience{${title} \hfill ${location}}{${company} \hfill ${years}} \\`);

    if (Array.isArray(role.tech) && role.tech.length > 0) {
      const techLine = role.tech.map((item) => latexEscape(String(item))).join(", ");
      lines.push(String.raw`\Skills{${techLine}}`);
    }

    if (Array.isArray(role.description) && role.description.length > 0) {
      lines.push(String.raw`\begin{itemize}`);
      for (const item of role.description) {
        lines.push(String.raw`\item ${latexEscape(String(item))}`);
      }
      lines.push(String.raw`\end{itemize}`);
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function renderTemplate(templateContent: string, personalInfo: JsonObject, sourceLabel: string, headline: string, experienceBlock: string): string {
  const candidateName = personalInfoValue(personalInfo, "name", sourceLabel);
  const [nameFirst, nameLast] = splitCandidateName(candidateName);
  const email = personalInfoValue(personalInfo, "email", sourceLabel);
  const phone = personalInfoValue(personalInfo, "phone", sourceLabel);
  const location = personalInfoValue(personalInfo, "location", sourceLabel);
  const linkedin = personalInfoValue(personalInfo, "linkedin", sourceLabel);
  const github = personalInfoValue(personalInfo, "github", sourceLabel);

  const replacements: Record<string, string> = {
    [FULL_NAME_TOKEN]: latexEscape(candidateName),
    [NAME_FIRST_TOKEN]: latexEscape(nameFirst),
    [NAME_LAST_TOKEN]: latexEscape(nameLast),
    [EMAIL_HREF_TOKEN]: email,
    [EMAIL_LABEL_TOKEN]: latexEscape(email),
    [PHONE_HREF_TOKEN]: phoneHref(phone),
    [PHONE_LABEL_TOKEN]: latexEscape(phone),
    [LOCATION_TOKEN]: latexEscape(location),
    [LINKEDIN_HREF_TOKEN]: hrefFromProfileUrl(linkedin),
    [LINKEDIN_LABEL_TOKEN]: latexEscape(linkedin),
    [GITHUB_HREF_TOKEN]: hrefFromProfileUrl(github),
    [GITHUB_LABEL_TOKEN]: latexEscape(github),
    [HEADLINE_TOKEN]: `{${latexEscape(headline)}}`,
    [EXPERIENCE_TOKEN]: experienceBlock
  };

  let output = templateContent;
  for (const [token, value] of Object.entries(replacements)) {
    if (!output.includes(token)) {
      throw new Error(`Template is missing token: ${token}`);
    }
    output = output.replaceAll(token, value);
  }

  return output;
}

export async function generateResumeFromJson(options: GenerateResumeOptions): Promise<GeneratedResume> {
  const cwd = options.cwd ?? process.cwd();
  const inputPath = resolvePath(options.input, cwd);
  const templatePath = resolvePath(options.template ?? DEFAULT_TEMPLATE_PATH, cwd);
  const data = loadJsonObject(inputPath);
  const profileData = loadJsonObject(DEFAULT_PROFILE_PATH);
  const profilePersonInfo = getPersonalInfo(profileData, DEFAULT_PROFILE_PATH);
  const candidateSlug = candidateSlugFromProfile(profileData, DEFAULT_PROFILE_PATH);
  const templateContent = readFileSync(templatePath, "utf8");
  const outputPdfPath = options.output ? resolvePath(options.output, cwd) : defaultOutputPdfPath(inputPath, data, candidateSlug);
  const outputTexPath = options.outputTex ? resolvePath(options.outputTex, cwd) : join(dirname(templatePath), `${parse(outputPdfPath).name}.tex`);
  const rawTitle = getNestedString(data, "personalInfo", "title");
  const headline = options.headline ?? normalizeHeadline(rawTitle);

  if (!headline) {
    throw new Error("Missing personalInfo.title in JSON and no --headline override provided.");
  }

  const experienceBlock = buildExperienceBlock(data.workExperience);
  const outputContent = renderTemplate(templateContent, profilePersonInfo, DEFAULT_PROFILE_PATH, headline, experienceBlock);
  mkdirSync(dirname(outputTexPath), { recursive: true });
  writeFileSync(outputTexPath, `${outputContent}\n`, "utf8");

  if (options.texOnly) {
    return { outputPdfPath, outputTexPath, compactModeApplied: false, pageCount: null };
  }

  const compiled = await compileTexToPdf(outputTexPath, outputPdfPath, dirname(templatePath));
  return { outputPdfPath, outputTexPath, compactModeApplied: compiled.compactModeApplied, pageCount: compiled.pageCount };
}

export async function compileExistingTex(options: CompileTexOptions): Promise<CompiledResume> {
  const cwd = options.cwd ?? process.cwd();
  const texPath = resolvePath(options.texPath, cwd);
  const outputPdfPath = options.output ? resolvePath(options.output, cwd) : defaultOutputPdfPathForTex(texPath);
  return compileTexToPdf(texPath, outputPdfPath);
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getNestedString(data: JsonObject, parentKey: string, childKey: string): string {
  const parent = data[parentKey];
  if (!isJsonObject(parent)) {
    return "";
  }

  return optionalString(parent[childKey]);
}

export function pathExists(path: string): boolean {
  return existsSync(path);
}
