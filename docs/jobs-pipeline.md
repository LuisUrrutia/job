# Node Jobs Pipeline
# Node Jobs Pipeline

This is the persistence layer for split LinkedIn job discovery. Discovery is search-only: it finds postings, filters by title, and saves stable candidate rows. Enrichment is a separate phase: it reads stored candidates, gets JD/details and company website evidence, then re-upserts the same rows. SQLite is the source of truth; debug JSON files are optional and only for inspection.

## Skill-Driven Discovery

The project skill is the primary discovery interface:

```text
linkedin-job-discovery/SKILL.md
```

Ask the agent to use that skill when you want real LinkedIn discovery. The discovery output should be search-only JSON: title/company/url/source metadata from LinkedIn search results, with no JD/details fetch. Persist it with the bundled helper:

```sh
node linkedin-job-discovery/scripts/persist-discovery.mjs \
  --input path/to/discovery.json \
  --db data/jobs.sqlite
```

## Technical Debug Commands

Use the root package script only for fixture checks or runner debugging:

```sh
npm run jobs -- discover --runner fixture --db data/jobs-dev.sqlite
```

The CLI remains available for technical debug and fixture checks. It exposes six commands:

- `discover`: runs search-only discovery, stores the run in SQLite, normalizes candidates, and upserts them by stable job ID.
- `enrich`: reads stored candidates missing JD text, runs serial detail enrichment, and re-upserts them by stable job ID. A verified company website is saved when available, but missing website evidence does not keep the candidate in enrichment forever.
- `fit`: reads enriched candidates without a fit decision, runs Phase 1 apply-decision triage, and stores `apply`, `weak_apply`, or `dont_apply`.
- `research-application`: reads `apply` candidates and passively inspects public role pages for reusable company research, a role-specific reference URL, and already-visible screening questions. It never starts or advances an application. `weak_apply` candidates remain stored for human review and do not advance automatically.
- `build-resume`: reads researched `apply` candidates, creates the tailored resume PDF, and stores the PDF path.
- `process`: explicit stub for the later phase, where approved researched candidates can feed the existing job-application workflow.

## Module Shape

The pipeline keeps the interface small and puts the implementation behind deep modules:

- `src/jobs/domain.ts`: stable job IDs, LinkedIn numeric ID extraction, URL canonicalization, and content hashes.
- `src/jobs/store.ts`: the SQLite seam. SQL stays local to this module and callers only save runs, save candidates, and list candidates.
- `src/jobs/discover/prompts.ts`: prompt registry and `--prompt-file` override. The default LinkedIn discovery prompt is source-controlled and versioned.
- `src/jobs/agent-run.ts`: the shared Agent run module. It owns runner adapters for `fixture`, `opencode`, `codex`, and `claude`, each returning stdout, stderr, and exit code, plus optional raw output persistence.
- `src/jobs/candidate-intake.ts`: the shared Job candidate intake module. It accepts one or more Agent run outputs, keeps per-run normalization/rejection policy local, dedupes by stable ID, and optionally runs prompt defense before SQLite persistence.
- `src/jobs/enrich/`: prompt and coordinator for serial JD/company-website enrichment.
- `src/jobs/security/prompt-defense.ts`: the prompt-injection defense seam used by Enrichment. It uses `@stackone/defender` behind a small internal interface before enriched JD text reaches SQLite.
- `src/jobs/application-research/`: prompt and coordinator for read-only public role-page inspection, reusable company profile storage, and candidate-specific visible-question notes.
- `src/jobs/cli.ts`: thin command entrypoint.

## Discovery With BrowserMCP In OpenCode

Root `opencode.json` configures `browsermcp` for OpenCode. Install the Chrome extension from https://browsermcp.io/install, restart OpenCode after config changes, open LinkedIn in Chrome, and click `Connect` in the Browser MCP extension for the tab that OpenCode should control.

A real MCP-connected discovery run should use the OpenCode adapter while that tab remains connected:

```sh
npm run jobs -- discover --runner opencode --db data/jobs.sqlite
```

The adapter runs:

```sh
opencode run "<registered discovery prompt>" --dir <repo-dir>
```

The discovery prompt asks the agent to use only `browsermcp_browser_*` tools and return JSON only. BrowserMCP navigates and reads accessibility snapshots from the connected tab; it does not use a LinkedIn API. For real runners, the coordinator launches one run per term: `React`, `Typescript`, `Frontend`, and `full-stack`. Each run should inspect five search pages where LinkedIn supports pagination and filter by publication title. It must not open job details, company profiles, websites, or application pages. The pipeline captures stdout/stderr/exit code in SQLite, stores a debug JSON file only when `--debug-json <file>` or `--debug-json-dir <dir>` is supplied, and sends all successful term outputs through Job candidate intake for merge, normalization, dedupe, and SQLite persistence.

Discovery does not run Defender. It stores complete search-result candidates that align with the prompt. Prompt defense starts in Enrichment, where JD/details text is fetched and treated as untrusted content.

The CLI output reports the normalized candidate count and the saved candidate count. If the normalizer rejects incomplete rows, the message includes the rejected count. In Enrichment, if Defender skips anything, the message includes the skipped count so a low saved total is not confused with a low raw enrichment total.

Use `--verbose` to print the prompt, runner lifecycle, and normalization details to stderr. Enrichment verbose output also includes Defender subprocess/result summaries.

## Serial Enrichment

Run enrichment after discovery:

```sh
npm run jobs -- enrich --runner opencode --db data/jobs.sqlite
```

The enrichment phase selects candidates where `description` or `company_website` is missing. It processes one candidate at a time, capped by `--limit` (default `25`). Each runner gets one stored candidate, navigates to its LinkedIn URL through BrowserMCP, expands the visible JD when needed, and may visit official company evidence to verify the website. The returned candidate JSON goes through the same normalizer plus Defender before SQLite upsert.

## Fit Analysis

Run fit analysis after enrichment:

```sh
npm run jobs -- fit --runner opencode --db data/jobs.sqlite
```

The fit phase selects candidates with a non-empty `description` and no existing `fit_decision`. It loads `info.json` and runs up to five candidate analyses concurrently. OpenCode Fit runs use `openai/gpt-5.6-sol` with the `medium` variant. Fit does not browse or use BrowserMCP; each Agent run uses only the supplied profile and stored candidate. Results are then persisted in candidate order as `fit_decision`, `fit_score`, `fit_summary`, `fit_risks`, and `fit_evidence`. `weak_apply` is reserved for secondary gaps when the core stack is supported. If substantive professional evidence is missing for the role's primary language or framework, normalization forces `dont_apply` and caps the score at 49. This is Phase 1 only: it classifies whether to apply and does not generate resume, cover letter, PDF, apply link, or application-page answers.

## Application Research

Run application research after fit:

```sh
npm run jobs -- research-application --runner opencode --db data/jobs.sqlite
```

The application research phase selects candidates with `fit_decision` equal to `apply` and missing application research. It processes one candidate at a time because its Agent runs share the connected BrowserMCP tab. Candidates classified as `weak_apply` remain in SQLite for human review but do not advance automatically. The phase treats the public role or application page as a read-only source: it stores reusable company facts in `companies`, stores the role-specific `apply_url` as a reference plus visible role-specific screening notes on `candidates`, and stores one row per already-visible application question in `application_questions` with an English answer suggestion plus source-grounded evidence. Screening notes preserve requirements, restrictions, or discrepancies that can improve human fit review or resume tailoring. The agent does not fill fields, select options, upload files, sign in, create an account, or click controls that start or advance an application. If questions require login or form progression, inspection stops. The command never generates resume, cover letter, or PDF artifacts.

## Resume Build

Run resume build after application research:

```sh
npm run jobs -- build-resume --runner opencode --db data/jobs.sqlite
```

The resume build phase selects candidates with `fit_decision` equal to `apply`, an `apply_url`, and company research, then skips rows that already have `resume_generated_at` and `resume_pdf_path` unless `--rebuild-existing` is set. It loads `info.json` and runs up to five candidates concurrently in both the Agent-run stage and the PDF-generation stage. It does not browse or use BrowserMCP. Agent runs and generated package paths are persisted sequentially in candidate order. Each runner receives one candidate plus company research and application questions; its resume JSON is used only as temporary generator input to compile `applications/{candidate-slug}-{slug}-Resume.pdf`. The phase stores `resume_pdf_path` plus `resume_generated_at` on the candidate row. If the PDF exceeds two pages, the generator removes bullet points that are not tied to `resume_bold_phrases` while preserving role headers, dates, tech stacks, and fit-story bullets. Use `--output-root <path>` to write the PDF somewhere other than the current directory.

## Telegram Notification

Run Telegram notification after resume build:

```sh
npm run jobs -- notify-telegram --runner opencode --db data/jobs.sqlite
```

The Telegram phase selects `apply` candidates with an `apply_url` and generated resume PDF that have not been notified. It processes up to five candidates concurrently: each Agent run prepares a summary from stored data without browsing or using BrowserMCP, then the coordinator reads and sends the PDF through Telegram. The aggregate Agent run and candidate notification states are persisted sequentially in candidate order after the external work completes.

Other adapters are available when those CLIs are installed:

```sh
npm run jobs -- discover --runner codex --db data/jobs.sqlite
npm run jobs -- discover --runner claude --db data/jobs.sqlite
```

`codex` receives the prompt on stdin via `codex exec -C <dir> -`. `claude` receives the prompt via `claude --print --output-format json <prompt>`, with `--mcp-config <path>` available for later MCP-connected Claude runs. The normalizer also accepts wrapped agent outputs such as Claude JSON containing a final `result` string.

Use `--prompt-file <path>` to override the built-in prompt without changing the CLI call.

## Identity And Change Detection

Stable candidate identity is owned by code and SQLite:

- LinkedIn numeric job IDs become `linkedin:<id>`.
- LinkedIn numeric job IDs are also stored as `source_job_id` for direct SQLite audits.
- Other candidates become `url:<hash>` from the canonical URL.
- If no URL exists, a last-resort hash uses title, company, and source.

The content hash uses title, company, canonical URL, JD/description, source, and source job ID. Discovery rows usually have empty JD and website fields; enrichment changes the content hash when it fills those fields.

## Local State

Generated local state is ignored by git:

- `data/*.sqlite*`
- `var/jobs/raw-agent-runs*/`

The fixture data in `tests/fixtures/linkedin-discovery.json` is fake sample data and must not be treated as real LinkedIn results.
