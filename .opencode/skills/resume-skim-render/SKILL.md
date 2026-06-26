---
name: resume-skim-render
description: Render the candidate's tailored resume into TeX and PDF with skim-story bolding. Use when the resume workflow needs generated resume artifacts.
---

# Resume Skim Render

After saving `ai/{company}/{slug}-application.json`, generate the resume artifacts before stopping.
The generator derives `{candidate-slug}` from `info.json` `personalInfo.name`.

## Steps

1. Run `npm run resume -- --input ai/{company}/{slug}-application.json --tex-only`. Completion criterion: `latex/{candidate-slug}-{slug}-Resume.tex` exists.
2. Edit `latex/{candidate-slug}-{slug}-Resume.tex` before compiling the PDF. Completion criterion: bold phrases, section headers, and first visible skills tell the same fit story as `resume_focus_priority`.
3. Use `\textbf{...}` for emphasis in the TeX edit pass. Completion criterion: emphasis follows [skim-rules.md](reference/skim-rules.md).
4. If you materially rewrite, tighten, or remove a bullet in TeX, mirror that wording change back into `ai/{company}/{slug}-application.json`. Completion criterion: TeX and JSON do not disagree on material bullet wording.
5. Run `npm run resume -- --compile-tex latex/{candidate-slug}-{slug}-Resume.tex`. Completion criterion: `applications/{candidate-slug}-{slug}-Resume.pdf` exists.
6. Apply the page-count fallback only if needed. Completion criterion: PDFs over 2 pages either receive the compact spacing fallback and are recompiled, or the user is told clearly that the PDF still exceeds 2 pages.

## Page-Count Fallback Rule

- Do not edit the template file for page-count control. Only edit the generated `latex/{candidate-slug}-{slug}-Resume.tex`.
- If the first compiled PDF is more than 2 pages, update the generated TeX to use `\setlist[itemize]{left=1.2em, itemsep=0.2em, topsep=0.3em, parsep=0pt, partopsep=0pt}`.
- Recompile after applying that compact itemize spacing.
- If the PDF still exceeds 2 pages after that fallback, tell the user explicitly instead of silently accepting it.
