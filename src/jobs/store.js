import { Database } from "bun:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

export function openJobStore(dbPath = "data/jobs.sqlite") {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
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

  const insertRun = db.query(`
    INSERT INTO agent_runs (runner, prompt_version, prompt, stdout, stderr, exit_code, raw_output_path)
    VALUES ($runner, $promptVersion, $prompt, $stdout, $stderr, $exitCode, $rawOutputPath)
    RETURNING id
  `);

  const upsertCandidate = db.query(`
    INSERT INTO candidates (
      id, content_hash, title, company, company_website, publisher_company,
      url, source, location, remote_scope,
      employment_type, salary_range, posted_at, description, verification_note,
      raw_json, first_seen_run_id, last_seen_run_id
    ) VALUES (
      $id, $contentHash, $title, $company, $companyWebsite, $publisherCompany,
      $url, $source, $location, $remoteScope,
      $employmentType, $salaryRange, $postedAt, $description, $verificationNote,
      $rawJson, $runId, $runId
    )
    ON CONFLICT(id) DO UPDATE SET
      content_hash = excluded.content_hash,
      title = excluded.title,
      company = excluded.company,
      company_website = excluded.company_website,
      publisher_company = excluded.publisher_company,
      url = excluded.url,
      source = excluded.source,
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

  const updateRunPath = db.query("UPDATE agent_runs SET raw_output_path = $rawOutputPath WHERE id = $id");

  return {
    saveAgentRun(run) {
      const row = insertRun.get({
        $runner: run.runner,
        $promptVersion: run.promptVersion,
        $prompt: run.prompt,
        $stdout: run.stdout,
        $stderr: run.stderr,
        $exitCode: run.exitCode,
        $rawOutputPath: run.rawOutputPath
      });
      return Number(row.id);
    },

    saveRunRawOutputPath(runId, rawOutputPath) {
      updateRunPath.run({ $id: runId, $rawOutputPath: rawOutputPath });
    },

    saveCandidates(runId, candidates) {
      const save = db.transaction((items) => {
        for (const candidate of items) {
          upsertCandidate.run({
            $id: candidate.id,
            $contentHash: candidate.contentHash,
            $title: candidate.title,
            $company: candidate.company,
            $companyWebsite: candidate.companyWebsite,
            $publisherCompany: candidate.publisherCompany,
            $url: candidate.url,
            $source: candidate.source,
            $location: candidate.location,
            $remoteScope: candidate.remoteScope,
            $employmentType: candidate.employmentType,
            $salaryRange: candidate.salaryRange,
            $postedAt: candidate.postedAt,
            $description: candidate.description,
            $verificationNote: candidate.verificationNote,
            $rawJson: candidate.rawJson,
            $runId: runId
          });
        }
      });
      save(candidates);
    },

    listCandidates() {
      return db.query(`
        SELECT id, content_hash AS contentHash, title, company,
          company_website AS companyWebsite, publisher_company AS publisherCompany,
          url, source,
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
      `).all();
    },

    countCandidates() {
      const row = db.query("SELECT count(*) AS count FROM candidates").get();
      return Number(row.count);
    },

    close() {
      db.close();
    }
  };
}

function ensureColumn(db, tableName, columnName, columnType) {
  const rows = db.query(`PRAGMA table_info(${tableName})`).all();
  if (rows.some((row) => row.name === columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
}
