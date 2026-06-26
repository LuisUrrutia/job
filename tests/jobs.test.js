import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openJobStore } from "../src/jobs/store.js";
import { discoverJobs } from "../src/jobs/discover/index.js";
import { renderJobsMarkdown, writeJobsReport } from "../src/jobs/report.js";
import { stableJobId } from "../src/jobs/domain.js";

describe("jobs pipeline", () => {
  test("fixture discover is idempotent and stores normalized candidates", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "jobs-pipeline-"));
    const store = openJobStore(join(workspace, "jobs.sqlite"));

    try {
      const options = {
        runner: "fixture",
        fixture: "tests/fixtures/linkedin-discovery.json",
        cwd: process.cwd(),
        rawDir: join(workspace, "raw")
      };

      const firstRun = await discoverJobs(store, options);
      const secondRun = await discoverJobs(store, options);

      expect(firstRun.candidates).toHaveLength(2);
      expect(secondRun.candidates).toHaveLength(2);
      expect(store.countCandidates()).toBe(2);
      expect(store.listCandidates().map((candidate) => candidate.id)).toContain("linkedin:1234567890");
      expect(store.listCandidates()[0].companyWebsite).toContain("example.invalid");
    } finally {
      store.close();
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("report generation renders stored candidates", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "jobs-report-"));
    const store = openJobStore(join(workspace, "jobs.sqlite"));

    try {
      await discoverJobs(store, {
        runner: "fixture",
        fixture: "tests/fixtures/linkedin-discovery.json",
        cwd: process.cwd(),
        rawDir: join(workspace, "raw")
      });

      const reportPath = join(workspace, "Jobs.md");
      const result = await writeJobsReport(store, reportPath);
      const markdown = await Bun.file(reportPath).text();

      expect(result.count).toBe(2);
      expect(markdown).toContain("# Jobs");
      expect(markdown).toContain("Sample Senior React Engineer");
      expect(markdown).toContain("**Company website:** https://example.invalid/health-tools");
      expect(markdown).toContain("linkedin:1234567890");
      expect(renderJobsMarkdown([])).toContain("No candidates stored yet.");
    } finally {
      store.close();
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("stable identity prefers LinkedIn numeric IDs and hashes canonical URLs", () => {
    expect(stableJobId({ url: "https://www.linkedin.com/jobs/view/1234567890/?trk=public" })).toBe("linkedin:1234567890");
    expect(stableJobId({ url: "https://example.invalid/jobs/one?trk=ignored" })).toMatch(/^url:[a-f0-9]{24}$/);
  });
});
