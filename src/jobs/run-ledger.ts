import type { JobCandidate } from "./types.ts";

export interface RunLedgerEntry<RecordShape extends Record<string, unknown>> {
  label: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  prompt: string;
  record: RecordShape;
}

export interface RunLedger {
  stdout: string;
  stderr: string;
  prompt: string;
}

export function buildRunLedger<RecordShape extends Record<string, unknown>>({
  candidates,
  runKey,
  entries
}: {
  candidates: JobCandidate[];
  runKey: string;
  entries: RunLedgerEntry<RecordShape>[];
}): RunLedger {
  const records = entries.map((entry) => entry.record);

  return {
    stdout: JSON.stringify({
      candidates,
      [runKey]: records
    }),
    stderr: runLedgerStderr(entries),
    prompt: runLedgerPrompt(entries)
  };
}

function runLedgerPrompt(entries: RunLedgerEntry<Record<string, unknown>>[]): string {
  return entries.map((entry) => [
    `# ${entry.label}`,
    `Exit code: ${entry.exitCode}`,
    entry.prompt
  ].join("\n")).join("\n\n");
}

function runLedgerStderr(entries: RunLedgerEntry<Record<string, unknown>>[]): string {
  return entries
    .filter((entry) => entry.stderr || entry.exitCode !== 0)
    .map((entry) => [
      `# ${entry.label}`,
      `Exit code: ${entry.exitCode}`,
      entry.stderr.trim()
    ].filter(Boolean).join("\n"))
    .join("\n\n");
}
