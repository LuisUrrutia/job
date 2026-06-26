import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

export async function runDiscoveryAgent(options) {
  const runner = options.runner || "fixture";
  if (runner === "fixture") return runFixture(options.fixture);
  if (runner === "opencode") return runCommand("opencode", ["run", options.prompt, "--dir", options.cwd], { cwd: options.cwd });
  if (runner === "codex") return runCommand("codex", ["exec", "-C", options.cwd, "-"], { cwd: options.cwd, stdin: options.prompt });
  if (runner === "claude") {
    const args = ["--print", "--output-format", "json"];
    if (options.mcpConfig) args.push("--mcp-config", options.mcpConfig);
    args.push(options.prompt);
    return runCommand("claude", args, { cwd: options.cwd });
  }

  throw new Error(`Unknown discovery runner: ${runner}`);
}

export async function persistRawRun(rawDir, runId, result) {
  mkdirSync(rawDir, { recursive: true });
  const path = resolve(rawDir, `${String(runId).padStart(6, "0")}.json`);
  await Bun.write(path, JSON.stringify(result, null, 2));
  return path;
}

async function runFixture(fixturePath = "tests/fixtures/linkedin-discovery.json") {
  const stdout = await Bun.file(fixturePath).text();
  return { stdout, stderr: "", exitCode: 0 };
}

async function runCommand(command, args, options) {
  const process = Bun.spawn([command, ...args], {
    cwd: options.cwd,
    stdin: options.stdin ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe"
  });

  if (options.stdin) {
    process.stdin.write(options.stdin);
    process.stdin.end();
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited
  ]);

  return { stdout, stderr, exitCode };
}
