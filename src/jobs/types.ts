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

export type CandidateRejectionReason = "missing-title" | "missing-company" | "missing-url";

export interface CandidateRejection {
  index: number;
  reasons: CandidateRejectionReason[];
  title: string;
  company: string;
  url: string;
  source: string;
  sourceJobId: string;
}

export interface CandidateNormalizationReport {
  candidates: JobCandidate[];
  rejected: CandidateRejection[];
}

export type FitDecision = "apply" | "weak_apply" | "dont_apply";

export type PipelineState = "needs_enrichment" | "enriched" | "fit_analyzed" | "application_researched" | "resume_built" | "telegram_notified";

export interface StoredJobCandidate extends Omit<JobCandidate, "rawJson"> {
  firstSeenAt?: string;
  lastSeenAt?: string;
  pipelineState?: PipelineState | "";
  fitDecision?: FitDecision | "";
  fitScore?: number | null;
  fitSummary?: string;
  fitRisks?: string;
  fitEvidence?: string;
  fitAnalyzedAt?: string;
  companyId?: string;
  applyUrl?: string;
  applyUrlSource?: string;
  applyResearchedAt?: string;
  resumePdfPath?: string;
  resumeGeneratedAt?: string;
  telegramNotifiedAt?: string;
}

export interface CompanyResearch {
  id: string;
  name: string;
  canonicalWebsite: string;
  linkedinCompanyId: string;
  linkedinUrl: string;
  description: string;
  mission: string;
  vision: string;
  productsServices: string[];
  businessModel: string;
  markets: string[];
  sourceNotes: string;
  sourceUrls: string[];
}

export interface ApplicationQuestion {
  id: string;
  candidateId: string;
  question: string;
  questionType: string;
  required: boolean;
  answerSuggestion: string;
  answerLanguage: string;
  evidence: string[];
  riskNotes: string[];
  sourceUrl: string;
}

export interface ApplicationResearch {
  candidateId: string;
  company: CompanyResearch;
  applyUrl: string;
  applyUrlSource: string;
  questions: ApplicationQuestion[];
}

export interface ResumePackage {
  candidateId: string;
  resumePdfPath: string;
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

export interface FitRunAnalysis {
  id: string;
  decision: FitDecision;
  score: number;
  summary: string;
  risks: string[];
  evidence: string[];
}

export interface JobStore {
  saveAgentRun(run: AgentRunRecord): number;
  saveRunRawOutputPath(runId: number, rawOutputPath: string): void;
  saveCandidates(runId: number, candidates: JobCandidate[]): void;
  saveFitAnalyses(runId: number, analyses: FitRunAnalysis[]): void;
  saveApplicationResearch(runId: number, researches: ApplicationResearch[]): void;
  saveResumePackages(runId: number, packages: ResumePackage[]): void;
  getCompanyResearch(companyId: string): CompanyResearch | null;
  listCandidates(): StoredJobCandidate[];
  listCandidatesForEnrichment(limit?: number): StoredJobCandidate[];
  listCandidatesForFit(limit?: number): StoredJobCandidate[];
  listCandidatesForApplicationResearch(limit?: number): StoredJobCandidate[];
  listCandidatesForResumeBuild(limit?: number): StoredJobCandidate[];
  listApplicationQuestions(candidateId: string): ApplicationQuestion[];
  listCandidatesForTelegramNotification(limit?: number): StoredJobCandidate[];
  markTelegramNotified(candidateId: string): void;
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
  rejectedCandidates: number;
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
  runAgent?: AgentRunner;
  logger?: Logger;
}

export interface EnrichmentResult {
  runId: number;
  rawOutputPath: string | null;
  requestedCount: number;
  normalizedCount: number;
  failedCandidates: number;
  rejectedCandidates: number;
  skippedCandidates: number;
  candidates: JobCandidate[];
}

export interface FitOptions {
  runner: string;
  fixture?: string;
  cwd?: string;
  rawDir?: string;
  rawOutputPath?: string;
  mcpConfig?: string;
  limit?: number;
  profilePath?: string;
  runAgent?: AgentRunner;
  logger?: Logger;
}

export interface FitResult {
  runId: number;
  rawOutputPath: string | null;
  requestedCount: number;
  analyzedCount: number;
  failedCandidates: number;
  rejectedAnalyses: number;
  analyses: FitRunAnalysis[];
}

export interface ApplicationResearchOptions {
  runner: string;
  fixture?: string;
  cwd?: string;
  rawDir?: string;
  rawOutputPath?: string;
  mcpConfig?: string;
  limit?: number;
  runAgent?: AgentRunner;
  logger?: Logger;
}

export interface ApplicationResearchResult {
  runId: number;
  rawOutputPath: string | null;
  requestedCount: number;
  researchedCount: number;
  failedCandidates: number;
  rejectedResearches: number;
  researches: ApplicationResearch[];
}

export type ResumeGenerator = (options: {
  input: string;
  output: string;
  outputTex: string;
  profilePath: string;
}) => Promise<unknown>;

export interface ResumeBuildOptions {
  runner: string;
  fixture?: string;
  cwd?: string;
  rawDir?: string;
  rawOutputPath?: string;
  mcpConfig?: string;
  limit?: number;
  profilePath?: string;
  outputRoot?: string;
  runAgent?: AgentRunner;
  generateResume?: ResumeGenerator;
  logger?: Logger;
}

export interface ResumeBuildResult {
  runId: number;
  rawOutputPath: string | null;
  requestedCount: number;
  builtCount: number;
  failedCandidates: number;
  rejectedPackages: number;
  packages: ResumePackage[];
}

export type TelegramFetch = (url: string, init: { method: "POST"; body: FormData }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export interface TelegramNotifyOptions {
  botToken?: string;
  chatId?: string;
  limit?: number;
  cwd?: string;
  fetch?: TelegramFetch;
  logger?: Logger;
}

export interface TelegramNotifyResult {
  requestedCount: number;
  sentCount: number;
  failedCandidates: number;
  skippedCandidates: number;
}
