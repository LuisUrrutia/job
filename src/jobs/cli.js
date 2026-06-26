#!/usr/bin/env bun
import { openJobStore } from "./store.js";
import { discoverJobs } from "./discover/index.js";
import { writeJobsReport } from "./report.js";

const DEFAULT_DB = "data/jobs.sqlite";
const DEFAULT_RAW_DIR = "var/jobs/raw-agent-runs";

async function main(argv) {
  const [command, ...rest] = argv;
  const options = parseOptions(rest);

  if (!command || command === "help" || options.help) {
    printHelp();
    return;
  }

  if (command === "enrich") {
    console.log("enrich is the next phase: it will read stored candidates, gather company/JD details, and prepare downstream application evidence without changing ai/, latex/, or applications/ yet.");
    return;
  }

  if (command === "process") {
    console.log("process is the next phase: it will hand selected enriched candidates to the existing job-application workflow after explicit user approval.");
    return;
  }

  const store = openJobStore(options.db || DEFAULT_DB);
  try {
    if (command === "discover") {
      const result = await discoverJobs(store, {
        runner: options.runner || "fixture",
        fixture: options.fixture,
        promptFile: options.promptFile,
        cwd: options.dir || process.cwd(),
        rawDir: options.rawDir || DEFAULT_RAW_DIR,
        mcpConfig: options.mcpConfig
      });
      console.log(`Stored run ${result.runId}; normalized ${result.candidates.length} candidates; raw output ${result.rawOutputPath}`);
      return;
    }

    if (command === "report") {
      const result = await writeJobsReport(store, options.output || "Jobs.md");
      console.log(`Wrote ${result.count} candidates to ${result.outputPath}`);
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } finally {
    store.close();
  }
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (key === "help") {
      options.help = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function printHelp() {
  console.log(`Usage: bun run jobs <command> [options]

Commands:
  discover  Run a discovery runner and persist raw output plus normalized candidates.
  report    Generate Jobs.md, or another path with --output, from stored candidates.
  enrich    Stub for the next enrichment phase.
  process   Stub for handing approved jobs to the downstream application workflow.

Options:
  --db <path>             SQLite path. Default: ${DEFAULT_DB}
  --runner <name>         fixture|opencode|codex|claude. Default: fixture
  --fixture <path>        Fixture JSON path for the fixture runner.
  --prompt-file <path>    Override the built-in discovery prompt template.
  --raw-dir <path>        Raw run JSON directory. Default: ${DEFAULT_RAW_DIR}
  --dir <path>            Working directory passed to shell runners.
  --mcp-config <path>     Passed to claude for later MCP-connected runs.
  --output <path>         Report output path. Default: Jobs.md`);
}

main(Bun.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
