---
name: company-grounding
description: Ground a job application in official company research. Use when an application workflow needs a sourced `company_profile` explaining what the company does before fit analysis or resume tailoring.
---

# Company Grounding

Create or update `ai/{company}/{slug}-application.json` with a sourced `company_profile` block. If the file does not exist and a base candidate profile is available, copy it first. If it already exists, preserve existing tailored resume content and update only `company_profile`.

Before browsing company pages, check saved local records under `ai/{company}/` for an existing `company_profile`. Reuse it when the company matches and the profile has usable `source_notes`; browse only to fill missing fields, refresh stale or weakly sourced claims, or resolve conflicts.

This skill explains the company. It does not find open roles, recover application links, inspect job-board forms, or improve the JD from careers pages. Use `job-application-links` for that final-stage work.

## Steps

1. Check saved local records before opening company pages. Completion criterion: matching `ai/{company}/*-application.json` records were reviewed, and reusable `company_profile` data was copied or preserved before any web research.
2. Prefer official sources when web research is needed: company home page, about page, product pages, product docs, customer pages, official blog posts, and official help/docs pages. Completion criterion: core company claims come from official or company-linked sources when available.
3. Use third-party sources only to clarify context, never as the main basis for company claims. Completion criterion: no main claim depends on third-party material.
4. Identify what the company does in plain language: product, services, customers, industry, business model, and recent signals. Completion criterion: the user can understand the company before deciding whether to apply.
5. Do not crawl careers, jobs, openings, application forms, job-board pagination, or common paths such as `/careers`, `/jobs`, `/join-us`, `/work-with-us`, or `/open-positions` for role discovery. Completion criterion: no `open_roles` or application URL fields are written by this skill.
6. Mark each company signal as `direct`, `jd_only`, or `inferred` in `source_notes`. Completion criterion: each source note has a confidence label.
7. Infer cautiously only when needed, and label inferred mission or vision explicitly. Completion criterion: inferred details are visibly marked and low risk.
8. Use direct or JD-only company details in cover-letter inputs. Avoid inferred details there unless the inference is obvious and low risk. Completion criterion: cover-letter inputs are safe for a human reviewer.
9. Do not hallucinate missing facts. Completion criterion: empty or unknown fields stay empty rather than invented.
10. Write the profile using the schema in [company-profile-schema.md](reference/company-profile-schema.md). Completion criterion: `company_profile` is present in `application.json` with the expected shape and no existing resume data was removed.
