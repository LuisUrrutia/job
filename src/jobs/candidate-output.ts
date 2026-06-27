import { normalizeDiscoveryOutputWithReport } from "./discover/normalizer.ts";
import type { AgentRunResult, CandidateRejection, JobCandidate } from "./types.ts";

export interface NormalizedCandidateOutput {
  candidates: JobCandidate[];
  rejected: CandidateRejection[];
  normalizationError: string | null;
}

export function normalizeCandidateOutput(run: AgentRunResult): NormalizedCandidateOutput {
  if (run.exitCode !== 0) {
    return { candidates: [], rejected: [], normalizationError: null };
  }

  try {
    const report = normalizeDiscoveryOutputWithReport(run.stdout);
    return { candidates: report.candidates, rejected: report.rejected, normalizationError: null };
  } catch (error) {
    return { candidates: [], rejected: [], normalizationError: errorMessage(error) };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
