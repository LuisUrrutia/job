import type { CandidateRejection, JobCandidate } from "./types.ts";

export interface RunLedgerEntry {
  label: string;
  ledgerFields: Record<string, string>;
  exitCode: number;
  stdout: string;
  stderr: string;
  candidates: JobCandidate[];
  rejectedCandidates: CandidateRejection[];
  normalizationError: string | null;
}

export interface RunLedger {
  stdout: string;
  stderr: string;
  exitCode: number;
  candidates: JobCandidate[];
  rejectedCandidates: CandidateRejection[];
}

export function buildRunLedger(recordsKey: string, entries: RunLedgerEntry[]): RunLedger {
  const candidates = entries.flatMap((entry) => entry.candidates);
  const rejectedCandidates = entries.flatMap((entry) => entry.rejectedCandidates);
  const firstRunnerFailure = entries.find((entry) => entry.exitCode !== 0);
  const firstInvalidOutput = entries.find((entry) => entry.normalizationError);

  return {
    stdout: JSON.stringify({
      candidates,
      [recordsKey]: entries.map(ledgerRecord)
    }),
    stderr: entries.map(formatEntryStderr).filter(Boolean).join("\n\n"),
    exitCode: firstRunnerFailure?.exitCode ?? (firstInvalidOutput ? 1 : 0),
    candidates,
    rejectedCandidates
  };
}

function ledgerRecord(entry: RunLedgerEntry): Record<string, unknown> {
  return {
    ...entry.ledgerFields,
    exitCode: entry.exitCode,
    stdout: entry.stdout,
    stderr: entry.stderr,
    rejectedCandidates: entry.rejectedCandidates,
    normalizationError: entry.normalizationError
  };
}

function formatEntryStderr(entry: RunLedgerEntry): string {
  const lines = [];
  if (entry.stderr.trim()) lines.push(entry.stderr.trim());
  if (entry.normalizationError) lines.push(`Normalization error: ${entry.normalizationError}`);
  if (entry.exitCode !== 0 && lines.length === 0) lines.push("Runner exited without stderr.");
  if (lines.length === 0) return "";
  return `# ${entry.label} (exit ${entry.exitCode})\n${lines.join("\n")}`;
}
