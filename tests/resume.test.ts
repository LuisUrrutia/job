import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildExperienceBlock,
  compileExistingTex,
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
        description: [
          "Improved API response time by 35% with GraphQL gateway work",
          "Built a full-stack module with a frontend focus in TypeScript and React"
        ]
      }
    ], ["API response time", "GraphQL gateway work", "full-stack module with a frontend focus in TypeScript and React", "TypeScript"]);

    assert.ok(block.includes(String.raw`OpenZeppelin \& Partners`));
    assert.ok(block.includes("2023 {-} 2026"));
    assert.ok(block.includes(String.raw`\Skills{TypeScript, React}`));
    assert.ok(block.includes(String.raw`\item Improved \textbf{API response time} by 35\% with \textbf{GraphQL gateway work}`));
    assert.ok(block.includes(String.raw`\item Built a \textbf{full-stack module with a frontend focus in TypeScript and React}`));
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

  test("rejects PDFs that still exceed two pages without removable bullets", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "resume-page-limit-"));
    const binPath = join(workspace, "bin");
    const texPath = join(workspace, "resume.tex");
    const pdfPath = join(workspace, "resume.pdf");
    const latexmkPath = join(binPath, "latexmk");
    const originalPath = process.env.PATH;

    try {
      writeFileSync(
        texPath,
        String.raw`\documentclass{article}
\begin{document}
First page
\newpage
Second page
\newpage
Third page
\end{document}
`
      );
      mkdirSync(binPath, { recursive: true });
      writeFileSync(
        latexmkPath,
        [
          "#!/bin/sh",
          "outdir=.",
          "jobname=resume",
          "for arg in \"$@\"; do",
          "  case \"$arg\" in",
          "    -outdir=*) outdir=${arg#-outdir=} ;;",
          "    -jobname=*) jobname=${arg#-jobname=} ;;",
          "  esac",
          "done",
          "mkdir -p \"$outdir\"",
          "printf '%s\\n' '%PDF-1.4 fake resume' > \"$outdir/$jobname.pdf\"",
          "printf 'Output written on %s/%s.pdf (3 pages, 123 bytes).\\n' \"$outdir\" \"$jobname\""
        ].join("\n")
      );
      chmodSync(latexmkPath, 0o755);
      process.env.PATH = `${binPath}:${originalPath || ""}`;

      await assert.rejects(
        () => compileExistingTex({ texPath, output: pdfPath }),
        /Resume still exceeds 2 pages after available content reductions \(3 pages\)/
      );
    } finally {
      process.env.PATH = originalPath;
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("removes the Skills section before trimming bullets in overlong generated PDFs", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "resume-trim-oldest-"));
    const binPath = join(workspace, "bin");
    const inputPath = join(workspace, "example-company-senior-engineer-application.json");
    const outputTexPath = join(workspace, "resume.tex");
    const outputPdfPath = join(workspace, "resume.pdf");
    const templatePath = join(workspace, "template.tex");
    const profilePath = join(workspace, "info.json");
    const latexmkPath = join(binPath, "latexmk");
    const originalPath = process.env.PATH;

    try {
      writeFileSync(
        inputPath,
        JSON.stringify({
          personalInfo: { title: "Senior Engineer (Remote)" },
          workExperience: [
            {
              title: "Current Engineer",
              location: "Remote",
              company: "Current Company",
              years: "2024 - 2026",
              tech: ["TypeScript", "React"],
              description: ["Current detail stays visible", "Current irrelevant detail should be removed"]
            },
            {
              title: "Older Engineer",
              location: "Remote",
              company: "Older Company",
              years: "2021 - 2024",
              tech: ["Python", "PostgreSQL"],
              description: ["Old relevant detail stays visible"]
            }
          ],
          resume_bold_phrases: ["Current detail", "Old relevant detail"],
          targetCompany: "Example Company"
        })
      );
      writeFileSync(
        profilePath,
        JSON.stringify({
          personalInfo: {
            name: "Luis Urrutia",
            email: "luis@example.com",
            phone: "+34 644 402 855",
            location: "Spain",
            linkedin: "linkedin.com/in/luisurrutiaf",
            github: "github.com/LuisUrrutia"
          }
        })
      );
      writeFileSync(
        templatePath,
        String.raw`{{RESUME_FULL_NAME}} {{RESUME_NAME_FIRST}} {{RESUME_NAME_LAST}} {{RESUME_EMAIL_HREF}} {{RESUME_EMAIL_LABEL}} {{RESUME_PHONE_HREF}} {{RESUME_PHONE_LABEL}} {{RESUME_LOCATION}} {{RESUME_LINKEDIN_HREF}} {{RESUME_LINKEDIN_LABEL}} {{RESUME_GITHUB_HREF}} {{RESUME_GITHUB_LABEL}} {{RESUME_HEADLINE}} {{RESUME_EXPERIENCE}}
\section*{SKILLS}
\begin{itemize}
  \item TypeScript, React, Python, PostgreSQL
\end{itemize}
\section*{LANGUAGES}
English`
      );
      mkdirSync(binPath, { recursive: true });
      writeFileSync(
        latexmkPath,
        [
          "#!/bin/sh",
          "outdir=.",
          "jobname=resume",
          "input=",
          "for arg in \"$@\"; do",
          "  case \"$arg\" in",
          "    -outdir=*) outdir=${arg#-outdir=} ;;",
          "    -jobname=*) jobname=${arg#-jobname=} ;;",
          "    -*) ;;",
          "    *) input=$arg ;;",
          "  esac",
          "done",
          "pages=2",
          "if grep -Fq '\\section*{SKILLS}' \"$input\" || grep -Fq 'Current irrelevant detail should be removed' \"$input\"; then pages=3; fi",
          "mkdir -p \"$outdir\"",
          "printf '%s\\n' '%PDF-1.4 fake resume' > \"$outdir/$jobname.pdf\"",
          "printf 'Output written on %s/%s.pdf (%s pages, 123 bytes).\\n' \"$outdir\" \"$jobname\" \"$pages\""
        ].join("\n")
      );
      chmodSync(latexmkPath, 0o755);
      process.env.PATH = `${binPath}:${originalPath || ""}`;

      const result = await generateResumeFromJson({
        input: inputPath,
        template: templatePath,
        output: outputPdfPath,
        outputTex: outputTexPath,
        profilePath
      });
      const output = await readFile(result.outputTexPath, "utf8");

      assert.equal(result.pageCount, 2);
      assert.equal(result.contentReductionApplied, true);
      assert.ok(output.includes(String.raw`\textbf{Current detail} stays visible`));
      assert.ok(output.includes("OLDER ENGINEER"));
      assert.ok(output.includes(String.raw`\Skills{Python, PostgreSQL}`));
      assert.ok(output.includes(String.raw`\textbf{Old relevant detail} stays visible`));
      assert.ok(!output.includes("Current irrelevant detail should be removed"));
      assert.ok(!output.includes(String.raw`\section*{SKILLS}`));
      assert.ok(!output.includes("itemsep=0.2em"));
    } finally {
      process.env.PATH = originalPath;
      rmSync(workspace, { recursive: true, force: true });
    }
  });


  test("keeps bullets when removing the Skills section fixes page count", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "resume-trim-skills-only-"));
    const binPath = join(workspace, "bin");
    const inputPath = join(workspace, "example-company-senior-engineer-application.json");
    const outputTexPath = join(workspace, "resume.tex");
    const outputPdfPath = join(workspace, "resume.pdf");
    const templatePath = join(workspace, "template.tex");
    const profilePath = join(workspace, "info.json");
    const latexmkPath = join(binPath, "latexmk");
    const originalPath = process.env.PATH;

    try {
      writeFileSync(
        inputPath,
        JSON.stringify({
          personalInfo: { title: "Senior Engineer (Remote)" },
          workExperience: [
            {
              title: "Current Engineer",
              location: "Remote",
              company: "Current Company",
              years: "2024 - 2026",
              tech: ["TypeScript", "React"],
              description: ["Relevant delivery detail", "Optional detail should stay when Skills removal is enough"]
            }
          ],
          resume_bold_phrases: ["Relevant delivery detail"],
          targetCompany: "Example Company"
        })
      );
      writeFileSync(
        profilePath,
        JSON.stringify({
          personalInfo: {
            name: "Luis Urrutia",
            email: "luis@example.com",
            phone: "+34 644 402 855",
            location: "Spain",
            linkedin: "linkedin.com/in/luisurrutiaf",
            github: "github.com/LuisUrrutia"
          }
        })
      );
      writeFileSync(
        templatePath,
        String.raw`{{RESUME_FULL_NAME}} {{RESUME_NAME_FIRST}} {{RESUME_NAME_LAST}} {{RESUME_EMAIL_HREF}} {{RESUME_EMAIL_LABEL}} {{RESUME_PHONE_HREF}} {{RESUME_PHONE_LABEL}} {{RESUME_LOCATION}} {{RESUME_LINKEDIN_HREF}} {{RESUME_LINKEDIN_LABEL}} {{RESUME_GITHUB_HREF}} {{RESUME_GITHUB_LABEL}} {{RESUME_HEADLINE}} {{RESUME_EXPERIENCE}}
\section*{SKILLS}
\begin{itemize}
  \item TypeScript, React, Python, PostgreSQL
\end{itemize}
\section*{LANGUAGES}
English`
      );
      mkdirSync(binPath, { recursive: true });
      writeFileSync(
        latexmkPath,
        [
          "#!/bin/sh",
          "outdir=.",
          "jobname=resume",
          "input=",
          "for arg in \"$@\"; do",
          "  case \"$arg\" in",
          "    -outdir=*) outdir=${arg#-outdir=} ;;",
          "    -jobname=*) jobname=${arg#-jobname=} ;;",
          "    -*) ;;",
          "    *) input=$arg ;;",
          "  esac",
          "done",
          "pages=2",
          "if grep -Fq '\\section*{SKILLS}' \"$input\"; then pages=3; fi",
          "mkdir -p \"$outdir\"",
          "printf '%s\\n' '%PDF-1.4 fake resume' > \"$outdir/$jobname.pdf\"",
          "printf 'Output written on %s/%s.pdf (%s pages, 123 bytes).\\n' \"$outdir\" \"$jobname\" \"$pages\""
        ].join("\n")
      );
      chmodSync(latexmkPath, 0o755);
      process.env.PATH = `${binPath}:${originalPath || ""}`;

      const result = await generateResumeFromJson({
        input: inputPath,
        template: templatePath,
        output: outputPdfPath,
        outputTex: outputTexPath,
        profilePath
      });
      const output = await readFile(result.outputTexPath, "utf8");

      assert.equal(result.pageCount, 2);
      assert.equal(result.contentReductionApplied, true);
      assert.ok(!output.includes(String.raw`\section*{SKILLS}`));
      assert.ok(output.includes("Optional detail should stay when Skills removal is enough"));
    } finally {
      process.env.PATH = originalPath;
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
