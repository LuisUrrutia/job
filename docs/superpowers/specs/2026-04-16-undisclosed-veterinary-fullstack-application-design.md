# Undisclosed Veterinary Fullstack Application Design

## Goal

Create a tailored application package for a Fullstack Developer contract role with an undisclosed US veterinary teleradiology client, using the approved balanced-tailoring approach and grounded updates to `info.json`.

## Confirmed Inputs

- Position: Fullstack Developer
- Work model: Remote, EU / EEA timezone aligned
- Employment type: Full-time contract
- Client: Undisclosed end client described in the JD as a US veterinary teleradiology provider
- Company website: Not available
- User-approved source corrections to persist in `info.json`:
  - Add `MSSQL` to Vitamina Holding
  - Add `MongoDB` to Resit SPA
  - Add `Claude` and `Cursor` to OpenZeppelin

## Constraints

- Do not invent company facts because the end client is unnamed.
- Company research will be limited to JD-derived facts and explicitly labeled as such.
- Do not overstate database ownership, AI-tool usage, or healthcare domain expertise.
- Keep all tailoring grounded in `info.json` plus user clarifications.
- Preserve dates, timelines, and canonical skills inventory in the JSON output.

## Tailoring Strategy

### Source update

Persist the user-provided corrections in `info.json` before generating downstream files so the tailored outputs inherit the corrected source profile.

### Fit analysis

Generate `jd.json` and `analysis.json` first. Explicitly evaluate the match against:

- 10+ years of fullstack experience
- Node.js and React
- REST APIs
- relational and NoSQL databases
- AWS and Terraform
- migration from legacy architecture
- architectural ownership
- modern AI tools such as Claude and Cursor

Call out any remaining uncertainty, especially limited official company research due to the undisclosed client.

### Resume focus

Prioritize evidence in this order:

1. 12+ years of professional experience
2. React, Node.js, Express.js, and full-stack delivery
3. PostgreSQL, MSSQL, MongoDB, and database optimization relevance
4. AWS, Terraform, Docker, and Kubernetes
5. legacy modernization, migration, and architectural decision-making
6. collaboration with product and data-adjacent teams

De-emphasize low-signal Web3 details unless they add clear backend, platform, or seniority signal.

### Output set

Produce:

- `ai/{company}/{slug}-jd.json`
- `ai/{company}/{slug}-analysis.json`
- `ai/{company}/{slug}-application.json`
- `ai/{company}/{slug}-cover-letter.txt`
- `latex/Luis-Urrutia-{slug}-Resume.tex`
- `applications/Luis-Urrutia-{slug}-Resume.pdf`

Use a placeholder company identity derived from the JD, such as `Undisclosed Veterinary Teleradiology Provider`, unless later evidence identifies the client.

## Validation Focus

- Every JD must-have maps to explicit resume evidence or is marked missing.
- No technologies appear in bullets unless present in the corresponding role tech array.
- No em dash characters remain.
- TeX is edited for skim speed before PDF compilation.
- PDF page count is checked and compact itemize spacing is applied if needed.

## Notes

- This spec records the approved approach only.
- Per repository policy, no git commit will be created unless the user explicitly asks for one.
