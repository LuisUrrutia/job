# Preflight Test Cases

Before finalizing generated outputs, check these behavior tests:

- Blocker warning test: if the JD has a legal, location, domain, or must-have gap, the user-facing fit summary names it plainly and then proceeds only with grounded adjacent evidence.
- Omitted-constraint test: if the JD omits location, timezone, work model, visa, sponsorship, work authorization, or geography restrictions, no eligibility risk is created from that omission alone.
- Missing evidence test: every unsupported must-have is marked `missing` or `partial`; no resume or cover-letter sentence upgrades it to a direct claim.
- Career-answer persistence test: when the user answered a career question, the reusable fact was written to `info.json` before it appeared in `analysis.json`, `application.json`, cover-letter text, apply answers, TeX, or PDF.
- Company grounding test: every company-specific sentence comes from the JD, official company research, or a labeled low-risk inference.
- Saved-record-first test: before web scraping or page inspection, matching local `application.json` or `apply.json` records were checked and reused when sufficiently sourced.
- Company-scope test: `company_profile` explains what the company does but does not contain `open_roles`, apply links, or application-question data.
- Anti-generic test: the summary, top bullets, bold phrases, and cover letter would not work unchanged for a different company.
- Cover-letter pitch test: the letter connects this company's problem to 1 to 2 proof points and does not read like a resume summary.
- Gap-framing test: any named gap is honest, non-apologetic, and bridged only to supported adjacent evidence.
- PDF skim test: the TeX bold phrases and first visible skills tell the same fit story as `resume_focus_priority`.
- Highlight-value test: the bold phrases emphasize reviewer value, risk reduction, or role-specific outcomes, not merely technologies, internal product names, or project labels.
- Apply-link test: the recommended apply URL is official or company-linked and matches the target role as `likely_match`, `possible_match`, or explicitly explained `unknown`.
- Application-answer test: visible application-page answers are in English, grounded in allowed sources, humanized, and do not invent answers for hidden or inaccessible questions.
