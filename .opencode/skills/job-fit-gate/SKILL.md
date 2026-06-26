---
name: job-fit-gate
description: Gate a job application by mapping JD requirement IDs to resume evidence. Use when the resume workflow needs `analysis.json`, fit risks, and apply guidance from a requirement-led `jd.json`.
---

# Job Fit Gate

Create `ai/{company}/{slug}-analysis.json`, explain fit and risks to the user in Spanish, and decide whether to apply.

## Steps

1. Load the JD contract, `company_profile`, and candidate facts. Completion criterion: `requirements[]`, `employer_constraints`, `keyword_signals[]`, `screening_priorities[]`, `company_profile`, and `info.json` `personalInfo.timezone` are available before assessing fit.
2. If the user answered any career follow-up before or during fit analysis, update `info.json` before mapping evidence. Completion criterion: new or corrected experience, skills, projects, metrics, scope, ownership, dates, constraints, or preferences are available in `info.json`, not only in chat context.
3. Map every requirement ID to exact candidate evidence. Completion criterion: every `requirements[].id` appears once in `requirement_evidence_map`.
4. Use `matched`, `partial`, or `missing` for evidence status. Completion criterion: every evidence map item uses one allowed status and preserves the original `requirement_id`.
5. Use `blocker`, `major`, or `minor` severity for gaps and eligibility risks. Completion criterion: every gap and eligibility risk has one allowed severity and references stable requirement IDs where applicable.
6. Evaluate employer constraints separately from skill fit. Completion criterion: location, work authorization, visa, sponsorship, compensation, timezone, and geography risks are assessed only from explicit JD states, stable constraint IDs, and source quotes.
7. Do not treat omitted constraints as risks. Completion criterion: if location, timezone, work model, visa, sponsorship, work authorization, or geography are `not_stated`, empty, or unsupported by a source quote, no `eligibility_risk` is created and the fit summary assumes the user intentionally supplied a viable remote/application target.
8. Do not treat job-board locations, copied page boilerplate, duplicate country postings, or incidental city/country mentions as eligibility constraints by themselves. Completion criterion: country, geography, authorization, visa, and timezone risks are raised only when the JD explicitly states a restriction such as `US only`, citizenship required, specific work authorization, a specific visa, resident-only eligibility, or required timezone/working-hours overlap; timezone fit is checked against `info.json` `personalInfo.timezone`, not inferred from location.
9. Use `keyword_signals[]` only to shape resume wording. Completion criterion: keyword choices can be traced to JD terms, not invented claims.
10. Use `screening_priorities[]` to rank what the resume must prove first. Completion criterion: resume focus, role bullet selection, TeX bolding, and cover-letter evidence trace back to screening priority IDs, ranked priorities, and requirement IDs.
11. Treat unclear ownership, vague timelines, and missing evidence as follow-up questions before finalizing claims. Completion criterion: no claim relies on unresolved ambiguity.
12. Don't hide missing requirements. Completion criterion: all missing or partial high-priority requirements appear in `gaps` and in the user-facing summary.
13. Use one recommendation value: `strong_apply`, `apply_with_risks`, `weak_apply`, or `do_not_apply_but_can_tailor`. Completion criterion: `fit_analysis.recommendation` uses one allowed value and reflects blockers, major gaps, company context, and strongest evidence.
14. Explain the fit results to the user before generating final resume or cover-letter files. Completion criterion: the user sees what the company does, blockers, major gaps, closest evidence, and recommendation in Spanish before tailoring proceeds.
15. Write `ai/{company}/{slug}-analysis.json` using [analysis-schema.md](reference/analysis-schema.md). Completion criterion: the file matches the documented top-level structure.
