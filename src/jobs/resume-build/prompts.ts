import type { ApplicationQuestion, CompanyResearch, PromptTemplate, StoredJobCandidate } from "../types.ts";

export const linkedInResumeBuildPrompt: PromptTemplate = {
  name: "linkedin-resume-build",
  version: "2026-06-27.2",
  template: `You are building a truthful tailored resume source for one researched LinkedIn job candidate.

Return JSON only. Do not edit files. Do not include markdown fences. The CLI will use this JSON as temporary input and persist only the generated PDF path.

Base profile from info.json:
{{PROFILE_JSON}}

Candidate row from SQLite:
{{CANDIDATE_JSON}}

Reusable company research from SQLite:
{{COMPANY_JSON}}

Visible application questions and draft answers:
{{QUESTIONS_JSON}}

Return one resume-generator-compatible JSON object. Preserve the base profile's personalInfo contact fields exactly. Tailor personalInfo.title, summary, workExperience ordering, tech ordering, and bullet selection to the candidate's JD, fit evidence, company research, products/services, apply URL context, and visible application questions. Include these top-level metadata fields for audit: targetCompany, targetPosition, jobSlug, company_profile, application_questions, resume_focus_priority, resume_bold_phrases.

Rules:
- Use English.
- Do not invent experience, dates, employers, metrics, visa status, education, certifications, or tools.
- Use only facts supported by the base profile, candidate JD/verification note, fit evidence, company research, or application-question evidence.
- You may reorder existing workExperience, trim bullets, and rewrite bullets only when the rewritten claim is directly supported by the base profile.
- Keep strong quantified evidence when relevant.
- Prefer the strongest 4-6 bullets for recent roles and fewer bullets for older roles.
- Make the first visible skills and first bullets tell the fit story for this candidate.
- Populate resume_bold_phrases with exact 2-8 word substrings from rewritten bullets only. Pick sparse recruiter-skim phrases that explain fit; do not include single tech names, whole sentences, product names, or generic phrases.
- Keep output valid JSON and compatible with src/resume/generator.ts: it must include personalInfo.title and workExperience[].description arrays.
`
};

export function renderResumeBuildPrompt(
  prompt: PromptTemplate,
  profile: unknown,
  candidate: StoredJobCandidate,
  company: CompanyResearch,
  questions: ApplicationQuestion[]
): string {
  return prompt.template
    .replace("{{PROFILE_JSON}}", JSON.stringify(profile, null, 2))
    .replace("{{CANDIDATE_JSON}}", JSON.stringify(candidate, null, 2))
    .replace("{{COMPANY_JSON}}", JSON.stringify(company, null, 2))
    .replace("{{QUESTIONS_JSON}}", JSON.stringify(questions, null, 2));
}
