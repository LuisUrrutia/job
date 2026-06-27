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
- `enrich`: reads stored candidates missing JD or website fields, runs serial detail enrichment, and re-upserts them by stable job ID.
- `fit`: reads enriched candidates without a fit decision, runs Phase 1 apply-decision triage, and stores `apply`, `weak_apply`, or `dont_apply`.
- `research-application`: reads `apply`/`weak_apply` candidates, stores reusable company research, stores the role-specific apply URL, and saves answer drafts for visible application questions.
- `build-resume`: reads researched `apply`/`weak_apply` candidates, creates the tailored resume PDF, and stores the PDF path.
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
- `src/jobs/application-research/`: prompt and coordinator for official apply URL lookup, reusable company profile storage, and candidate-specific application answer drafts.
- `src/jobs/cli.ts`: thin command entrypoint.

## Discovery With LinkedIn MCP Access

Root `opencode.json` already configures `mcp-server-linkedin` for opencode. A real MCP-connected discovery run should use the opencode adapter:

```sh
npm run jobs -- discover --runner opencode --db data/jobs.sqlite
```

The adapter runs:

```sh
opencode run "<registered discovery prompt>" --dir <repo-dir>
```

The discovery prompt asks the agent to use only `mcp-server-linkedin_search_jobs` and return JSON only. For real runners, the coordinator launches one run per term: `React`, `Typescript`, `Frontend`, and `full-stack`. Each run should inspect three search pages where LinkedIn supports it and filter by publication title. It must not fetch JD/details, company profiles, websites, or application pages. The pipeline captures stdout/stderr/exit code in SQLite, stores a debug JSON file only when `--debug-json <file>` or `--debug-json-dir <dir>` is supplied, and sends all successful term outputs through Job candidate intake for merge, normalization, dedupe, and SQLite persistence.

Discovery does not run Defender. It stores complete search-result candidates that align with the prompt. Prompt defense starts in Enrichment, where JD/details text is fetched and treated as untrusted content.

The CLI output reports the normalized candidate count and the saved candidate count. If the normalizer rejects incomplete rows, the message includes the rejected count. In Enrichment, if Defender skips anything, the message includes the skipped count so a low saved total is not confused with a low raw enrichment total.

Use `--verbose` to print the prompt, runner lifecycle, and normalization details to stderr. Enrichment verbose output also includes Defender subprocess/result summaries.

## Serial Enrichment

Run enrichment after discovery:

```sh
npm run jobs -- enrich --runner opencode --db data/jobs.sqlite
```

The enrichment phase selects candidates where `description` or `company_website` is missing. It processes one candidate at a time, capped by `--limit` (default `25`). Each runner gets one stored candidate and may call `mcp-server-linkedin_get_job_details` plus company/official-site evidence tools. The returned candidate JSON goes through the same normalizer plus Defender before SQLite upsert.

## Fit Analysis

Run fit analysis after enrichment:

```sh
npm run jobs -- fit --runner opencode --db data/jobs.sqlite
```

The fit phase selects candidates with both `description` and `company_website` filled and no existing `fit_decision`. It loads `info.json`, sends one candidate at a time to the runner, and persists `fit_decision`, `fit_score`, `fit_summary`, `fit_risks`, and `fit_evidence` on the candidate row. This is Phase 1 only: it classifies whether to apply and does not generate resume, cover letter, PDF, apply link, or application-page answers.

## Application Research

Run application research after fit:

```sh
npm run jobs -- research-application --runner opencode --db data/jobs.sqlite
```

The application research phase selects candidates with `fit_decision` equal to `apply` or `weak_apply` and missing application research. It stores reusable company facts in `companies`, stores the role-specific `apply_url` on `candidates`, and stores one row per visible application question in `application_questions` with an English answer suggestion plus source-grounded evidence. These answers are references for human review; the command never submits an application and never generates resume, cover letter, or PDF artifacts.

## Resume Build

Run resume build after application research:

```sh
npm run jobs -- build-resume --runner opencode --db data/jobs.sqlite
```

The resume build phase selects candidates with `fit_decision` equal to `apply` or `weak_apply`, an `apply_url`, and company research, then skips rows that already have `resume_generated_at` and `resume_pdf_path`. It loads `info.json`, sends one candidate plus company research and application questions to the runner, uses the returned resume JSON only as temporary generator input, compiles `applications/{candidate-slug}-{slug}-Resume.pdf`, and stores `resume_pdf_path` plus `resume_generated_at` on the candidate row. Use `--output-root <path>` to write the PDF somewhere other than the current directory.

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
