#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { openJobStore } from "../../src/jobs/store.ts";
import { normalizeDiscoveryOutput } from "../../src/jobs/discover/normalizer.ts";
import { defendDiscoveryCandidates } from "../../src/jobs/security/prompt-defense.ts";

const DEFAULT_DB = "data/jobs.sqlite";
const DEFAULT_RUNNER = "skill:linkedin-job-discovery";
const PROMPT_VERSION = "skill:linkedin-job-discovery@2026-06-26";

main(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help || !options.input) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  const inputPath = resolve(options.input);
  const dbPath = options.db || DEFAULT_DB;
  const raw = await readFile(inputPath, "utf8");
  const normalized = normalizeDiscoveryOutput(raw);
  const defense = await defendDiscoveryCandidates(normalized, { logger: options.verbose ? log : undefined });
  const store = openJobStore(dbPath);

  try {
    const runId = store.saveAgentRun({
      runner: options.runner || DEFAULT_RUNNER,
      promptVersion: options.promptVersion || PROMPT_VERSION,
      prompt: options.prompt || "LinkedIn MCP discovery performed by linkedin-job-discovery skill.",
      stdout: raw,
      stderr: options.stderr || "",
      exitCode: 0,
      rawOutputPath: inputPath
    });
    store.saveRunRawOutputPath(runId, inputPath);
    store.saveCandidates(runId, defense.candidates);

    console.log(JSON.stringify({
      runId,
      dbPath,
      rawOutputPath: inputPath,
      normalized: normalized.length,
      saved: defense.candidates.length,
      skipped: defense.skipped.length,
      skippedIds: defense.skipped.map((candidate) => candidate.id)
    }, null, 2));
  } finally {
    store.close();
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--input") options.input = readValue(argv, ++index, arg);
    else if (arg === "--db") options.db = readValue(argv, ++index, arg);
    else if (arg === "--runner") options.runner = readValue(argv, ++index, arg);
    else if (arg === "--prompt-version") options.promptVersion = readValue(argv, ++index, arg);
    else if (arg === "--prompt") options.prompt = readValue(argv, ++index, arg);
    else if (arg === "--stderr") options.stderr = readValue(argv, ++index, arg);
    else if (arg === "--verbose") options.verbose = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

function readValue(argv, index, option) {
  const value = argv[index];
  if (!value) throw new Error(`${option} requires a value`);
  return value;
}

function log(label, value) {
  if (value === undefined) console.error(`[linkedin-job-discovery] ${label}`);
  else console.error(`[linkedin-job-discovery] ${label}`, JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log(`Usage: node linkedin-job-discovery/scripts/persist-discovery.mjs --input discovery.json [options]

Options:
  --input <path>           JSON file containing { candidates: [...] }.
  --db <path>              SQLite DB path. Default: data/jobs.sqlite
  --runner <name>          Agent/run label. Default: skill:linkedin-job-discovery
  --prompt-version <text>  Prompt version stored in agent_runs.
  --prompt <text>          Prompt text stored in agent_runs.
  --stderr <text>          Optional MCP/tool-call evidence stored in agent_runs.stderr.
  --verbose                Print Defender details to stderr.
`);
}
