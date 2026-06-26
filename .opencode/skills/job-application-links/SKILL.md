---
name: job-application-links
description: Find the official application link and inspect the application page as the final job-application stage. Use when the resume workflow needs the exact apply URL, visible application questions, or English answer suggestions after fit gating and application package generation.
---

# Job Application Links

Find where to apply and prepare grounded English answers for visible application-page questions. This is a final-stage skill: run it after the apply decision and, when requested, after the resume and cover letter are ready.

Write `ai/{company}/{slug}-apply.json` using [application-link-schema.md](reference/application-link-schema.md).

Before browsing careers pages or inspecting an application form, check saved local records under `ai/{company}/` for a matching `*-apply.json`. Reuse the saved application route and visible-question answers when the company and role match; browse only to find missing links, verify stale or uncertain routes, or capture questions not already recorded.

## Steps

1. Check saved local records before opening careers pages or application forms. Completion criterion: matching `ai/{company}/*-apply.json` records were reviewed, and reusable route or question data was copied or preserved before any web inspection.
2. Start from the JD URL, company website, `company_profile`, saved route data, and any existing source URLs. Completion criterion: the search begins from known official, company-linked, or saved source-grounded records, not generic web guessing.
3. Find the best official application URL when no reliable saved route exists. Completion criterion: `recommended_apply_url` points to the most direct official application page or job-board posting for the target role.
4. Search careers/jobs/openings surfaces only for application routing: official navigation, footer links, the JD source, company-linked ATS pages, and common paths such as `/careers`, `/jobs`, `/join-us`, `/work-with-us`, and `/open-positions`. Completion criterion: checked URLs and the chosen route are recorded in `source_notes`.
5. Compare discovered role pages against the target JD. Completion criterion: the recommended link is marked `likely_match`, `possible_match`, or `unknown` with a short reason; do not recommend a `not_match` role unless no better official route exists and the user is warned.
6. If the application page is accessible without submitting and saved question data is missing or uncertain, inspect visible questions, required fields, and upload expectations. Completion criterion: each visible non-standard question is captured with label, required state when known, answer type, and page URL.
7. Do not submit forms, create accounts, bypass paywalls, solve CAPTCHAs, or enter private data into third-party sites. Completion criterion: work stops at inspection and answer drafting.
8. Draft suggested answers in English only for visible questions that can be answered from `@info.json`, the JD, company research, resume JSON, cover letter, or persisted user clarification. If the user answers a career question while preparing application answers, update `@info.json` before using that answer. Completion criterion: every answer lists grounded sources and no answer invents facts or relies on unpersisted career facts.
9. Use the `humanize` skill before finalizing answers. Completion criterion: answers sound like a real candidate, avoid AI filler, and remain concise enough for form fields.
10. If the page cannot be inspected because of login, CAPTCHA, geoblocking, broken scripts, or access limits, record the blocker and do not invent hidden questions. Completion criterion: the user still receives the best apply link and a Spanish explanation of what could not be inspected.
11. Report the result to the user in Spanish, with the apply link and English answer suggestions clearly separated. Completion criterion: the user knows exactly where to apply and what to paste if those questions appear.

## Guardrails

- Prefer company-owned or company-linked ATS URLs over third-party reposts.
- Do not improve or rewrite the JD in this skill. JD extraction is already complete by this stage.
- Do not add careers/openings data to `company_profile`; keep it in `apply.json`.
- Treat missing JD location, timezone, visa, sponsorship, work model, or authorization fields as acceptable unless the JD or apply page explicitly states a restriction.
- Keep answers direct, specific, and natural. Avoid template phrases such as `I am excited to`, `passionate about`, `dynamic`, `pivotal`, or `leveraging` unless grounded and genuinely natural.
- Never suggest lying in knockout questions. If a question exposes a blocker, state it plainly in Spanish and suggest the truthful English answer.
