import { canonicalUrl, contentHash, stableJobId } from "../domain.js";

export function normalizeDiscoveryOutput(stdout) {
  const parsed = parseJson(stdout);
  const unwrapped = unwrapAgentResult(parsed);
  const rawCandidates = Array.isArray(unwrapped) ? unwrapped : unwrapped.candidates || unwrapped.jobs || [];
  if (!Array.isArray(rawCandidates)) {
    throw new Error("Discovery output JSON must contain a candidates array.");
  }

  return rawCandidates
    .map(normalizeCandidate)
    .filter((candidate) => candidate.title && candidate.company && candidate.url);
}

function normalizeCandidate(raw) {
  const candidate = {
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

  return {
    id: stableJobId(candidate),
    contentHash: contentHash(candidate),
    title: candidate.title,
    company: candidate.company,
    companyWebsite: candidate.companyWebsite,
    publisherCompany: candidate.publisherCompany,
    url: candidate.url,
    source: candidate.source,
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

function parseJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    const match = stdout.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Discovery runner did not return parseable JSON.");
    return JSON.parse(match[0]);
  }
}

function unwrapAgentResult(parsed) {
  if (Array.isArray(parsed) || parsed.candidates || parsed.jobs) return parsed;

  for (const key of ["result", "response", "output", "text", "content", "message"]) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim()) return parseJson(value);
  }

  return parsed;
}

function text(value) {
  return String(value || "").trim();
}
