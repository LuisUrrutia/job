export interface PromptTemplate {
  name: string;
  version: string;
  template: string;
}

export interface RawJobCandidate extends Record<string, unknown> {
  title?: unknown;
  company?: unknown;
  hiringCompany?: unknown;
  companyWebsite?: unknown;
  company_website?: unknown;
  publisherCompany?: unknown;
  publisher_company?: unknown;
  url?: unknown;
  linkedinUrl?: unknown;
  source?: unknown;
  sourceJobId?: unknown;
  linkedinJobId?: unknown;
  location?: unknown;
  remoteScope?: unknown;
  remote_scope?: unknown;
  employmentType?: unknown;
  employment_type?: unknown;
  salaryRange?: unknown;
  salary_range?: unknown;
  postedAt?: unknown;
  posted_at?: unknown;
  description?: unknown;
  jd?: unknown;
  verificationNote?: unknown;
  verification_note?: unknown;
}

export interface JobIdentityInput {
  title?: unknown;
  company?: unknown;
  companyWebsite?: unknown;
  publisherCompany?: unknown;
  url?: unknown;
  jd?: unknown;
  description?: unknown;
  source?: unknown;
  sourceJobId?: unknown;
  linkedinJobId?: unknown;
}

export interface JobCandidate {
  id: string;
  contentHash: string;
  title: string;
  company: string;
  companyWebsite: string;
  publisherCompany: string;
  url: string;
  source: string;
  sourceJobId: string;
  location: string;
  remoteScope: string;
  employmentType: string;
  salaryRange: string;
  postedAt: string;
  description: string;
  verificationNote: string;
  rawJson: string;
}

export interface StoredJobCandidate extends Omit<JobCandidate, "rawJson"> {
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export interface AgentRunRecord {
  runner: string;
  promptVersion: string;
  prompt: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  rawOutputPath: string | null;
}

export interface JobStore {
  saveAgentRun(run: AgentRunRecord): number;
  saveRunRawOutputPath(runId: number, rawOutputPath: string): void;
  saveCandidates(runId: number, candidates: JobCandidate[]): void;
  listCandidates(): StoredJobCandidate[];
  listCandidatesForEnrichment(limit?: number): StoredJobCandidate[];
  countCandidates(): number;
  close(): void;
}

export interface AgentRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface AgentRunnerOptions {
  runner?: string;
  fixture?: string;
  prompt: string;
  cwd?: string;
  mcpConfig?: string;
}

export type AgentRunner = (options: AgentRunnerOptions) => Promise<AgentRunResult>;
export type Logger = (message: string, details?: unknown) => void;

export interface DiscoveryOptions {
  runner: string;
  fixture?: string;
  promptFile?: string;
  cwd?: string;
  rawDir?: string;
  rawOutputPath?: string;
  mcpConfig?: string;
  searchTerms?: string[];
  runAgent?: AgentRunner;
  logger?: Logger;
}

export interface DiscoveryResult {
  runId: number;
  rawOutputPath: string | null;
  normalizedCount: number;
  dedupedCount: number;
  skippedCandidates: number;
  candidates: JobCandidate[];
}

export interface EnrichmentOptions {
  runner: string;
  fixture?: string;
  cwd?: string;
  rawDir?: string;
  rawOutputPath?: string;
  mcpConfig?: string;
  limit?: number;
  concurrency?: number;
  runAgent?: AgentRunner;
  logger?: Logger;
}

export interface EnrichmentResult {
  runId: number;
  rawOutputPath: string | null;
  requestedCount: number;
  normalizedCount: number;
  skippedCandidates: number;
  candidates: JobCandidate[];
}
