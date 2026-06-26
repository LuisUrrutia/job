import { mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import type { ChildProcess } from "node:child_process";
import type { Readable } from "node:stream";
import type { AgentRunResult, AgentRunnerOptions } from "../types.ts";

interface PersistRawRunOptions {
  rawDir?: string;
  outputPath?: string;
}

interface CommandOptions {
  cwd?: string;
  stdin?: string;
}

export async function runDiscoveryAgent(options: AgentRunnerOptions): Promise<AgentRunResult> {
  const runner = options.runner || "fixture";
  if (runner === "fixture") return runFixture(options.fixture);
  if (runner === "opencode") return runCommand("opencode", ["run", options.prompt, "--dir", options.cwd || process.cwd()], { cwd: options.cwd });
  if (runner === "codex") return runCommand("codex", ["exec", "-C", options.cwd, "-"], { cwd: options.cwd, stdin: options.prompt });
  if (runner === "claude") {
    const args = ["--print", "--output-format", "json"];
    if (options.mcpConfig) args.push("--mcp-config", options.mcpConfig);
    args.push(options.prompt);
    return runCommand("claude", args, { cwd: options.cwd });
  }

  throw new Error(`Unknown discovery runner: ${runner}`);
}

export async function persistRawRun(options: PersistRawRunOptions, runId: number, result: AgentRunResult): Promise<string | null> {
  if (!options.rawDir && !options.outputPath) return null;

  const path = resolve(options.outputPath || `${options.rawDir}/${String(runId).padStart(6, "0")}.json`);
  mkdirSync(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(result, null, 2));
  return path;
}

async function runFixture(fixturePath = "tests/fixtures/linkedin-discovery.json"): Promise<AgentRunResult> {
  const stdout = await readFile(fixturePath, "utf8");
  return { stdout, stderr: "", exitCode: 0 };
}

async function runCommand(command: string, args: string[], options: CommandOptions): Promise<AgentRunResult> {
  const child = spawn(command, args, {
    cwd: options.cwd,
    stdio: [options.stdin ? "pipe" : "ignore", "pipe", "pipe"]
  });

  if (options.stdin) {
    if (!child.stdin) throw new Error(`${command} stdin was not available.`);
    child.stdin.end(options.stdin);
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    streamToText(child.stdout),
    streamToText(child.stderr),
    waitForExit(child)
  ]);

  return { stdout, stderr, exitCode };
}

function streamToText(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => { output += chunk; });
    stream.on("error", reject);
    stream.on("end", () => resolve(output));
  });
}

function waitForExit(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve(code ?? signalToExitCode(signal));
    });
  });
}

function signalToExitCode(signal: NodeJS.Signals | null): number {
  if (!signal) return 1;
  return 128 + (signal === "SIGABRT" ? 6 : 1);
}
