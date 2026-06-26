#!/usr/bin/env python3

import argparse
import json
import os
import re
import subprocess
from pathlib import Path


HEADLINE_TOKEN = "{{RESUME_HEADLINE}}"
EXPERIENCE_TOKEN = "{{RESUME_EXPERIENCE}}"
FULL_NAME_TOKEN = "{{RESUME_FULL_NAME}}"
NAME_FIRST_TOKEN = "{{RESUME_NAME_FIRST}}"
NAME_LAST_TOKEN = "{{RESUME_NAME_LAST}}"
EMAIL_HREF_TOKEN = "{{RESUME_EMAIL_HREF}}"
EMAIL_LABEL_TOKEN = "{{RESUME_EMAIL_LABEL}}"
PHONE_HREF_TOKEN = "{{RESUME_PHONE_HREF}}"
PHONE_LABEL_TOKEN = "{{RESUME_PHONE_LABEL}}"
LOCATION_TOKEN = "{{RESUME_LOCATION}}"
LINKEDIN_HREF_TOKEN = "{{RESUME_LINKEDIN_HREF}}"
LINKEDIN_LABEL_TOKEN = "{{RESUME_LINKEDIN_LABEL}}"
GITHUB_HREF_TOKEN = "{{RESUME_GITHUB_HREF}}"
GITHUB_LABEL_TOKEN = "{{RESUME_GITHUB_LABEL}}"
APPLICATION_SUFFIX = "-application"
REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROFILE_PATH = REPO_ROOT / "info.json"
DEFAULT_TEMPLATE_PATH = REPO_ROOT / "latex" / "resume.template.tex"
RESUME_SUFFIX = "-Resume"
DEFAULT_ITEMIZE_LINE = r"\setlist[itemize]{left=1.2em}"
COMPACT_ITEMIZE_LINE = r"\setlist[itemize]{left=1.2em, itemsep=0.2em, topsep=0.3em, parsep=0pt, partopsep=0pt}"


def latex_escape(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(char, char) for char in value)


def normalize_headline(raw_title: str) -> str:
    no_suffix = re.sub(r"\s*\([^)]*\)\s*$", "", raw_title).strip()
    return no_suffix or raw_title.strip()


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower())
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized or "company"


def load_json_object(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Expected JSON object in {path}.")
    return data


def get_personal_info(data: dict, source_label: str) -> dict:
    personal_info = data.get("personalInfo")
    if not isinstance(personal_info, dict):
        raise ValueError(f"Missing personalInfo in {source_label}.")
    return personal_info


def personal_info_value(personal_info: dict, field: str, source_label: str) -> str:
    value = personal_info.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Missing personalInfo.{field} in {source_label}.")
    return value.strip()


def candidate_slug_from_profile(profile_data: dict, source_label: str) -> str:
    personal_info = get_personal_info(profile_data, source_label)
    candidate_name = personal_info_value(personal_info, "name", source_label)
    candidate_slug = slugify(candidate_name)
    if candidate_slug == "company":
        raise ValueError(
            f"personalInfo.name in {source_label} must include at least one ASCII letter or number."
        )
    return candidate_slug


def split_candidate_name(candidate_name: str) -> tuple[str, str]:
    parts = candidate_name.split()
    if len(parts) == 1:
        return parts[0].upper(), ""
    return " ".join(parts[:-1]).upper(), parts[-1].upper()


def href_from_profile_url(value: str) -> str:
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", value):
        return value
    return f"https://{value}"


def phone_href(value: str) -> str:
    return re.sub(r"\s+", "", value)


def infer_company_slug(input_path: Path, data: dict) -> str:
    explicit_company = data.get("targetCompany")
    if isinstance(explicit_company, str) and explicit_company.strip():
        return slugify(explicit_company)

    stem = input_path.stem
    match = re.match(
        r"^(.*?)-(senior|staff|principal|lead|mid|junior|sr|jr)(?:-|$)",
        stem,
        flags=re.IGNORECASE,
    )
    company_part = match.group(1) if match else stem
    return slugify(company_part)


def infer_application_slug(input_path: Path) -> str | None:
    stem = input_path.stem
    if not stem.endswith(APPLICATION_SUFFIX):
        return None
    return stem[: -len(APPLICATION_SUFFIX)] or None


def resolve_path(raw_path: str) -> Path:
    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        path = Path.cwd() / path
    return path.resolve()


def default_output_pdf_path(input_path: Path, data: dict, candidate_slug: str) -> Path:
    application_slug = infer_application_slug(input_path)
    if application_slug:
        return (
            REPO_ROOT
            / "applications"
            / f"{candidate_slug}-{application_slug}{RESUME_SUFFIX}.pdf"
        )

    company_slug = infer_company_slug(input_path, data)
    return REPO_ROOT / f"{candidate_slug}-{company_slug}{RESUME_SUFFIX}.pdf"


def default_output_pdf_path_for_tex(tex_path: Path) -> Path:
    return REPO_ROOT / "applications" / f"{tex_path.stem}.pdf"


def extract_page_count(latex_output: str) -> int | None:
    match = re.search(r"Output written on .* \((\d+) pages?,", latex_output)
    if not match:
        return None
    return int(match.group(1))


def compile_once(
    tex_path: Path, output_pdf_path: Path, compile_dir: Path | None = None
) -> tuple[int | None, str]:
    target_compile_dir = compile_dir or tex_path.parent
    compile_input = os.path.relpath(tex_path, target_compile_dir)
    compile_command = [
        "latexmk",
        "-lualatex",
        "-halt-on-error",
        f"-jobname={output_pdf_path.stem}",
        compile_input,
    ]
    result = subprocess.run(
        compile_command,
        check=True,
        cwd=target_compile_dir,
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="")

    produced_pdf = target_compile_dir / f"{output_pdf_path.stem}.pdf"
    if produced_pdf.resolve() != output_pdf_path.resolve():
        output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
        produced_pdf.replace(output_pdf_path)

    return extract_page_count(result.stdout), result.stdout


def ensure_compact_itemize(tex_path: Path) -> bool:
    content = tex_path.read_text(encoding="utf-8")
    if COMPACT_ITEMIZE_LINE in content:
        return False

    if DEFAULT_ITEMIZE_LINE in content:
        updated = content.replace(DEFAULT_ITEMIZE_LINE, COMPACT_ITEMIZE_LINE, 1)
    else:
        updated = content.replace(
            r"\usepackage{enumitem}",
            "\\usepackage{enumitem}\n" + COMPACT_ITEMIZE_LINE,
            1,
        )

    tex_path.write_text(updated, encoding="utf-8")
    return True


def compile_tex_to_pdf(
    tex_path: Path, output_pdf_path: Path, compile_dir: Path | None = None
) -> tuple[int | None, bool]:
    page_count, _ = compile_once(tex_path, output_pdf_path, compile_dir=compile_dir)
    compact_mode_applied = False

    if page_count is not None and page_count > 2:
        compact_mode_applied = ensure_compact_itemize(tex_path)
        if compact_mode_applied:
            print("Resume exceeded 2 pages. Recompiling with compact itemize spacing.")
            page_count, _ = compile_once(
                tex_path, output_pdf_path, compile_dir=compile_dir
            )

    return page_count, compact_mode_applied


def build_experience_block(work_experience: list[dict]) -> str:
    lines: list[str] = []

    for role in work_experience:
        title = latex_escape(role.get("title", "").upper())
        location = latex_escape(role.get("location", ""))
        company = latex_escape(role.get("company", ""))
        years = latex_escape(role.get("years", "")).replace(" - ", " {-} ")
        heading = rf"\WorkExperience{{{title} \hfill {location}}}{{{company} \hfill {years}}} \\"
        lines.append(heading)

        tech = role.get("tech", [])
        if tech:
            tech_line = ", ".join(latex_escape(item) for item in tech)
            lines.append(rf"\Skills{{{tech_line}}}")

        description_items = role.get("description", [])
        if description_items:
            lines.append(r"\begin{itemize}")
            for item in description_items:
                lines.append(rf"\item {latex_escape(item)}")
            lines.append(r"\end{itemize}")

        lines.append("")

    return "\n".join(lines).rstrip()


def replace_required_token(content: str, token: str, value: str) -> str:
    if token not in content:
        raise ValueError(f"Template is missing token: {token}")
    return content.replace(token, value)


def render_template(
    template_content: str,
    personal_info: dict,
    source_label: str,
    headline: str,
    experience_block: str,
) -> str:
    candidate_name = personal_info_value(personal_info, "name", source_label)
    name_first, name_last = split_candidate_name(candidate_name)
    email = personal_info_value(personal_info, "email", source_label)
    phone = personal_info_value(personal_info, "phone", source_label)
    location = personal_info_value(personal_info, "location", source_label)
    linkedin = personal_info_value(personal_info, "linkedin", source_label)
    github = personal_info_value(personal_info, "github", source_label)

    headline_latex = "{" + latex_escape(headline) + "}"
    replacements = {
        FULL_NAME_TOKEN: latex_escape(candidate_name),
        NAME_FIRST_TOKEN: latex_escape(name_first),
        NAME_LAST_TOKEN: latex_escape(name_last),
        EMAIL_HREF_TOKEN: email,
        EMAIL_LABEL_TOKEN: latex_escape(email),
        PHONE_HREF_TOKEN: phone_href(phone),
        PHONE_LABEL_TOKEN: latex_escape(phone),
        LOCATION_TOKEN: latex_escape(location),
        LINKEDIN_HREF_TOKEN: href_from_profile_url(linkedin),
        LINKEDIN_LABEL_TOKEN: latex_escape(linkedin),
        GITHUB_HREF_TOKEN: href_from_profile_url(github),
        GITHUB_LABEL_TOKEN: latex_escape(github),
        HEADLINE_TOKEN: headline_latex,
        EXPERIENCE_TOKEN: experience_block,
    }

    output = template_content
    for token, value in replacements.items():
        output = replace_required_token(output, token, value)
    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a LaTeX resume from a JSON profile."
    )
    parser.add_argument(
        "--input",
        default="aurora-payments-senior-software-engineer-react-typescript.json",
        help="Path to the source JSON file.",
    )
    parser.add_argument(
        "--template",
        default=str(DEFAULT_TEMPLATE_PATH),
        help="Path to the source LaTeX template.",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Path to the generated PDF output.",
    )
    parser.add_argument(
        "--output-tex",
        default=None,
        help="Optional path to write the generated LaTeX file.",
    )
    parser.add_argument(
        "--headline",
        default=None,
        help="Optional headline override. Defaults to personalInfo.title without parenthesis suffix.",
    )
    parser.add_argument(
        "--tex-only",
        action="store_true",
        help="Write the generated LaTeX file without compiling a PDF.",
    )
    parser.add_argument(
        "--compile-tex",
        default=None,
        help="Compile an existing LaTeX file to PDF instead of generating from JSON.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.compile_tex:
        tex_path = resolve_path(args.compile_tex)
        output_pdf_path = (
            resolve_path(args.output)
            if args.output
            else default_output_pdf_path_for_tex(tex_path)
        )
        page_count, compact_mode_applied = compile_tex_to_pdf(tex_path, output_pdf_path)
        print(f"Generated {output_pdf_path} from {tex_path}")
        if compact_mode_applied and page_count is not None and page_count > 2:
            print(
                f"Warning: resume still exceeds 2 pages after compact spacing ({page_count} pages)."
            )
        return

    input_path = resolve_path(args.input)
    template_path = resolve_path(args.template)

    data = load_json_object(input_path)
    profile_data = load_json_object(DEFAULT_PROFILE_PATH)
    profile_source_label = str(DEFAULT_PROFILE_PATH)
    profile_personal_info = get_personal_info(profile_data, profile_source_label)
    candidate_slug = candidate_slug_from_profile(profile_data, profile_source_label)
    template_content = template_path.read_text(encoding="utf-8")

    output_pdf_path = (
        resolve_path(args.output)
        if args.output
        else default_output_pdf_path(input_path, data, candidate_slug)
    )
    output_tex_path = (
        resolve_path(args.output_tex)
        if args.output_tex
        else template_path.parent / f"{output_pdf_path.stem}.tex"
    )

    raw_title = data.get("personalInfo", {}).get("title", "")
    headline = args.headline if args.headline else normalize_headline(raw_title)
    if not headline:
        raise ValueError(
            "Missing personalInfo.title in JSON and no --headline override provided."
        )

    experience_block = build_experience_block(data.get("workExperience", []))
    output_content = render_template(
        template_content,
        profile_personal_info,
        profile_source_label,
        headline,
        experience_block,
    )

    output_tex_path.parent.mkdir(parents=True, exist_ok=True)
    output_tex_path.write_text(output_content + "\n", encoding="utf-8")

    if args.tex_only:
        print(f"Generated {output_tex_path} from {input_path}")
        return

    page_count, compact_mode_applied = compile_tex_to_pdf(
        output_tex_path, output_pdf_path, compile_dir=template_path.parent
    )

    print(f"Generated {output_pdf_path} from {input_path}")
    if compact_mode_applied and page_count is not None and page_count > 2:
        print(
            f"Warning: resume still exceeds 2 pages after compact spacing ({page_count} pages)."
        )


if __name__ == "__main__":
    main()
