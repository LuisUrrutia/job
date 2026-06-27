import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import type { AgentRunRecord, JobCandidate, JobStore, StoredJobCandidate } from "./types.ts";

export function openJobStore(dbPath = "data/jobs.sqlite"): JobStore {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runner TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      prompt TEXT NOT NULL,
      stdout TEXT NOT NULL,
      stderr TEXT NOT NULL,
      exit_code INTEGER NOT NULL,
      raw_output_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      company_website TEXT,
      publisher_company TEXT,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      source_job_id TEXT,
      location TEXT,
      remote_scope TEXT,
      employment_type TEXT,
      salary_range TEXT,
      posted_at TEXT,
      description TEXT,
      verification_note TEXT,
      raw_json TEXT NOT NULL,
      first_seen_run_id INTEGER NOT NULL REFERENCES agent_runs(id),
      last_seen_run_id INTEGER NOT NULL REFERENCES agent_runs(id),
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  ensureColumn(db, "candidates", "company_website", "TEXT");
  ensureColumn(db, "candidates", "publisher_company", "TEXT");
  ensureColumn(db, "candidates", "source_job_id", "TEXT");
  db.exec("UPDATE candidates SET source_job_id = substr(id, 10) WHERE (source_job_id IS NULL OR source_job_id = '') AND id LIKE 'linkedin:%'");

  const insertRun = db.prepare(`
    INSERT INTO agent_runs (runner, prompt_version, prompt, stdout, stderr, exit_code, raw_output_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING id
  `);

  const upsertCandidate = db.prepare(`
    INSERT INTO candidates (
      id, content_hash, title, company, company_website, publisher_company,
      url, source, source_job_id, location, remote_scope,
      employment_type, salary_range, posted_at, description, verification_note,
      raw_json, first_seen_run_id, last_seen_run_id
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      content_hash = excluded.content_hash,
      title = excluded.title,
      company = excluded.company,
      company_website = excluded.company_website,
      publisher_company = excluded.publisher_company,
      url = excluded.url,
      source = excluded.source,
      source_job_id = excluded.source_job_id,
      location = excluded.location,
      remote_scope = excluded.remote_scope,
      employment_type = excluded.employment_type,
      salary_range = excluded.salary_range,
      posted_at = excluded.posted_at,
      description = excluded.description,
      verification_note = excluded.verification_note,
      raw_json = excluded.raw_json,
      last_seen_run_id = excluded.last_seen_run_id,
      last_seen_at = datetime('now')
  `);

  const updateRunPath = db.prepare("UPDATE agent_runs SET raw_output_path = ? WHERE id = ?");
  const begin = db.prepare("BEGIN");
  const commit = db.prepare("COMMIT");
  const rollback = db.prepare("ROLLBACK");

  return {
    saveAgentRun(run: AgentRunRecord): number {
      const row = requiredRow(insertRun.get(
        run.runner,
        run.promptVersion,
        run.prompt,
        run.stdout,
        run.stderr,
        run.exitCode,
        run.rawOutputPath
      ), "inserted agent run");
      return numberColumn(row, "id");
    },

    saveRunRawOutputPath(runId: number, rawOutputPath: string): void {
      updateRunPath.run(rawOutputPath, runId);
    },

    saveCandidates(runId: number, candidates: JobCandidate[]): void {
      begin.run();
      try {
        for (const candidate of candidates) {
          upsertCandidate.run(
            candidate.id,
            candidate.contentHash,
            candidate.title,
            candidate.company,
            candidate.companyWebsite,
            candidate.publisherCompany,
            candidate.url,
            candidate.source,
            candidate.sourceJobId,
            candidate.location,
            candidate.remoteScope,
            candidate.employmentType,
            candidate.salaryRange,
            candidate.postedAt,
            candidate.description,
            candidate.verificationNote,
            candidate.rawJson,
            runId,
            runId
          );
        }
        commit.run();
      } catch (error) {
        rollback.run();
        throw error;
      }
    },

    listCandidates(): StoredJobCandidate[] {
      return db.prepare(`
        SELECT id, content_hash AS contentHash, title, company,
          company_website AS companyWebsite, publisher_company AS publisherCompany,
          url, source, source_job_id AS sourceJobId,
          location, remote_scope AS remoteScope, employment_type AS employmentType,
          salary_range AS salaryRange, posted_at AS postedAt, description,
          verification_note AS verificationNote, first_seen_at AS firstSeenAt,
          last_seen_at AS lastSeenAt
        FROM candidates
        ORDER BY
          CASE WHEN salary_range IS NULL OR salary_range = '' THEN 1 ELSE 0 END,
          posted_at DESC,
          company ASC,
          title ASC
      `).all().map((row) => storedCandidateFromRow(row));
    },

    listCandidatesForEnrichment(limit = 25): StoredJobCandidate[] {
      return db.prepare(`
        SELECT id, content_hash AS contentHash, title, company,
          company_website AS companyWebsite, publisher_company AS publisherCompany,
          url, source, source_job_id AS sourceJobId,
          location, remote_scope AS remoteScope, employment_type AS employmentType,
          salary_range AS salaryRange, posted_at AS postedAt, description,
          verification_note AS verificationNote, first_seen_at AS firstSeenAt,
          last_seen_at AS lastSeenAt
        FROM candidates
        WHERE description IS NULL OR description = '' OR company_website IS NULL OR company_website = ''
        ORDER BY last_seen_at DESC, company ASC, title ASC
        LIMIT ?
      `).all(limit).map((row) => storedCandidateFromRow(row));
    },

    countCandidates(): number {
      const row = requiredRow(db.prepare("SELECT count(*) AS count FROM candidates").get(), "candidate count");
      return numberColumn(row, "count");
    },

    close(): void {
      db.close();
    }
  };
}

function ensureColumn(db: DatabaseSyncType, tableName: string, columnName: string, columnType: string): void {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (rows.some((row) => textColumn(row, "name") === columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
}

function storedCandidateFromRow(row: Record<string, unknown>): StoredJobCandidate {
  return {
    id: requiredTextColumn(row, "id"),
    contentHash: requiredTextColumn(row, "contentHash"),
    title: requiredTextColumn(row, "title"),
    company: requiredTextColumn(row, "company"),
    companyWebsite: textColumn(row, "companyWebsite"),
    publisherCompany: textColumn(row, "publisherCompany"),
    url: requiredTextColumn(row, "url"),
    source: requiredTextColumn(row, "source"),
    sourceJobId: textColumn(row, "sourceJobId"),
    location: textColumn(row, "location"),
    remoteScope: textColumn(row, "remoteScope"),
    employmentType: textColumn(row, "employmentType"),
    salaryRange: textColumn(row, "salaryRange"),
    postedAt: textColumn(row, "postedAt"),
    description: textColumn(row, "description"),
    verificationNote: textColumn(row, "verificationNote"),
    firstSeenAt: textColumn(row, "firstSeenAt"),
    lastSeenAt: textColumn(row, "lastSeenAt")
  };
}

function requiredRow(row: Record<string, unknown> | undefined, context: string): Record<string, unknown> {
  if (!row) throw new Error(`Expected row for ${context}.`);
  return row;
}

function requiredTextColumn(row: Record<string, unknown>, columnName: string): string {
  const value = row[columnName];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  throw new Error(`Expected text column ${columnName}.`);
}

function textColumn(row: Record<string, unknown>, columnName: string): string {
  const value = row[columnName];
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  throw new Error(`Expected text column ${columnName}.`);
}

function numberColumn(row: Record<string, unknown>, columnName: string): number {
  const value = row[columnName];
  if (typeof value === "number") return value;
  if (typeof value === "bigint" || typeof value === "string") return Number(value);
  throw new Error(`Expected numeric column ${columnName}.`);
}
