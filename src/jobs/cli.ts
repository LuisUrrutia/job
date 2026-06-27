#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { openJobStore } from "./store.ts";
import { discoverJobs } from "./discover/index.ts";
import { enrichJobs } from "./enrich/index.ts";
import { analyzeFit } from "./fit/index.ts";
import { researchApplications } from "./application-research/index.ts";
import { buildResumes } from "./resume-build/index.ts";
import { notifyTelegram } from "./telegram-notify/index.ts";
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
  profilePath?: string;
  outputRoot?: string;
  telegramToken?: string;
  telegramChatId?: string;
  telegramMessageThreadId?: string;
}

type ParsedCliOptions = CliOptions & Record<string, string | boolean | undefined>;

async function main(argv: string[]): Promise<void> {
  loadDotEnv();

  const [command, ...rest] = argv;
  const options = parseOptions(rest);

  if (!command || command === "help" || command === "--help" || options.help) {
    printHelp();
    return;
  }

  if (command === "enrich") {
    if (options.output) throw new Error("--output is not supported by jobs enrich. Use --debug-json or --debug-json-dir for debug JSON.");
    if (options.debugJson && options.debugJsonDir) throw new Error("Use either --debug-json or --debug-json-dir, not both.");
    if (options.concurrency) throw new Error("--concurrency is not supported by jobs enrich. Enrichment runs one candidate at a time.");
    const store = openJobStore(options.db || DEFAULT_DB);
    try {
      const logger = createEnrichmentLogger(options.verbose);
      const result = await enrichJobs(store, {
        runner: options.runner || "opencode",
        fixture: options.fixture,
        cwd: options.dir || process.cwd(),
        rawDir: options.debugJsonDir || options.rawDir,
        rawOutputPath: options.debugJson,
        mcpConfig: options.mcpConfig,
        limit: numberOption(options.limit, 25),
        logger
      });
      const rawOutput = result.rawOutputPath ? `; debug JSON ${result.rawOutputPath}` : "; debug JSON not written";
      const skipped = result.skippedCandidates ? `; skipped ${result.skippedCandidates} prompt-injected candidates` : "";
      const rejected = result.rejectedCandidates ? `; rejected ${result.rejectedCandidates} incomplete candidates` : "";
      const failed = result.failedCandidates ? `; failed ${result.failedCandidates} candidates` : "";
      console.log(`Stored enrichment run ${result.runId}; requested ${result.requestedCount} candidates; enriched ${result.candidates.length} candidates${failed}${rejected}${skipped}${rawOutput}`);
    } finally {
      store.close();
    }
    return;
  }

  if (command === "fit") {
    if (options.output) throw new Error("--output is not supported by jobs fit. Use --debug-json or --debug-json-dir for debug JSON.");
    if (options.debugJson && options.debugJsonDir) throw new Error("Use either --debug-json or --debug-json-dir, not both.");
    const store = openJobStore(options.db || DEFAULT_DB);
    try {
      const logger = createFitLogger(options.verbose);
      const result = await analyzeFit(store, {
        runner: options.runner || "opencode",
        fixture: options.fixture,
        cwd: options.dir || process.cwd(),
        rawDir: options.debugJsonDir || options.rawDir,
        rawOutputPath: options.debugJson,
        mcpConfig: options.mcpConfig,
        limit: numberOption(options.limit, 25),
        profilePath: options.profilePath,
        logger
      });
      const rawOutput = result.rawOutputPath ? `; debug JSON ${result.rawOutputPath}` : "; debug JSON not written";
      const failed = result.failedCandidates ? `; failed ${result.failedCandidates} candidates` : "";
      const rejected = result.rejectedAnalyses ? `; rejected ${result.rejectedAnalyses} invalid analyses` : "";
      console.log(`Stored fit run ${result.runId}; requested ${result.requestedCount} candidates; analyzed ${result.analyzedCount} candidates${failed}${rejected}${rawOutput}`);
    } finally {
      store.close();
    }
    return;
  }

  if (command === "research-application") {
    if (options.output) throw new Error("--output is not supported by jobs research-application. Use --debug-json or --debug-json-dir for debug JSON.");
    if (options.debugJson && options.debugJsonDir) throw new Error("Use either --debug-json or --debug-json-dir, not both.");
    const store = openJobStore(options.db || DEFAULT_DB);
    try {
      const logger = createApplicationResearchLogger(options.verbose);
      const result = await researchApplications(store, {
        runner: options.runner || "opencode",
        fixture: options.fixture,
        cwd: options.dir || process.cwd(),
        rawDir: options.debugJsonDir || options.rawDir,
        rawOutputPath: options.debugJson,
        mcpConfig: options.mcpConfig,
        limit: numberOption(options.limit, 25),
        logger
      });
      const rawOutput = result.rawOutputPath ? `; debug JSON ${result.rawOutputPath}` : "; debug JSON not written";
      const failed = result.failedCandidates ? `; failed ${result.failedCandidates} candidates` : "";
      const rejected = result.rejectedResearches ? `; rejected ${result.rejectedResearches} invalid researches` : "";
      console.log(`Stored application research run ${result.runId}; requested ${result.requestedCount} candidates; researched ${result.researchedCount} candidates${failed}${rejected}${rawOutput}`);
    } finally {
      store.close();
    }
    return;
  }

  if (command === "build-resume") {
    if (options.output) throw new Error("--output is not supported by jobs build-resume. Use --output-root for generated artifacts.");
    if (options.debugJson && options.debugJsonDir) throw new Error("Use either --debug-json or --debug-json-dir, not both.");
    if (options.texOnly) throw new Error("--tex-only is not supported by jobs build-resume. It always creates the PDF.");
    const store = openJobStore(options.db || DEFAULT_DB);
    try {
      const logger = createResumeBuildLogger(options.verbose);
      const result = await buildResumes(store, {
        runner: options.runner || "opencode",
        fixture: options.fixture,
        cwd: options.dir || process.cwd(),
        rawDir: options.debugJsonDir || options.rawDir,
        rawOutputPath: options.debugJson,
        mcpConfig: options.mcpConfig,
        limit: numberOption(options.limit, 25),
        profilePath: options.profilePath,
        outputRoot: options.outputRoot,
        logger
      });
      const rawOutput = result.rawOutputPath ? `; debug JSON ${result.rawOutputPath}` : "; debug JSON not written";
      const failed = result.failedCandidates ? `; failed ${result.failedCandidates} candidates` : "";
      const rejected = result.rejectedPackages ? `; rejected ${result.rejectedPackages} invalid packages` : "";
      console.log(`Stored resume build run ${result.runId}; requested ${result.requestedCount} candidates; built ${result.builtCount} resumes${failed}${rejected}${rawOutput}`);
    } finally {
      store.close();
    }
    return;
  }

  if (command === "notify-telegram") {
    if (options.output) throw new Error("--output is not supported by jobs notify-telegram.");
    const store = openJobStore(options.db || DEFAULT_DB);
    try {
      const result = await notifyTelegram(store, {
        token: options.telegramToken,
        chatId: options.telegramChatId,
        messageThreadId: options.telegramMessageThreadId,
        runner: options.runner || "opencode",
        fixture: options.fixture,
        cwd: options.dir || process.cwd(),
        mcpConfig: options.mcpConfig,
        limit: numberOption(options.limit, 25),
        logger: createTelegramLogger(options.verbose)
      });
      const failed = result.failedCount ? `; failed ${result.failedCount} notifications` : "";
      console.log(`Sent Telegram notifications for ${result.notifiedCount}/${result.requestedCount} candidates${failed}`);
      if (result.failedCount > 0) process.exitCode = 1;
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
      const logger = createDiscoveryLogger(options.verbose);
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
      const rejected = result.rejectedCandidates ? `; rejected ${result.rejectedCandidates} incomplete candidates` : "";
      console.log(`Stored run ${result.runId}; normalized ${result.normalizedCount} candidates; saved ${result.candidates.length} candidates${rejected}${skipped}${rawOutput}`);
      return;
    }

    throw new Error(`Unknown command: ${command}`);
  } finally {
    store.close();
  }
}

function loadDotEnv(path = ".env"): void {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;

    process.env[key] = parseDotEnvValue(line.slice(separator + 1).trim());
  }
}

function parseDotEnvValue(value: string): string {
  if (value.length < 2) return value;
  const quote = value[0];
  if ((quote !== "\"" && quote !== "'") || value.at(-1) !== quote) return value;

  const inner = value.slice(1, -1);
  if (quote === "'") return inner;

  return inner
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\");
}

function numberOption(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Expected positive integer, got: ${value}`);
  return parsed;
}

function parseOptions(args: string[]): ParsedCliOptions {
  const options: ParsedCliOptions = {};
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
    if (key === "texOnly") {
      options.texOnly = true;
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

function createDiscoveryLogger(verbose?: boolean): Logger {
  const verboseLogger = createVerboseLogger(verbose);
  if (verboseLogger) return verboseLogger;

  return (message, details) => {
    if (message !== "skipping prompt-injected candidate") return;
    const suffix = details === undefined ? "" : ` ${JSON.stringify(details)}`;
    console.error(`[jobs:defender] ${message}${suffix}`);
  };
}

function createEnrichmentLogger(verbose?: boolean): Logger {
  const verboseLogger = createVerboseLogger(verbose);
  if (verboseLogger) return verboseLogger;

  return (message, details) => {
    const suffix = details === undefined ? "" : ` ${JSON.stringify(details)}`;
    console.error(`[jobs:enrich] ${message}${suffix}`);
  };
}

function createFitLogger(verbose?: boolean): Logger {
  const verboseLogger = createVerboseLogger(verbose);
  if (verboseLogger) return verboseLogger;

  return (message, details) => {
    const suffix = details === undefined ? "" : ` ${JSON.stringify(details)}`;
    console.error(`[jobs:fit] ${message}${suffix}`);
  };
}

function createApplicationResearchLogger(verbose?: boolean): Logger {
  const verboseLogger = createVerboseLogger(verbose);
  if (verboseLogger) return verboseLogger;

  return (message, details) => {
    const suffix = details === undefined ? "" : ` ${JSON.stringify(details)}`;
    console.error(`[jobs:research-application] ${message}${suffix}`);
  };
}

function createResumeBuildLogger(verbose?: boolean): Logger {
  const verboseLogger = createVerboseLogger(verbose);
  if (verboseLogger) return verboseLogger;

  return (message, details) => {
    const suffix = details === undefined ? "" : ` ${JSON.stringify(details)}`;
    console.error(`[jobs:build-resume] ${message}${suffix}`);
  };
}

function createTelegramLogger(verbose?: boolean): Logger | undefined {
  const verboseLogger = createVerboseLogger(verbose);
  if (!verboseLogger) return undefined;
  return verboseLogger;
}

function printHelp(): void {
  console.log(`Usage: npm run jobs -- <command> [options]

Commands:
  discover  Run search-only discovery and persist normalized candidates in SQLite.
  enrich    Enrich stored candidates with JD details and verified website data.
  fit       Analyze enriched candidates and classify apply|weak_apply|dont_apply.
  research-application  Find official apply URLs, company research, and answer drafts.
  build-resume      Generate tailored resume PDFs.
  notify-telegram  Send generated resume PDFs to a Telegram chat/topic.
  process           Stub for handing approved jobs to the downstream application workflow.

Options:
  --db <path>             SQLite path. Default: ${DEFAULT_DB}
  --runner <name>         fixture|opencode|codex|claude. Default: fixture
  --fixture <path>        Fixture JSON path for the fixture runner.
  --prompt-file <path>    Override the built-in discovery prompt template.
  --debug-json <path>     Discover only: optional raw runner JSON file for debugging.
  --debug-json-dir <dir>  Discover only: optional directory for raw runner JSON files.
  --dir <path>            Working directory passed to shell runners.
  --mcp-config <path>     Passed to claude for later MCP-connected runs.
  --limit <n>                    Enrich/fit/research-application/build-resume/notify-telegram only: maximum candidates to process. Default: 25
  --profile-path <path>          Fit/build-resume only: candidate profile JSON. Default: info.json
  --output-root <path>           Build-resume only: artifact root. Default: current directory
  --telegram-token <token>       Notify-telegram only: bot token. Default: TELEGRAM_BOT_TOKEN
  --telegram-chat-id <id>        Notify-telegram only: chat/group ID. Default: TELEGRAM_CHAT_ID
  --telegram-message-thread-id <id> Notify-telegram only: group topic ID. Default: TELEGRAM_MESSAGE_THREAD_ID
  --verbose               Print prompt, runner, normalization, and defense details to stderr.`);
}

main(process.argv.slice(2))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
