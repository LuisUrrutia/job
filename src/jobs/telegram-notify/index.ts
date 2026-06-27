import { basename } from "node:path";
import { readFile } from "node:fs/promises";
import { runAgent } from "../agent-run.ts";
import { linkedInTelegramSummaryPrompt, renderTelegramSummaryPrompt } from "./prompts.ts";
import type { AgentRunResult, AgentRunner, ApplicationQuestion, CompanyResearch, JobStore, Logger, StoredJobCandidate } from "../types.ts";

export interface TelegramNotifyOptions {
  token?: string;
  chatId?: string;
  messageThreadId?: string;
  runner?: string;
  fixture?: string;
  cwd?: string;
  mcpConfig?: string;
  limit?: number;
  fetcher?: typeof fetch;
  runAgent?: AgentRunner;
  logger?: Logger;
}

export interface TelegramNotificationResult {
  requestedCount: number;
  notifiedCount: number;
  failedCount: number;
  notifications: TelegramCandidateNotification[];
  failures: TelegramNotificationFailure[];
}

export interface TelegramCandidateNotification {
  candidateId: string;
  title: string;
  company: string;
  resumePdfPath: string;
}

export interface TelegramNotificationFailure extends TelegramCandidateNotification {
  error: string;
}

interface TelegramSummaryRun extends AgentRunResult {
  candidate: StoredJobCandidate;
  company: CompanyResearch | null;
  questions: ApplicationQuestion[];
  prompt: string;
  summary: string;
}

export async function notifyTelegram(store: JobStore, options: TelegramNotifyOptions = {}): Promise<TelegramNotificationResult> {
  const token = requiredOption(options.token ?? process.env.TELEGRAM_BOT_TOKEN, "TELEGRAM_BOT_TOKEN");
  const chatId = requiredOption(options.chatId ?? process.env.TELEGRAM_CHAT_ID, "TELEGRAM_CHAT_ID");
  const messageThreadId = optionalOption(options.messageThreadId ?? process.env.TELEGRAM_MESSAGE_THREAD_ID);
  const send = options.fetcher ?? fetch;
  const log = options.logger ?? noop;
  const candidates = store.listCandidatesForTelegramNotification(options.limit ?? 25);
  const summaryRuns: TelegramSummaryRun[] = [];
  const notifications: TelegramCandidateNotification[] = [];
  const failures: TelegramNotificationFailure[] = [];

  for (const candidate of candidates) {
    const notification = notificationFromCandidate(candidate);
    log("building Telegram summary", notification);
    try {
      const summaryRun = await summarizeCandidateForTelegram(store, candidate, options);
      summaryRuns.push(summaryRun);
      log("sending Telegram resume", notification);
      await sendTelegramDocument({ token, chatId, messageThreadId, candidate, caption: summaryRun.summary, fetcher: send });
      store.markTelegramNotified(candidate.id);
      notifications.push(notification);
    } catch (error) {
      failures.push({ ...notification, error: errorMessage(error) });
    }
  }

  if (summaryRuns.length > 0) {
    store.saveAgentRun({
      runner: options.runner || "opencode",
      promptVersion: linkedInTelegramSummaryPrompt.version,
      prompt: summaryRuns.map((run) => `# ${run.candidate.id}\n${run.prompt}`).join("\n\n"),
      stdout: JSON.stringify({ summaries: summaryRuns.map((run) => ({ candidateId: run.candidate.id, summary: run.summary })) }),
      stderr: summaryRuns.map((run) => run.stderr).filter(Boolean).join("\n"),
      exitCode: summaryRuns.some((run) => run.exitCode !== 0) ? 1 : 0,
      rawOutputPath: null
    });
  }

  return {
    requestedCount: candidates.length,
    notifiedCount: notifications.length,
    failedCount: failures.length,
    notifications,
    failures
  };
}

async function sendTelegramDocument(options: {
  token: string;
  chatId: string;
  messageThreadId: string;
  candidate: StoredJobCandidate;
  fetcher: typeof fetch;
  caption: string;
}): Promise<void> {
  const resumePdfPath = requiredResumePath(options.candidate);
  const body = new FormData();
  body.set("chat_id", options.chatId);
  if (options.messageThreadId) body.set("message_thread_id", options.messageThreadId);
  body.set("caption", captionForCandidate(options.candidate, options.caption));
  const bytes = await readFile(resumePdfPath);
  body.set("document", new Blob([bytes], { type: "application/pdf" }), basename(resumePdfPath));

  const response = await options.fetcher(`https://api.telegram.org/bot${options.token}/sendDocument`, {
    method: "POST",
    body
  });

  if (!response.ok) {
    throw new Error(await telegramError(response));
  }

  const payload = await response.json().catch(() => null) as { ok?: unknown } | null;
  if (!payload || payload.ok !== true) {
    throw new Error("Telegram sendDocument returned an invalid success payload.");
  }
}

async function summarizeCandidateForTelegram(store: JobStore, candidate: StoredJobCandidate, options: TelegramNotifyOptions): Promise<TelegramSummaryRun> {
  const company = candidate.companyId ? store.getCompanyResearch(candidate.companyId) : null;
  const questions = store.listApplicationQuestions(candidate.id);
  const prompt = renderTelegramSummaryPrompt(linkedInTelegramSummaryPrompt, candidate, company, questions);
  const agent = options.runAgent || runAgent;
  const result = await agent({
    runner: options.runner || "opencode",
    fixture: options.fixture,
    prompt,
    cwd: options.cwd,
    mcpConfig: options.mcpConfig
  });
  const summary = normalizeSummary(result.stdout);
  if (result.exitCode !== 0) throw new Error(`Telegram summary runner exited ${result.exitCode}: ${compactText(result.stderr || result.stdout)}`);
  if (!summary) throw new Error("Telegram summary runner returned an empty summary.");
  return { candidate, company, questions, prompt, summary, ...result };
}

function captionForCandidate(candidate: StoredJobCandidate, summary: string): string {
  const applyLine = candidate.applyUrl ? `Apply: ${candidate.applyUrl}` : "";
  const fitLine = candidate.fitScore == null ? "" : `Fit: ${candidate.fitScore}`;
  return appendWithinTelegramLimit(summary, [applyLine, fitLine]);
}

function appendWithinTelegramLimit(summary: string, extraLines: string[]): string {
  let caption = summary.slice(0, 1024);
  for (const line of extraLines.filter(Boolean)) {
    const next = `${caption}\n${line}`;
    if (next.length <= 1024) caption = next;
  }
  return caption;
}

function normalizeSummary(value: string): string {
  return value.trim().replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").slice(0, 950);
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 240);
}

function notificationFromCandidate(candidate: StoredJobCandidate): TelegramCandidateNotification {
  return {
    candidateId: candidate.id,
    title: candidate.title,
    company: candidate.company,
    resumePdfPath: requiredResumePath(candidate)
  };
}

function requiredResumePath(candidate: StoredJobCandidate): string {
  const path = candidate.resumePdfPath?.trim();
  if (!path) throw new Error(`Candidate ${candidate.id} has no resume PDF path.`);
  return path;
}

function requiredOption(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required.`);
  return trimmed;
}

function optionalOption(value: string | undefined): string {
  return value?.trim() ?? "";
}

async function telegramError(response: Response): Promise<string> {
  const status = response.status;
  const text = await response.text().catch(() => "");
  if (!text) return `Telegram sendDocument failed with HTTP ${status}.`;
  try {
    const payload = JSON.parse(text) as { description?: unknown };
    if (typeof payload.description === "string" && payload.description.trim()) {
      return `Telegram sendDocument failed with HTTP ${status}: ${payload.description}`;
    }
  } catch {
    // Keep the raw response only when Telegram did not return JSON.
  }
  return `Telegram sendDocument failed with HTTP ${status}: ${text.slice(0, 240)}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function noop(): void {}
