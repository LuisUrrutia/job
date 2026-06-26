import { createHash } from "node:crypto";
import type { JobIdentityInput } from "./types.ts";

export function canonicalUrl(value: unknown): string {
  if (!value) return "";

  try {
    const url = new URL(String(value));
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("trk") || key === "refId" || key === "trackingId") {
        url.searchParams.delete(key);
      }
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value).trim();
  }
}

export function stableJobId(candidate: JobIdentityInput): string {
  const numericLinkedInId = extractLinkedInJobId(candidate.linkedinJobId || candidate.sourceJobId || candidate.url);
  if (numericLinkedInId) return `linkedin:${numericLinkedInId}`;

  const canonical = canonicalUrl(candidate.url);
  if (canonical) return `url:${sha256(canonical).slice(0, 24)}`;

  const fallback = [candidate.title, candidate.company, candidate.source].filter(Boolean).join("|");
  return `hash:${sha256(fallback).slice(0, 24)}`;
}

export function contentHash(candidate: JobIdentityInput): string {
  return sha256(JSON.stringify({
    title: clean(candidate.title),
    company: clean(candidate.company),
    companyWebsite: canonicalUrl(candidate.companyWebsite),
    publisherCompany: clean(candidate.publisherCompany),
    url: canonicalUrl(candidate.url),
    jd: clean(candidate.jd || candidate.description),
    source: clean(candidate.source),
    sourceJobId: clean(candidate.sourceJobId || candidate.linkedinJobId)
  }));
}

export function extractLinkedInJobId(value: unknown): string {
  const text = String(value || "");
  const urlMatch = text.match(/linkedin\.com\/jobs\/view\/(\d+)/i);
  if (urlMatch) return urlMatch[1];

  const numeric = text.match(/^\d{6,}$/);
  return numeric ? numeric[0] : "";
}

export function sha256(value: unknown): string {
  return createHash("sha256").update(String(value)).digest("hex");
}

function clean(value: unknown): string {
  return String(value || "").trim();
}
