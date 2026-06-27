import { DatabaseSync } from "node:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import type { AgentRunRecord, ApplicationQuestion, ApplicationResearch, CompanyResearch, FitDecision, FitRunAnalysis, JobCandidate, JobStore, PipelineState, ResumePackage, StoredJobCandidate } from "./types.ts";

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
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      pipeline_state TEXT NOT NULL DEFAULT 'needs_enrichment'
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      canonical_website TEXT,
      linkedin_company_id TEXT,
      linkedin_url TEXT,
      description TEXT,
      mission TEXT,
      vision TEXT,
      products_services TEXT NOT NULL,
      business_model TEXT,
      markets TEXT NOT NULL,
      source_notes TEXT NOT NULL,
      source_urls TEXT NOT NULL,
      researched_run_id INTEGER REFERENCES agent_runs(id),
      researched_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS application_questions (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      question_type TEXT,
      required INTEGER NOT NULL DEFAULT 0,
      answer_suggestion TEXT NOT NULL,
      answer_language TEXT NOT NULL DEFAULT 'en',
      evidence_json TEXT NOT NULL,
      risk_notes_json TEXT NOT NULL,
      source_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  ensureColumn(db, "candidates", "company_website", "TEXT");
  ensureColumn(db, "candidates", "publisher_company", "TEXT");
  ensureColumn(db, "candidates", "source_job_id", "TEXT");
  ensureColumn(db, "candidates", "pipeline_state", "TEXT NOT NULL DEFAULT 'needs_enrichment'");
  ensureColumn(db, "candidates", "fit_decision", "TEXT");
  ensureColumn(db, "candidates", "fit_score", "INTEGER");
  ensureColumn(db, "candidates", "fit_summary", "TEXT");
  ensureColumn(db, "candidates", "fit_risks", "TEXT");
  ensureColumn(db, "candidates", "fit_evidence", "TEXT");
  ensureColumn(db, "candidates", "fit_analyzed_run_id", "INTEGER");
  ensureColumn(db, "candidates", "fit_analyzed_at", "TEXT");
  ensureColumn(db, "candidates", "company_id", "TEXT");
  ensureColumn(db, "candidates", "apply_url", "TEXT");
  ensureColumn(db, "candidates", "apply_url_source", "TEXT");
  ensureColumn(db, "candidates", "apply_researched_run_id", "INTEGER");
  ensureColumn(db, "candidates", "apply_researched_at", "TEXT");
  ensureColumn(db, "candidates", "resume_pdf_path", "TEXT");
  ensureColumn(db, "candidates", "resume_generated_run_id", "INTEGER");
  ensureColumn(db, "candidates", "resume_generated_at", "TEXT");
  ensureColumn(db, "candidates", "telegram_notified_at", "TEXT");
  db.exec("UPDATE candidates SET source_job_id = substr(id, 10) WHERE (source_job_id IS NULL OR source_job_id = '') AND id LIKE 'linkedin:%'");
  db.exec(`
    UPDATE candidates
    SET pipeline_state = CASE
      WHEN telegram_notified_at IS NOT NULL AND telegram_notified_at != '' THEN 'telegram_notified'
      WHEN resume_generated_at IS NOT NULL AND resume_generated_at != '' THEN 'resume_built'
      WHEN apply_researched_at IS NOT NULL AND apply_researched_at != '' THEN 'application_researched'
      WHEN fit_decision IS NOT NULL AND fit_decision != '' THEN 'fit_analyzed'
      WHEN description IS NOT NULL AND description != '' AND company_website IS NOT NULL AND company_website != '' THEN 'enriched'
      ELSE 'needs_enrichment'
    END
    WHERE pipeline_state IS NULL OR pipeline_state = '' OR pipeline_state = 'discovered'
  `);

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
  const refreshCandidatePipelineState = db.prepare(`
    UPDATE candidates
    SET pipeline_state = CASE
      WHEN telegram_notified_at IS NOT NULL AND telegram_notified_at != '' THEN 'telegram_notified'
      WHEN resume_generated_at IS NOT NULL AND resume_generated_at != '' THEN 'resume_built'
      WHEN apply_researched_at IS NOT NULL AND apply_researched_at != '' THEN 'application_researched'
      WHEN fit_decision IS NOT NULL AND fit_decision != '' THEN 'fit_analyzed'
      WHEN description IS NOT NULL AND description != '' AND company_website IS NOT NULL AND company_website != '' THEN 'enriched'
      ELSE 'needs_enrichment'
    END
    WHERE id = ?
  `);

  const updateRunPath = db.prepare("UPDATE agent_runs SET raw_output_path = ? WHERE id = ?");
  const updateFitAnalysis = db.prepare(`
    UPDATE candidates
    SET fit_decision = ?,
      fit_score = ?,
      fit_summary = ?,
      fit_risks = ?,
      fit_evidence = ?,
      fit_analyzed_run_id = ?,
      fit_analyzed_at = datetime('now'),
      pipeline_state = 'fit_analyzed'
    WHERE id = ?
  `);
  const upsertCompany = db.prepare(`
    INSERT INTO companies (
      id, name, canonical_website, linkedin_company_id, linkedin_url,
      description, mission, vision, products_services, business_model,
      markets, source_notes, source_urls, researched_run_id, researched_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      canonical_website = excluded.canonical_website,
      linkedin_company_id = excluded.linkedin_company_id,
      linkedin_url = excluded.linkedin_url,
      description = excluded.description,
      mission = excluded.mission,
      vision = excluded.vision,
      products_services = excluded.products_services,
      business_model = excluded.business_model,
      markets = excluded.markets,
      source_notes = excluded.source_notes,
      source_urls = excluded.source_urls,
      researched_run_id = excluded.researched_run_id,
      researched_at = excluded.researched_at,
      updated_at = datetime('now')
  `);
  const updateApplicationResearch = db.prepare(`
    UPDATE candidates
    SET company_id = ?,
      apply_url = ?,
      apply_url_source = ?,
      apply_researched_run_id = ?,
      apply_researched_at = datetime('now'),
      pipeline_state = 'application_researched'
    WHERE id = ?
  `);
  const deleteApplicationQuestions = db.prepare("DELETE FROM application_questions WHERE candidate_id = ?");
  const insertApplicationQuestion = db.prepare(`
    INSERT INTO application_questions (
      id, candidate_id, question, question_type, required, answer_suggestion,
      answer_language, evidence_json, risk_notes_json, source_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      candidate_id = excluded.candidate_id,
      question = excluded.question,
      question_type = excluded.question_type,
      required = excluded.required,
      answer_suggestion = excluded.answer_suggestion,
      answer_language = excluded.answer_language,
      evidence_json = excluded.evidence_json,
      risk_notes_json = excluded.risk_notes_json,
      source_url = excluded.source_url,
      updated_at = datetime('now')
  `);
  const updateResumePackage = db.prepare(`
    UPDATE candidates
    SET resume_pdf_path = ?,
      resume_generated_run_id = ?,
      resume_generated_at = datetime('now'),
      pipeline_state = CASE WHEN telegram_notified_at IS NOT NULL AND telegram_notified_at != '' THEN 'telegram_notified' ELSE 'resume_built' END
    WHERE id = ?
  `);
  const updateTelegramNotification = db.prepare(`
    UPDATE candidates
    SET telegram_notified_at = datetime('now'),
      pipeline_state = 'telegram_notified'
    WHERE id = ?
  `);
  const getCompany = db.prepare(`
    SELECT id, name, canonical_website AS canonicalWebsite,
      linkedin_company_id AS linkedinCompanyId, linkedin_url AS linkedinUrl,
      description, mission, vision, products_services AS productsServices,
      business_model AS businessModel, markets, source_notes AS sourceNotes,
      source_urls AS sourceUrls
    FROM companies
    WHERE id = ?
  `);
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
          refreshCandidatePipelineState.run(candidate.id);
        }
        commit.run();
      } catch (error) {
        rollback.run();
        throw error;
      }
    },

    saveFitAnalyses(runId: number, analyses: FitRunAnalysis[]): void {
      begin.run();
      try {
        for (const analysis of analyses) {
          updateFitAnalysis.run(
            analysis.decision,
            analysis.score,
            analysis.summary,
            JSON.stringify(analysis.risks),
            JSON.stringify(analysis.evidence),
            runId,
            analysis.id
          );
        }
        commit.run();
      } catch (error) {
        rollback.run();
        throw error;
      }
    },

    saveApplicationResearch(runId: number, researches: ApplicationResearch[]): void {
      begin.run();
      try {
        for (const research of researches) {
          upsertCompany.run(
            research.company.id,
            research.company.name,
            research.company.canonicalWebsite,
            research.company.linkedinCompanyId,
            research.company.linkedinUrl,
            research.company.description,
            research.company.mission,
            research.company.vision,
            JSON.stringify(research.company.productsServices),
            research.company.businessModel,
            JSON.stringify(research.company.markets),
            research.company.sourceNotes,
            JSON.stringify(research.company.sourceUrls),
            runId
          );
          updateApplicationResearch.run(
            research.company.id,
            research.applyUrl,
            research.applyUrlSource,
            runId,
            research.candidateId
          );
          deleteApplicationQuestions.run(research.candidateId);
          for (const question of research.questions) {
            insertApplicationQuestion.run(
              question.id,
              research.candidateId,
              question.question,
              question.questionType,
              question.required ? 1 : 0,
              question.answerSuggestion,
              question.answerLanguage,
              JSON.stringify(question.evidence),
              JSON.stringify(question.riskNotes),
              question.sourceUrl
            );
          }
        }
        commit.run();
      } catch (error) {
        rollback.run();
        throw error;
      }
    },

    saveResumePackages(runId: number, packages: ResumePackage[]): void {
      begin.run();
      try {
        for (const resumePackage of packages) {
          updateResumePackage.run(
            resumePackage.resumePdfPath,
            runId,
            resumePackage.candidateId
          );
        }
        commit.run();
      } catch (error) {
        rollback.run();
        throw error;
      }
    },

    getCompanyResearch(companyId: string): CompanyResearch | null {
      const row = getCompany.get(companyId);
      return row ? companyResearchFromRow(row) : null;
    },

    listCandidates(): StoredJobCandidate[] {
      return db.prepare(`
        SELECT id, content_hash AS contentHash, title, company,
          company_website AS companyWebsite, publisher_company AS publisherCompany,
          url, source, source_job_id AS sourceJobId,
          location, remote_scope AS remoteScope, employment_type AS employmentType,
          salary_range AS salaryRange, posted_at AS postedAt, description,
          verification_note AS verificationNote, first_seen_at AS firstSeenAt,
          last_seen_at AS lastSeenAt, pipeline_state AS pipelineState, fit_decision AS fitDecision,
          fit_score AS fitScore, fit_summary AS fitSummary,
          fit_risks AS fitRisks, fit_evidence AS fitEvidence,
          fit_analyzed_at AS fitAnalyzedAt, company_id AS companyId,
          apply_url AS applyUrl, apply_url_source AS applyUrlSource,
          resume_pdf_path AS resumePdfPath, resume_generated_at AS resumeGeneratedAt,
          telegram_notified_at AS telegramNotifiedAt
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
          last_seen_at AS lastSeenAt, pipeline_state AS pipelineState, fit_decision AS fitDecision,
          fit_score AS fitScore, fit_summary AS fitSummary,
          fit_risks AS fitRisks, fit_evidence AS fitEvidence,
          fit_analyzed_at AS fitAnalyzedAt, company_id AS companyId,
          apply_url AS applyUrl, apply_url_source AS applyUrlSource,
          resume_pdf_path AS resumePdfPath, resume_generated_at AS resumeGeneratedAt
        FROM candidates
        WHERE description IS NULL OR description = '' OR company_website IS NULL OR company_website = ''
        ORDER BY last_seen_at DESC, company ASC, title ASC
        LIMIT ?
      `).all(limit).map((row) => storedCandidateFromRow(row));
    },

    listCandidatesForFit(limit = 25): StoredJobCandidate[] {
      return db.prepare(`
        SELECT id, content_hash AS contentHash, title, company,
          company_website AS companyWebsite, publisher_company AS publisherCompany,
          url, source, source_job_id AS sourceJobId,
          location, remote_scope AS remoteScope, employment_type AS employmentType,
          salary_range AS salaryRange, posted_at AS postedAt, description,
          verification_note AS verificationNote, first_seen_at AS firstSeenAt,
          last_seen_at AS lastSeenAt, pipeline_state AS pipelineState, fit_decision AS fitDecision,
          fit_score AS fitScore, fit_summary AS fitSummary,
          fit_risks AS fitRisks, fit_evidence AS fitEvidence,
          fit_analyzed_at AS fitAnalyzedAt, company_id AS companyId,
          apply_url AS applyUrl, apply_url_source AS applyUrlSource,
          resume_pdf_path AS resumePdfPath, resume_generated_at AS resumeGeneratedAt
        FROM candidates
        WHERE description IS NOT NULL AND description != ''
          AND company_website IS NOT NULL AND company_website != ''
          AND (fit_decision IS NULL OR fit_decision = '')
        ORDER BY last_seen_at DESC, company ASC, title ASC
        LIMIT ?
      `).all(limit).map((row) => storedCandidateFromRow(row));
    },

    listCandidatesForApplicationResearch(limit = 25): StoredJobCandidate[] {
      return db.prepare(`
        SELECT id, content_hash AS contentHash, title, company,
          company_website AS companyWebsite, publisher_company AS publisherCompany,
          url, source, source_job_id AS sourceJobId,
          location, remote_scope AS remoteScope, employment_type AS employmentType,
          salary_range AS salaryRange, posted_at AS postedAt, description,
          verification_note AS verificationNote, first_seen_at AS firstSeenAt,
          last_seen_at AS lastSeenAt, pipeline_state AS pipelineState, fit_decision AS fitDecision,
          fit_score AS fitScore, fit_summary AS fitSummary,
          fit_risks AS fitRisks, fit_evidence AS fitEvidence,
          fit_analyzed_at AS fitAnalyzedAt, company_id AS companyId,
          apply_url AS applyUrl, apply_url_source AS applyUrlSource,
          resume_pdf_path AS resumePdfPath, resume_generated_at AS resumeGeneratedAt
        FROM candidates
        WHERE fit_decision IN ('apply', 'weak_apply')
          AND (apply_researched_at IS NULL OR apply_researched_at = ''
            OR apply_url IS NULL OR apply_url = ''
            OR company_id IS NULL OR company_id = '')
        ORDER BY fit_score DESC, last_seen_at DESC, company ASC, title ASC
        LIMIT ?
      `).all(limit).map((row) => storedCandidateFromRow(row));
    },

    listCandidatesForResumeBuild(limit = 25): StoredJobCandidate[] {
      return db.prepare(`
        SELECT id, content_hash AS contentHash, title, company,
          company_website AS companyWebsite, publisher_company AS publisherCompany,
          url, source, source_job_id AS sourceJobId,
          location, remote_scope AS remoteScope, employment_type AS employmentType,
          salary_range AS salaryRange, posted_at AS postedAt, description,
          verification_note AS verificationNote, first_seen_at AS firstSeenAt,
          last_seen_at AS lastSeenAt, pipeline_state AS pipelineState, fit_decision AS fitDecision,
          fit_score AS fitScore, fit_summary AS fitSummary,
          fit_risks AS fitRisks, fit_evidence AS fitEvidence,
          fit_analyzed_at AS fitAnalyzedAt, company_id AS companyId,
          apply_url AS applyUrl, apply_url_source AS applyUrlSource,
          apply_researched_at AS applyResearchedAt,
          resume_pdf_path AS resumePdfPath, resume_generated_at AS resumeGeneratedAt
        FROM candidates
        WHERE fit_decision IN ('apply', 'weak_apply')
          AND apply_url IS NOT NULL AND apply_url != ''
          AND company_id IS NOT NULL AND company_id != ''
          AND (resume_generated_at IS NULL OR resume_generated_at = ''
            OR resume_pdf_path IS NULL OR resume_pdf_path = '')
        ORDER BY fit_score DESC, apply_researched_at DESC, company ASC, title ASC
        LIMIT ?
      `).all(limit).map((row) => storedCandidateFromRow(row));
    },

    listCandidatesForTelegramNotification(limit = 25): StoredJobCandidate[] {
      return db.prepare(`
        SELECT id, content_hash AS contentHash, title, company,
          company_website AS companyWebsite, publisher_company AS publisherCompany,
          url, source, source_job_id AS sourceJobId,
          location, remote_scope AS remoteScope, employment_type AS employmentType,
          salary_range AS salaryRange, posted_at AS postedAt, description,
          verification_note AS verificationNote, first_seen_at AS firstSeenAt,
          last_seen_at AS lastSeenAt, pipeline_state AS pipelineState, fit_decision AS fitDecision,
          fit_score AS fitScore, fit_summary AS fitSummary,
          fit_risks AS fitRisks, fit_evidence AS fitEvidence,
          fit_analyzed_at AS fitAnalyzedAt, company_id AS companyId,
          apply_url AS applyUrl, apply_url_source AS applyUrlSource,
          apply_researched_at AS applyResearchedAt,
          resume_pdf_path AS resumePdfPath, resume_generated_at AS resumeGeneratedAt,
          telegram_notified_at AS telegramNotifiedAt
        FROM candidates
        WHERE fit_decision IN ('apply', 'weak_apply')
          AND apply_url IS NOT NULL AND apply_url != ''
          AND resume_pdf_path IS NOT NULL AND resume_pdf_path != ''
          AND (telegram_notified_at IS NULL OR telegram_notified_at = '')
        ORDER BY fit_score DESC, resume_generated_at DESC, company ASC, title ASC
        LIMIT ?
      `).all(limit).map((row) => storedCandidateFromRow(row));
    },

    markTelegramNotified(candidateId: string): void {
      updateTelegramNotification.run(candidateId);
    },

    listApplicationQuestions(candidateId: string): ApplicationQuestion[] {
      return db.prepare(`
        SELECT id, candidate_id AS candidateId, question, question_type AS questionType,
          required, answer_suggestion AS answerSuggestion, answer_language AS answerLanguage,
          evidence_json AS evidenceJson, risk_notes_json AS riskNotesJson, source_url AS sourceUrl
        FROM application_questions
        WHERE candidate_id = ?
        ORDER BY id ASC
      `).all(candidateId).map((row) => applicationQuestionFromRow(row));
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
    lastSeenAt: textColumn(row, "lastSeenAt"),
    pipelineState: pipelineStateColumn(row, "pipelineState"),
    fitDecision: fitDecisionColumn(row, "fitDecision"),
    fitScore: optionalNumberColumn(row, "fitScore"),
    fitSummary: textColumn(row, "fitSummary"),
    fitRisks: textColumn(row, "fitRisks"),
    fitEvidence: textColumn(row, "fitEvidence"),
    fitAnalyzedAt: textColumn(row, "fitAnalyzedAt"),
    companyId: textColumn(row, "companyId"),
    applyUrl: textColumn(row, "applyUrl"),
    applyUrlSource: textColumn(row, "applyUrlSource"),
    applyResearchedAt: textColumn(row, "applyResearchedAt"),
    resumePdfPath: textColumn(row, "resumePdfPath"),
    resumeGeneratedAt: textColumn(row, "resumeGeneratedAt"),
    telegramNotifiedAt: textColumn(row, "telegramNotifiedAt")
  };
}

function companyResearchFromRow(row: Record<string, unknown>): CompanyResearch {
  return {
    id: requiredTextColumn(row, "id"),
    name: requiredTextColumn(row, "name"),
    canonicalWebsite: textColumn(row, "canonicalWebsite"),
    linkedinCompanyId: textColumn(row, "linkedinCompanyId"),
    linkedinUrl: textColumn(row, "linkedinUrl"),
    description: textColumn(row, "description"),
    mission: textColumn(row, "mission"),
    vision: textColumn(row, "vision"),
    productsServices: jsonStringList(row, "productsServices"),
    businessModel: textColumn(row, "businessModel"),
    markets: jsonStringList(row, "markets"),
    sourceNotes: textColumn(row, "sourceNotes"),
    sourceUrls: jsonStringList(row, "sourceUrls")
  };
}

function applicationQuestionFromRow(row: Record<string, unknown>): ApplicationQuestion {
  return {
    id: requiredTextColumn(row, "id"),
    candidateId: requiredTextColumn(row, "candidateId"),
    question: requiredTextColumn(row, "question"),
    questionType: textColumn(row, "questionType"),
    required: numberColumn(row, "required") === 1,
    answerSuggestion: requiredTextColumn(row, "answerSuggestion"),
    answerLanguage: requiredTextColumn(row, "answerLanguage"),
    evidence: jsonStringList(row, "evidenceJson"),
    riskNotes: jsonStringList(row, "riskNotesJson"),
    sourceUrl: textColumn(row, "sourceUrl")
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

function jsonStringList(row: Record<string, unknown>, columnName: string): string[] {
  const value = textColumn(row, columnName);
  if (!value) return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item) => typeof item === "string");
}

function fitDecisionColumn(row: Record<string, unknown>, columnName: string): FitDecision | "" {
  const value = textColumn(row, columnName);
  if (value === "" || value === "apply" || value === "weak_apply" || value === "dont_apply") return value;
  throw new Error(`Expected fit decision column ${columnName}.`);
}

function pipelineStateColumn(row: Record<string, unknown>, columnName: string): PipelineState | "" {
  const value = textColumn(row, columnName);
  if (
    value === "" ||
    value === "needs_enrichment" ||
    value === "enriched" ||
    value === "fit_analyzed" ||
    value === "application_researched" ||
    value === "resume_built" ||
    value === "telegram_notified"
  ) {
    return value;
  }
  throw new Error(`Expected pipeline state column ${columnName}.`);
}

function optionalNumberColumn(row: Record<string, unknown>, columnName: string): number | null {
  const value = row[columnName];
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "bigint" || typeof value === "string") return Number(value);
  throw new Error(`Expected optional numeric column ${columnName}.`);
}

function numberColumn(row: Record<string, unknown>, columnName: string): number {
  const value = row[columnName];
  if (typeof value === "number") return value;
  if (typeof value === "bigint" || typeof value === "string") return Number(value);
  throw new Error(`Expected numeric column ${columnName}.`);
}
