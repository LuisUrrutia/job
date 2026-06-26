#!/usr/bin/env node
import { openJobStore } from "./store.ts";
import { discoverJobs } from "./discover/index.ts";
import { enrichJobs } from "./enrich/index.ts";
import type { Logger } from "./types.ts";

const DEFAULT_DB = "data/jobs.sqlite";

interface CliOptions {
  help?: boolean;
  verbose?: boolean;
  db?: string;
  runner?: string;
  fixture?: string;
  promptFile?: string;
  debugJson?: string;
  debugJsonDir?: string;
  rawDir?: string;
  dir?: string;
  mcpConfig?: string;
  output?: string;
  limit?: string;
  concurrency?: string;
}

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  const options = parseOptions(rest);

  if (!command || command === "help" || command === "--help" || options.help) {
    printHelp();
    return;
  }

  if (command === "enrich") {
    if (options.output) throw new Error("--output is not supported by jobs enrich. Use --debug-json or --debug-json-dir for debug JSON.");
    if (options.debugJson && options.debugJsonDir) throw new Error("Use either --debug-json or --debug-json-dir, not both.");
    const store = openJobStore(options.db || DEFAULT_DB);
    try {
      const logger = createVerboseLogger(options.verbose);
      const result = await enrichJobs(store, {
        runner: options.runner || "opencode",
        fixture: options.fixture,
        cwd: options.dir || process.cwd(),
        rawDir: options.debugJsonDir || options.rawDir,
        rawOutputPath: options.debugJson,
        mcpConfig: options.mcpConfig,
        limit: numberOption(options.limit, 25),
        concurrency: numberOption(options.concurrency, 4),
        logger
      });
      const rawOutput = result.rawOutputPath ? `; debug JSON ${result.rawOutputPath}` : "; debug JSON not written";
      const skipped = result.skippedCandidates ? `; skipped ${result.skippedCandidates} prompt-injected candidates` : "";
      console.log(`Stored enrichment run ${result.runId}; requested ${result.requestedCount} candidates; enriched ${result.candidates.length} candidates${skipped}${rawOutput}`);
    } finally {
      store.close();
    }
    return;
  }

  if (command === "process") {
    console.log("process is the next phase: it will hand selected enriched candidates to the existing job-application workflow after explicit user approval.");
    return;
  }

  const store = openJobStore(options.db || DEFAULT_DB);
  try {
    if (command === "discover") {
      if (options.output) throw new Error("--output is not supported by jobs discover. Use --debug-json or --debug-json-dir for debug JSON.");
      if (options.debugJson && options.debugJsonDir) throw new Error("Use either --debug-json or --debug-json-dir, not both.");
      const logger = createVerboseLogger(options.verbose);
      const result = await discoverJobs(store, {
        runner: options.runner || "fixture",
        fixture: options.fixture,
        promptFile: options.promptFile,
        cwd: options.dir || process.cwd(),
        rawDir: options.debugJsonDir || options.rawDir,
        rawOutputPath: options.debugJson,
        mcpConfig: options.mcpConfig,
        logger
      });
      const rawOutput = result.rawOutputPath ? `; debug JSON ${result.rawOutputPath}` : "; debug JSON not written";
      const skipped = result.skippedCandidates ? `; skipped ${result.skippedCandidates} prompt-injected candidates` : "";
      console.log(`Stored run ${result.runId}; normalized ${result.normalizedCount} candidates; saved ${result.candidates.length} candidates${skipped}${rawOutput}`);
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } finally {
    store.close();
  }
}

function numberOption(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Expected positive integer, got: ${value}`);
  return parsed;
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (key === "help") {
      options.help = true;
      continue;
    }
    if (key === "verbose") {
      options.verbose = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function createVerboseLogger(enabled?: boolean): Logger | undefined {
  if (!enabled) return undefined;

  return (message, details) => {
    console.error(`[jobs:verbose] ${message}`);
    if (details === undefined) return;
    if (typeof details === "string") {
      console.error(details);
      return;
    }
    console.error(JSON.stringify(details, null, 2));
  };
}

function printHelp(): void {
  console.log(`Usage: npm run jobs -- <command> [options]

Commands:
  discover  Run search-only discovery and persist normalized candidates in SQLite.
  enrich    Enrich stored candidates with JD details and verified website data.
  process   Stub for handing approved jobs to the downstream application workflow.

Options:
  --db <path>             SQLite path. Default: ${DEFAULT_DB}
  --runner <name>         fixture|opencode|codex|claude. Default: fixture
  --fixture <path>        Fixture JSON path for the fixture runner.
  --prompt-file <path>    Override the built-in discovery prompt template.
  --debug-json <path>     Discover only: optional raw runner JSON file for debugging.
  --debug-json-dir <dir>  Discover only: optional directory for raw runner JSON files.
  --dir <path>            Working directory passed to shell runners.
  --mcp-config <path>     Passed to claude for later MCP-connected runs.
  --limit <n>             Enrich only: maximum stored candidates to enrich. Default: 25
  --concurrency <n>       Enrich only: concurrent enrichment runners. Default: 4
  --verbose               Print prompt, runner, normalization, and defense details to stderr.`);
}

main(process.argv.slice(2))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
