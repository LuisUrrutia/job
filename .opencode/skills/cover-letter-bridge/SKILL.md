---
name: cover-letter-bridge
description: Write a short grounded English cover letter for the candidate. Use when the resume workflow needs a 100 to 150 word bridge from resume evidence to a target role.
---

# Cover Letter Bridge

Write `ai/{company}/{slug}-cover-letter.txt` in English as plain text only.

## Steps

1. Identify the primary hiring pain in the JD. Completion criterion: the opening hook can name the role need or company problem in one concrete phrase.
2. Pick the top 1 to 2 resume-backed achievements that address that pain. Completion criterion: each proof point maps to an explicit JD requirement and source-resume evidence.
3. Pick one concrete company detail from the JD or company research. Completion criterion: the detail is direct, JD-only, or an obvious low-risk inference.
4. Draft the letter with a specific hook, employer problem or role need, proof from 1 to 2 achievements, and confident close. Completion criterion: the file exists, stays within 100 to 150 words, uses 3 to 4 short paragraphs, and every sentence is grounded in an allowed source.

## Modern Cover-Letter Heuristics

- Treat the cover letter as the bridge between the resume and this specific job, not a recap of the resume.
- Use a tight four-beat structure: specific hook, employer problem or role need, proof from 1 to 2 achievements, confident close.
- For senior, leadership, remote, client-facing, or communication-heavy roles, a short targeted letter is worth writing even when optional.
- Write for a human skim after the resume screen: short paragraphs, concrete evidence, natural JD language, and no dense autobiography.
- Open with the company's problem, product, customer, market, or hiring pain when possible. Avoid starting with `I am writing to apply`.
- Add one line that proves real company research, preferably from official product, docs, careers, blog, or about pages.
- Do not merely say the candidate has a trait. Show it with a problem solved, system improved, stakeholder served, metric changed, or delivery risk reduced.
- If there is a major gap, frame it as an honest tradeoff and immediately bridge to adjacent evidence. Do not apologize or over-explain.
- The final letter should sound like a sharp email a strong candidate would actually send, not a formal template or AI-generated essay.
- If the user explicitly asks to improve a cover letter using research, check recent reputable guidance, synthesize the learnings, then update the letter without letting generic advice override these grounded-fact rules.

## Requirements

- 100 to 150 words.
- English only.
- 3 to 4 short paragraphs.
- Open with one specific detail from the JD, company, product, stack, customer, or problem. Prefer a problem-shaped hook over a self-introduction.
- Map 1 to 2 strongest qualifications from the source resume to explicit JD requirements with concrete evidence.
- Include one short "why this company" sentence grounded in real research or JD details.
- If a major fit gap exists, name it once and bridge to adjacent evidence instead of hiding it.
- If there is a career transition or gap, frame it as intentional and relevant without apologizing or over-explaining.
- Close calmly with availability to discuss and a clear next-step invitation.
- Use the real company name.
- Do not invent facts.
- Use a confident, direct, non-template voice.
- Do not use the em dash character (`U+2014`).

## Guardrails

- Keep every claim attributable to `@info.json`, persisted user clarification, the JD, or direct company research. If the user answers a career question while drafting the letter, update `@info.json` before using that answer.
- Do not claim missing must-haves. If there is a gap, position adjacent experience and learning velocity instead.
- Keep tense consistent with timeline facts.
- Prefer evidence over adjectives.
- Cut any sentence that could be sent unchanged to another company.
- Avoid template enthusiasm such as `thrilled`, `excited`, `passionate`, or `innovative company` unless the sentence also carries a concrete reason.
- Avoid resume-recapping transitions such as `My experience includes`; lead with the role need and then bring in proof.
- Avoid defensive gap phrasing such as `Even though I do not have`; use direct tradeoff language, for example `My background is stronger in X than Y`.

Final completion criterion: `ai/{company}/{slug}-cover-letter.txt` passes the requirements and guardrails above.
