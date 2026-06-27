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

The CLI remains available for technical debug and fixture checks. It exposes three commands:

- `discover`: runs search-only discovery, stores the run in SQLite, normalizes candidates, and upserts them by stable job ID.
- `enrich`: reads stored candidates missing JD or website fields, runs serial detail enrichment, and re-upserts them by stable job ID.
- `process`: explicit stub for the later phase, where approved enriched candidates can feed the existing job-application workflow.

## Module Shape

The pipeline keeps the interface small and puts the implementation behind deep modules:

- `src/jobs/domain.ts`: stable job IDs, LinkedIn numeric ID extraction, URL canonicalization, and content hashes.
- `src/jobs/store.ts`: the SQLite seam. SQL stays local to this module and callers only save runs, save candidates, and list candidates.
- `src/jobs/discover/prompts.ts`: prompt registry and `--prompt-file` override. The default LinkedIn discovery prompt is source-controlled and versioned.
- `src/jobs/discover/runners.ts`: adapters for `fixture`, `opencode`, `codex`, and `claude`, each returning stdout, stderr, and exit code.
- `src/jobs/discover/normalizer.ts`: accepts JSON-only agent output and turns it into stored candidate rows.
- `src/jobs/enrich/`: prompt and coordinator for serial JD/company-website enrichment.
- `src/jobs/security/prompt-defense.ts`: the prompt-injection defense seam. It uses `@stackone/defender` behind a small internal interface before candidates reach SQLite.
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

The discovery prompt asks the agent to use only `mcp-server-linkedin_search_jobs` and return JSON only. For real runners, the coordinator launches one run per term: `React`, `Typescript`, `Frontend`, and `full-stack`. Each run should inspect three search pages where LinkedIn supports it and filter by publication title. It must not fetch JD/details, company profiles, websites, or application pages. The pipeline captures stdout/stderr/exit code in SQLite, stores a debug JSON file only when `--debug-json <file>` or `--debug-json-dir <dir>` is supplied, preserves per-term output in a `searchRuns` ledger, merges all term outputs, dedupes by stable ID, and normalizes candidates into SQLite.

Normalized candidates are defended before persistence with `@stackone/defender`. High-risk prompt injection skips only that candidate while preserving the run in SQLite for audit and allowing other safe candidates to continue. If debug JSON was requested, the raw runner JSON is preserved too. The default guard enables Defender Tier 1 and Tier 2. Tier 2 runs in an isolated Node subprocess so native ONNX teardown cannot abort the main Node CLI after a valid result is returned. Set `JOBS_DEFENDER_TIER2=0` to disable Tier 2 for one run.

The CLI output reports the normalized candidate count and the saved candidate count. If the normalizer rejects incomplete rows, the message includes the rejected count. If Defender skips anything, the message includes the skipped count so a low saved total is not confused with a low raw discovery total.

Use `--verbose` to print the prompt, runner lifecycle, normalization details, and Defender subprocess/result summaries to stderr.

## Serial Enrichment

Run enrichment after discovery:

```sh
npm run jobs -- enrich --runner opencode --db data/jobs.sqlite
```

The enrichment phase selects candidates where `description` or `company_website` is missing. It processes one candidate at a time, capped by `--limit` (default `25`). Each runner gets one stored candidate and may call `mcp-server-linkedin_get_job_details` plus company/official-site evidence tools. The returned candidate JSON goes through the same normalizer, Defender, and SQLite upsert path as discovery.

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
