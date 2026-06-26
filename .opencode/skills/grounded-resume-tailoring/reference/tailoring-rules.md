# Tailoring Rules

## Grounded Adaptation Rules

Allowed:

- Rephrase, reorder, and adapt responsibilities to match the JD if the resulting claim remains plausible for that role.
- Add or emphasize technologies from that role's `tech` array, another source-backed inventory field, or user clarification that has been persisted to `@info.json` even if the original bullet did not mention them.
- If a required skill is absent from the bullet text but present in the role's `tech` array, another source-backed inventory field, or user clarification that has been persisted to `@info.json`, adapt the bullet to surface it.

Forbidden:

- Do not introduce technologies that are absent from all of: the role's `tech` array, another source-backed inventory field, and user clarifications persisted to `@info.json`.
- Do not invent metrics, percentages, revenue, outcomes, employers, title upgrades, certifications, or dates.
- Do not change date strings or any timeline field.
- Do not remove existing skills, certifications, languages, or awards from `application.json`. Reorder is allowed.
- Do not remove `company_profile`, `source_notes`, or other company-grounding metadata already present in `application.json`.
- Do not recreate `application.json` from scratch when it already exists; update the existing file in place.
- Do not over-repeat the same technology across many bullets.
- Do not leave jargon unexplained on first mention.
- Do not ignore user corrections about phrasing, sequencing, or scope. Treat career corrections as source of truth, update `@info.json` first, and update all affected outputs.
- Do not use new user-provided career facts in tailored outputs before persisting them to `@info.json`.

Whenever the user answers a question about their career, update `@info.json` first and keep all tailored outputs consistent with that updated source profile.

If a required skill is missing from the role's `tech` array, other source-backed inventory fields, user clarifications persisted to `@info.json`, and the source resume, report the gap instead of papering over it.

## Resume JSON Rules

For `ai/{company}/{slug}-application.json`:

- Write all narrative text in English.
- Use the `humanize` skill before finalizing narrative text.
- Do not use the em dash character (`U+2014`).
- Prefer direct verbs over inflated resume language.
- Avoid AI-sounding resume filler such as `pivotal`, `crucial`, `showcasing`, `leveraging`, `dynamic`, `fast-paced`, and `passionate` unless quoting the JD.
- Keep proper nouns unchanged.
- Avoid first-person pronouns.
- Preserve exact `customSections` structure, order, item counts, titles, subtitles, and `years` values.
- If any original custom section description is `[]`, keep it `[]`.
- Keep section names ATS-friendly, for example `Summary`, `Experience`, `Education`, `Skills`.
- Keep must-have evidence easy to find near the top of the document.
- Vary phrasing across roles; avoid repetitive copy-paste sentence shapes.
