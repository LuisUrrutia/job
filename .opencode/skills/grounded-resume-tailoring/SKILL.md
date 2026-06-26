---
name: grounded-resume-tailoring
description: Tailor the candidate's resume JSON with grounded evidence from `@info.json`. Use when the resume workflow needs `application.json` adapted to a specific JD.
---

# Grounded Resume Tailoring

Update `ai/{company}/{slug}-application.json` for ATS and recruiter review. Start from the existing file when present, and preserve any `company_profile` created by `company-grounding`.

If the user has answered a career question, update `@info.json` before tailoring. Do not use new career facts from chat context until they have been persisted in the source profile.

## Outcomes

- Surface must-have evidence first.
- Show clear match to role scope and seniority.
- Integrate the top 8 to 12 JD keywords naturally across Summary, Skills, and Experience.
- Use achievement-oriented bullets grounded in existing evidence.
- Keep the document standard, concise, and easy to scan.
- Reject generic content: if a sentence would fit any company after swapping the company and job title, rewrite it or remove it.
- Let `resume_focus_priority` decide what appears first, what gets cut, and what receives TeX emphasis.
- Preserve `company_profile` and its `source_notes` while tailoring resume content.

## Steps

1. Persist any new user-provided career facts into `@info.json` before editing `application.json`. Completion criterion: new facts about experience, skills, technologies, achievements, dates, scope, ownership, constraints, or preferences are not stored only in chat or generated files.
2. Tighten the summary around role, domain, and strongest evidence. Completion criterion: the summary reflects must-haves and the top fit story.
3. Reorder bullets by relevance to the target role. Completion criterion: the first bullets carry the strongest supported match.
4. Reorder each role's `tech` array and `additional.technicalSkills` by JD relevance while preserving all original entries in `application.json`. Completion criterion: no original entry is removed from the JSON inventory.
5. Keep only the most relevant bullets for each role. Completion criterion: relevant roles have 3 to 6 bullets by default, intentionally de-emphasized roles have 1 to 2 bullets.
6. Keep each bullet single-theme. Do not merge unrelated initiatives into one sentence. Completion criterion: timeline, causality, and ownership remain clear.
7. Explain internal names or acronyms on first mention so an external recruiter can understand them. Completion criterion: no unexplained internal shorthand blocks comprehension.
8. Mention requested must-have technologies explicitly in the most relevant bullets when factually true. Completion criterion: supported must-haves are easy to find.
9. If a must-have is only partially matched, position the adjacent evidence plainly instead of implying direct experience. Completion criterion: no sentence upgrades partial evidence into a direct claim.
10. Use strong outcome language only when the metric, scope, or result exists in `@info.json` or persisted user clarification. Completion criterion: every metric and result is source-backed.
11. Apply the grounded adaptation and resume JSON rules in [tailoring-rules.md](reference/tailoring-rules.md). Completion criterion: `application.json` remains truthful, complete, readable, and retains `company_profile` if it was present before tailoring.
