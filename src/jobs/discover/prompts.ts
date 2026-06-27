import { readFile } from "node:fs/promises";
import type { PromptTemplate } from "../types.ts";

export const linkedInDiscoveryPrompt: PromptTemplate = {
  name: "linkedin-discovery",
  version: "2026-06-26.4",
  template: `You are discovering job postings through LinkedIn MCP access.

Return JSON only. Do not edit files. Do not include markdown fences.

Search only for the term: {{SEARCH_TERM}}.

Use only mcp-server-linkedin_search_jobs. Do not call mcp-server-linkedin_get_job_details, company profile tools, web fetch, browser tools, or application pages.

Call search_jobs for remote jobs over exactly 3 result pages where the MCP supports pagination. Search by date/newest first where available. Target remote roles in the United Kingdom, United States, and European Union. Prefer individual-contributor roles, especially senior IC roles. Exclude management, executive, founder, and high-level leadership postings, including Staff, Lead, Principal, Head of Engineering, Engineering Manager, CTO, founder, co-founder, cofounder, freelance, and non-remote roles. If a role is ambiguous, exclude it.

Filter results by publication title. Keep only titles that match with Frontend Engineer, Full Stack Engineer, Backend Engineer, Software Engineer, Developer, Engineer or close title variants. Do not use JD/body text for inclusion because this phase must not fetch details.

Return one JSON object with a candidates array. The object below shows the required structure for one job candidate only; do not limit the response to one candidate. Include every eligible job candidate found across the searched pages by repeating this candidate object inside the candidates array:
{
  "candidates": [
    {
      "title": "Role title",
      "company": "Visible LinkedIn company or publisher name",
      "companyWebsite": "",
      "publisherCompany": "",
      "url": "Canonical job URL",
      "source": "linkedin",
      "sourceJobId": "numeric LinkedIn job ID when available",
      "location": "Visible location",
      "remoteScope": "Remote scope or geography",
      "employmentType": "Full-time/Contract/etc",
      "salaryRange": "Visible salary range or empty string",
      "postedAt": "Visible posted date text",
      "description": "",
      "verificationNote": "search-only discovery for {{SEARCH_TERM}}"
    }
  ]
}

Use only facts visible in search results. Do not invent postings, company names, websites, salaries, or details.`,
};

export const DEFAULT_DISCOVERY_TERMS = [
  "React",
  "Typescript",
  "Frontend",
  "full-stack",
];

export async function loadDiscoveryPrompt(
  promptFile?: string,
): Promise<PromptTemplate> {
  if (promptFile) {
    return {
      name: "file-override",
      version: `file:${promptFile}`,
      template: await readFile(promptFile, "utf8"),
    };
  }

  return linkedInDiscoveryPrompt;
}

export function renderDiscoveryPrompt(
  prompt: PromptTemplate,
  searchTerm: string,
): string {
  return prompt.template.replaceAll("{{SEARCH_TERM}}", searchTerm);
}
