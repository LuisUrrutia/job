---
name: application-preflight
description: Validate the applicant's generated job application package before handoff. Use when the resume workflow needs behavior tests and final checks across JSON, TeX, PDF, cover letter, apply link, and application-page answer suggestions.
---

# Application Preflight

Run the behavior tests and final validation checklist before finishing. If validation fails, fix the outputs before finishing.

## Steps

1. Run the behavior tests in [behavior-tests.md](reference/behavior-tests.md). Completion criterion: every behavior test passes after any required fixes.
2. Run the final validation checklist in [final-validation-checklist.md](reference/final-validation-checklist.md). Completion criterion: every checklist item is confirmed true after any required fixes.
3. Check the required output files exist. Completion criterion: `jd.json`, `analysis.json`, `application.json`, cover letter, apply JSON, TeX, and PDF are present at the router paths.
4. Confirm no em dash characters remain. Completion criterion: generated narrative files contain no `U+2014`.
