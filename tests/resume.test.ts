import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildExperienceBlock,
  extractPageCount,
  generateResumeFromJson,
  inferApplicationSlug,
  latexEscape,
  normalizeHeadline,
  phoneHref,
  renderTemplate,
  slugify
} from "../src/resume/generator.ts";
import { parseArgs } from "../src/resume/cli.ts";

describe("resume generator", () => {
  test("renders template tokens and phone links", () => {
    const personalInfo = {
      name: "Luis Urrutia",
      email: "luis@urrutia.me",
      phone: "+34 644 402 855",
      location: "Spain",
      linkedin: "linkedin.com/in/luisurrutiaf",
      github: "github.com/LuisUrrutia"
    };
    const rendered = renderTemplate(
      "{{RESUME_NAME_FIRST}} {{RESUME_NAME_LAST}} {{RESUME_PHONE_HREF}} {{RESUME_PHONE_LABEL}} {{RESUME_LINKEDIN_HREF}} {{RESUME_HEADLINE}} {{RESUME_EXPERIENCE}} {{RESUME_FULL_NAME}} {{RESUME_EMAIL_HREF}} {{RESUME_EMAIL_LABEL}} {{RESUME_LOCATION}} {{RESUME_LINKEDIN_LABEL}} {{RESUME_GITHUB_HREF}} {{RESUME_GITHUB_LABEL}}",
      personalInfo,
      "test-profile",
      "Senior Engineer",
      "Experience"
    );

    assert.ok(rendered.includes("LUIS URRUTIA"));
    assert.ok(rendered.includes("+34644402855"));
    assert.ok(rendered.includes("+34 644 402 855"));
    assert.ok(rendered.includes("https://linkedin.com/in/luisurrutiaf"));
  });

  test("builds experience blocks with sparse bold phrases", () => {
    const block = buildExperienceBlock([
      {
        title: "Software Engineer",
        location: "UK, Remote",
        company: "OpenZeppelin & Partners",
        years: "2023 - 2026",
        tech: ["TypeScript", "React"],
        description: ["Improved API response time by 35% with GraphQL gateway work"]
      }
    ], ["API response time", "GraphQL gateway work", "TypeScript"]);

    assert.ok(block.includes(String.raw`OpenZeppelin \& Partners`));
    assert.ok(block.includes("2023 {-} 2026"));
    assert.ok(block.includes(String.raw`\Skills{TypeScript, React}`));
    assert.ok(block.includes(String.raw`\item Improved \textbf{API response time} by 35\% with \textbf{GraphQL gateway work}`));
  });

  test("writes TeX from JSON without compiling when tex-only is enabled", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "resume-generator-"));
    const inputPath = join(workspace, "example-company-senior-engineer-application.json");
    const outputTexPath = join(workspace, "resume.tex");
    const outputPdfPath = join(workspace, "resume.pdf");
    const templatePath = join(workspace, "template.tex");

    try {
      writeFileSync(
        inputPath,
        JSON.stringify({
          personalInfo: { title: "Senior Engineer (Remote)" },
          workExperience: [{ title: "Engineer", location: "Remote", company: "Example", years: "2023 - 2026", description: ["Built React and TypeScript workflows for designers"] }],
          resume_bold_phrases: ["React and TypeScript workflows"],
          targetCompany: "Example Company"
        })
      );
      writeFileSync(
        templatePath,
        "{{RESUME_FULL_NAME}} {{RESUME_NAME_FIRST}} {{RESUME_NAME_LAST}} {{RESUME_EMAIL_HREF}} {{RESUME_EMAIL_LABEL}} {{RESUME_PHONE_HREF}} {{RESUME_PHONE_LABEL}} {{RESUME_LOCATION}} {{RESUME_LINKEDIN_HREF}} {{RESUME_LINKEDIN_LABEL}} {{RESUME_GITHUB_HREF}} {{RESUME_GITHUB_LABEL}} {{RESUME_HEADLINE}} {{RESUME_EXPERIENCE}}"
      );

      const result = await generateResumeFromJson({ input: inputPath, template: templatePath, output: outputPdfPath, outputTex: outputTexPath, texOnly: true });
      const output = await readFile(result.outputTexPath, "utf8");

      assert.equal(result.outputTexPath, outputTexPath);
      assert.ok(output.includes("{Senior Engineer}"));
      assert.ok(output.includes(String.raw`\textbf{React and TypeScript workflows}`));
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("keeps the Python CLI behavior in TypeScript helpers", () => {
    assert.equal(latexEscape("A&B_#%$~^"), String.raw`A\&B\_\#\%\$\textasciitilde{}\textasciicircum{}`);
    assert.equal(normalizeHeadline("Senior Engineer (Remote)"), "Senior Engineer");
    assert.equal(slugify("Example Company!"), "example-company");
    assert.equal(phoneHref("+34 644 402 855"), "+34644402855");
    assert.equal(inferApplicationSlug("/tmp/company-role-application.json"), "company-role");
    assert.equal(extractPageCount("Output written on resume.pdf (2 pages, 123 bytes)."), 2);
    assert.equal(parseArgs(["--input", "one.json", "--tex-only"]).input, "one.json");
  });
});
