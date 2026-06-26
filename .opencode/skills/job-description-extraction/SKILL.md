---
name: job-description-extraction
description: Extract recruiter-ready JD data into a requirement-led `jd.json`. Use when a target job post or company role page must become the source contract for fit analysis and resume tailoring.
---

# Job Description Extraction

Create `ai/{company}/{slug}-jd.json` from the JD and basic company role context.

## Steps

1. Identify the role, company, department, employment type, seniority, work model, location, compensation, and eligibility constraints. Completion criterion: omitted location, compensation, visa, sponsorship, and work authorization fields use `not_stated`.
2. Extract employer requirements into `requirements[]`. Completion criterion: every employer requirement has a stable `id`, text, category, priority, confidence, `evidence_type`, and required source quote.
3. Treat `requirements[]` as the source of truth. Completion criterion: responsibilities, outcomes, priorities, constraints, and risks only reference requirements by ID and don't create another requirement list.
4. Give downstream-cited entities stable IDs. Completion criterion: requirements, constraints, candidate-risk notes, red flags, and screening priorities have stable IDs before any cross-reference uses them.
5. Quote high-risk fields. Completion criterion: every high-priority requirement, eligibility constraint, geography constraint, compensation statement, red flag, and candidate-risk note has a short source quote when the JD states one.
6. Capture readable responsibilities and success outcomes. Completion criterion: each item summarizes work or expected impact and links to requirement IDs where useful.
7. Capture ATS and recruiter terms in `keyword_signals[]`. Completion criterion: each term has a priority and reason, and no term is used as a hidden requirement.
8. Rank screening priorities qualitatively. Completion criterion: each item in `screening_priorities[]` has stable ID, rank, reason, linked requirement IDs, and evidence.
9. Keep the extraction employer-side. Completion criterion: candidate constraints and risks are visible for the fit gate, but the file doesn't make final candidate-specific apply recommendations.
10. Resolve missing role basics from the company role page or user input only. Completion criterion: `company`, `position`, and slug inputs are resolved, or a focused follow-up is asked.
11. Write `ai/{company}/{slug}-jd.json` using [jd-schema.md](reference/jd-schema.md). Completion criterion: the file matches the documented top-level structure.
