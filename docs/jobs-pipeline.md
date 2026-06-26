# Bun Jobs Pipeline

This is the first slice of a Bun-powered job pipeline. It discovers job candidates, stores raw agent output, normalizes stable candidate rows, and renders `Jobs.md` from SQLite. `Jobs.md` is generated output, not the source of truth.

## Commands

Run through the root package script:

```sh
bun run jobs discover --runner fixture --db data/jobs-dev.sqlite
bun run jobs report --db data/jobs-dev.sqlite --output reports/jobs-fixture.md
```

The CLI exposes four commands:

- `discover`: runs a discovery adapter, saves raw run data, normalizes candidates, and upserts them by stable job ID.
- `report`: reads stored candidates and generates Markdown, defaulting to root `Jobs.md` unless `--output` is supplied.
- `enrich`: explicit stub for the next phase, where stored candidates will receive deeper company/JD details.
- `process`: explicit stub for the later phase, where approved enriched candidates can feed the existing job-application workflow.

## Module Shape

The pipeline keeps the interface small and puts the implementation behind deep modules:

- `src/jobs/domain.js`: stable job IDs, LinkedIn numeric ID extraction, URL canonicalization, and content hashes.
- `src/jobs/store.js`: the SQLite seam. SQL stays local to this module and callers only save runs, save candidates, and list candidates.
- `src/jobs/discover/prompts.js`: prompt registry and `--prompt-file` override. The default LinkedIn discovery prompt is source-controlled and versioned.
- `src/jobs/discover/runners.js`: adapters for `fixture`, `opencode`, `codex`, and `claude`, each returning stdout, stderr, and exit code.
- `src/jobs/discover/normalizer.js`: accepts JSON-only agent output and turns it into stored candidate rows.
- `src/jobs/report.js`: renders Markdown from queryable candidates.
- `src/jobs/cli.js`: thin command entrypoint.

## Discovery With LinkedIn MCP Access

Root `opencode.json` already configures `mcp-server-linkedin` for opencode. A real MCP-connected discovery run should use the opencode adapter:

```sh
bun run jobs discover --runner opencode --db data/jobs.sqlite
```

The adapter runs:

```sh
opencode run "<registered discovery prompt>" --dir <repo-dir>
```

The discovery prompt asks the agent to use LinkedIn MCP access and return JSON only. It must include the true hiring company, official company website, and publisher company when the LinkedIn publisher differs from the hiring company. The agent does not need to edit files; the pipeline captures stdout/stderr/exit code, stores the raw run under `var/jobs/raw-agent-runs/`, and normalizes candidates into SQLite.

Other adapters are available when those CLIs are installed:

```sh
bun run jobs discover --runner codex --db data/jobs.sqlite
bun run jobs discover --runner claude --db data/jobs.sqlite
```

`codex` receives the prompt on stdin via `codex exec -C <dir> -`. `claude` receives the prompt via `claude --print --output-format json <prompt>`, with `--mcp-config <path>` available for later MCP-connected Claude runs. The normalizer also accepts wrapped agent outputs such as Claude JSON containing a final `result` string.

Use `--prompt-file <path>` to override the built-in prompt without changing the CLI call.

## Identity And Change Detection

Stable candidate identity is owned by code and SQLite:

- LinkedIn numeric job IDs become `linkedin:<id>`.
- Other candidates become `url:<hash>` from the canonical URL.
- If no URL exists, a last-resort hash uses title, company, and source.

The content hash uses title, company, canonical URL, JD/description, source, and source job ID. That gives a later enrichment phase a simple way to detect changed postings without treating generated Markdown as state.

## Local State

Generated local state is ignored by git:

- `data/*.sqlite*`
- `var/jobs/raw-agent-runs*/`

The fixture data in `tests/fixtures/linkedin-discovery.json` is fake sample data and must not be treated as real LinkedIn results.
