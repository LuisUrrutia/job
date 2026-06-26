---
name: job-application
description: Run the full truthful, fit-gated job application workflow for this resume repository. Use when the user wants to decide whether to apply to a target role, tailor an English resume from `@info.json`, generate a cover letter and PDF, find the official application link, or prepare grounded application-page answers without invented facts.
---

# Job Application

Create job-specific application materials for the candidate from `@info.json` and persisted user clarifications. First decide whether the candidate should apply. Only after the user confirms, optimize the resume package for ATS matching, recruiter skim speed, and hiring-manager substance without inventing facts, overstating ownership, or drifting from recorded tech stacks.

## Language Rules

- Speak with the user in Spanish.
- Write the resume/CV, cover letter, and application-page answer suggestions in English.
- Keep fit explanations, blockers, company summaries, and next-step recommendations in Spanish.
- Keep generated JSON concise and source-grounded; narrative fields that feed the resume, cover letter, or application answers should be in English.

## Quality Bar

The package must feel targeted, not templated. Every summary line, selected bullet, bold phrase, and cover-letter paragraph should connect to at least one of:

- a must-have or strong preference in the JD;
- a concrete company or product signal from official research;
- an evidence item mapped from `@info.json` or a persisted user clarification.

Balance three readers:

- ATS: exact must-have skills and role keywords appear naturally where supported.
- Recruiter: the strongest fit is obvious in a 5 to 10 second skim.
- Hiring manager: examples show scope, judgment, and technical depth.

Use existing generated narrative outputs under `latex/{candidate-slug}-*-Resume.tex` and `applications/*` as style and structure references only. They are not source facts. The source of truth remains `@info.json`, the JD, official company sources, saved source-grounded records, and persisted user clarifications.

## Source And Persistence Rules

Before browsing, scraping, or inspecting a web page for company or application information, check whether a matching local record already exists under `ai/{company}/`.

- Reuse `*-application.json` company profiles when the company matches and the profile has usable `source_notes`.
- Reuse `*-apply.json` application routes and visible-question records when the role and company match.
- Browse only to fill missing fields, refresh stale or weakly sourced claims, resolve conflicts, or inspect questions not already captured.
- Do not treat old tailored resume prose as source evidence; only reuse structured records grounded by sources.

Whenever the user answers a question about their career, update `@info.json` before using that answer in fit analysis, resume tailoring, cover letters, or application-page answers.

- Career answers include new or corrected experience, skills, technologies, projects, achievements, metrics, scope, ownership, dates, employers, education, certifications, languages, constraints, or preferences.
- Treat `@info.json` as the durable source of truth for reusable candidate facts. Do not leave new career facts only in chat context or generated `ai/{company}/` files.
- If the answer is only a one-off workflow decision, such as whether to continue after the fit gate, do not store it as a career fact.
- After updating `@info.json`, keep generated `analysis.json`, `application.json`, cover letter, apply answers, TeX, and PDF consistent with the updated source facts.

## Inputs And Follow-Ups

Ask only for information needed to produce truthful, specific materials.

1. Load and review `@info.json` before judging fit or asking evidence questions.
2. Ask the user for the full job description or target role page.
3. Ask the user for the company website URL when it is not clear from the JD.
4. If the JD or company source is incomplete, ask one concise follow-up question to unblock.
5. Before tailoring, ask up to three targeted evidence questions only when answers would materially improve must-have matching, seniority positioning, company-specific motivation, or blocker resolution.
6. Ask a focused clarification before finalizing any claim if timeline, causality, scope, ownership, or seniority wording is unclear.
7. When the user answers any career, evidence, timeline, ownership, seniority, constraint, or preference question, update `@info.json` first, then continue from the updated facts.
8. Do not ask about location, timezone, work model, visa, sponsorship, or work authorization merely because the JD omits them. If the JD is silent, assume the user intentionally supplied a viable remote/application target.
9. Ask about location, timezone, work authorization, visa, or sponsorship only when the JD explicitly states a restriction that may block the candidate.
10. If required qualifications appear missing from `@info.json`, tell the user exactly what is missing, show the closest available evidence, and ask whether they have relevant experience not yet captured.
11. If fit analysis finds a blocker or major gap, state the risk plainly, show the closest available evidence, and stop for the user's decision before generating resume or cover-letter outputs.
12. Do not ask generic preference questions. Every follow-up must say what output it will improve.

## File Naming Rules

- Build `company` as a lowercase ASCII slug of the company name.
- Build `slug` as `{company}-{position}` for the job and company.
- Build `candidate-slug` as a lowercase ASCII slug of the candidate name from `@info.json`.
- Use lowercase ASCII and hyphens only.

Write outputs to:

- `ai/{company}/{slug}-jd.json`
- `ai/{company}/{slug}-analysis.json`
- `ai/{company}/{slug}-application.json`
- `ai/{company}/{slug}-cover-letter.txt`
- `ai/{company}/{slug}-apply.json`
- `latex/{candidate-slug}-{slug}-Resume.tex`
- `applications/{candidate-slug}-{slug}-Resume.pdf`

## Workflow

Follow this sequence exactly. Do not invent new phases.

### Phase 1: Apply Decision

1. Review `@info.json` so candidate evidence, constraints, language, and timezone are known before assessing the JD. If the user has just provided a career answer, update `@info.json` before extracting, analyzing, or tailoring anything.
2. Use `job-description-extraction` to extract the JD into `ai/{company}/{slug}-jd.json`.
3. Use `company-grounding` to check saved company records first, then research what the company does from official sources only as needed, and create or update `ai/{company}/{slug}-application.json` with `company_profile`.
4. Use `job-fit-gate` to build `ai/{company}/{slug}-analysis.json` from `@info.json`, the JD, and `company_profile`.
5. Stop and report in Spanish: what the company does, why the role is or is not a good fit, the strongest evidence, real blockers or major gaps, and whether the candidate should apply. Do not generate the resume, cover letter, PDF, apply link, or application answers until the user explicitly confirms continuing.

### Phase 2: Application Package

Run this phase only after the user confirms they want to apply.

1. Use `grounded-resume-tailoring` to update `ai/{company}/{slug}-application.json` as the tailored English resume JSON while preserving `company_profile`.
2. Use `resume-skim-render` to generate `latex/{candidate-slug}-{slug}-Resume.tex`, edit it for skim speed, and compile the English PDF.
3. Use `cover-letter-bridge` to write `ai/{company}/{slug}-cover-letter.txt` in English.
4. Use `job-application-links` as the final application-discovery stage to check saved application records first, then find the best official application link or inspect the application page only as needed, and write `ai/{company}/{slug}-apply.json` with English answer suggestions for visible application questions.
5. Use `application-preflight` to run behavior tests and the final validation checklist, then fix failures before finishing.

Do not skip the fit-analysis step. Explain blockers and major gaps before generating final resume or cover-letter outputs. Stop after the Phase 1 apply decision and wait for the user. Missing JD location, timezone, work model, visa, sponsorship, or authorization fields are not risks by themselves.

After the user approves Phase 2, the PDF is a required output. Do not stop after writing the JSON. The final handoff should include the official apply link and any English application-answer suggestions discovered by `job-application-links`.
