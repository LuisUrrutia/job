import { canonicalUrl, contentHash, stableJobId } from "../domain.ts";
import type {
  CandidateNormalizationReport,
  CandidateRejection,
  CandidateRejectionReason,
  JobCandidate,
  RawJobCandidate
} from "../types.ts";

interface CandidateFields {
  title: string;
  company: string;
  companyWebsite: string;
  publisherCompany: string;
  url: string;
  source: string;
  sourceJobId: string;
  location: string;
  remoteScope: string;
  employmentType: string;
  salaryRange: string;
  postedAt: string;
  description: string;
  verificationNote: string;
}

export function normalizeDiscoveryOutput(stdout: string): JobCandidate[] {
  return normalizeDiscoveryOutputWithReport(stdout).candidates;
}

export function normalizeDiscoveryOutputWithReport(stdout: string): CandidateNormalizationReport {
  const rawCandidates = rawDiscoveryCandidates(stdout);
  const candidates: JobCandidate[] = [];
  const rejected: CandidateRejection[] = [];

  rawCandidates.forEach((raw, index) => {
    const fields = candidateFields(raw);
    const reasons = rejectionReasons(fields);
    if (reasons.length > 0) {
      rejected.push(candidateRejection(index, fields, reasons));
      return;
    }

    candidates.push(normalizeCandidate(raw, fields));
  });

  return { candidates, rejected };
}

export function rawDiscoveryCandidates(stdout: string): RawJobCandidate[] {
  const parsed = parseJson(stdout);
  const unwrapped = unwrapAgentResult(parsed);
  if (Array.isArray(unwrapped)) return unwrapped.filter(isRecord);
  if (!isRecord(unwrapped)) throw new Error("Discovery output JSON must contain a candidates array.");

  const candidates = unwrapped.candidates ?? unwrapped.jobs ?? [];
  if (!Array.isArray(candidates)) throw new Error("Discovery output JSON must contain a candidates array.");
  return candidates.filter(isRecord);
}

function candidateFields(raw: RawJobCandidate): CandidateFields {
  return {
    title: text(raw.title),
    company: text(raw.company || raw.hiringCompany),
    companyWebsite: canonicalUrl(raw.companyWebsite || raw.company_website),
    publisherCompany: text(raw.publisherCompany || raw.publisher_company),
    url: canonicalUrl(raw.url || raw.linkedinUrl),
    source: text(raw.source || "linkedin"),
    sourceJobId: text(raw.sourceJobId || raw.linkedinJobId),
    location: text(raw.location),
    remoteScope: text(raw.remoteScope || raw.remote_scope),
    employmentType: text(raw.employmentType || raw.employment_type),
    salaryRange: text(raw.salaryRange || raw.salary_range),
    postedAt: text(raw.postedAt || raw.posted_at),
    description: text(raw.description || raw.jd),
    verificationNote: text(raw.verificationNote || raw.verification_note)
  };
}

function rejectionReasons(candidate: CandidateFields): CandidateRejectionReason[] {
  const reasons: CandidateRejectionReason[] = [];
  if (!candidate.title) reasons.push("missing-title");
  if (!candidate.company) reasons.push("missing-company");
  if (!candidate.url) reasons.push("missing-url");
  return reasons;
}

function candidateRejection(index: number, candidate: CandidateFields, reasons: CandidateRejectionReason[]): CandidateRejection {
  return {
    index,
    reasons,
    title: candidate.title,
    company: candidate.company,
    url: candidate.url,
    source: candidate.source,
    sourceJobId: candidate.sourceJobId
  };
}

function normalizeCandidate(raw: RawJobCandidate, candidate: CandidateFields): JobCandidate {
  return {
    id: stableJobId(candidate),
    contentHash: contentHash(candidate),
    title: candidate.title,
    company: candidate.company,
    companyWebsite: candidate.companyWebsite,
    publisherCompany: candidate.publisherCompany,
    url: candidate.url,
    source: candidate.source,
    sourceJobId: candidate.sourceJobId,
    location: candidate.location,
    remoteScope: candidate.remoteScope,
    employmentType: candidate.employmentType,
    salaryRange: candidate.salaryRange,
    postedAt: candidate.postedAt,
    description: candidate.description,
    verificationNote: candidate.verificationNote,
    rawJson: JSON.stringify(raw)
  };
}

function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch {
    const match = stdout.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Discovery runner did not return parseable JSON.");
    return JSON.parse(match[0]);
  }
}

function unwrapAgentResult(parsed: unknown): unknown {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return parsed;
  if (parsed.candidates || parsed.jobs) return parsed;

  for (const key of ["result", "response", "output", "text", "content", "message"]) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim()) return parseJson(value);
  }

  return parsed;
}

function text(value: unknown): string {
  return String(value || "").trim();
}

function isRecord(value: unknown): value is RawJobCandidate {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
