import { readFile } from "node:fs/promises";
import type { PromptTemplate } from "../types.ts";

export const linkedInDiscoveryPrompt: PromptTemplate = {
  name: "linkedin-discovery",
  version: "2026-07-22.1",
  template: `You are discovering LinkedIn job candidates through BrowserMCP in the user's connected browser tab.

For a successful run, return JSON only. Do not edit files. Do not include markdown fences.

Search only for the term: {{SEARCH_TERM}}.

Use only BrowserMCP tools whose names start with browsermcp_browser_. Do not use web fetch, web search, another browser tool, LinkedIn API tools, or application pages. If BrowserMCP reports that no tab is connected, do not use a fallback or claim success; report the connection error.

Navigate the connected tab to LinkedIn Jobs, search for the term, and apply Remote and date/newest filters. Use accessibility snapshots after navigation and interactions. Inspect exactly 5 result pages where LinkedIn exposes pagination. Target remote roles in the United Kingdom, United States, and European Union. Prefer individual-contributor roles, especially senior IC roles. Exclude management, executive, founder, and high-level leadership postings, including Staff, Lead, Principal, Head of Engineering, Engineering Manager, CTO, founder, co-founder, cofounder, freelance, and non-remote roles. If a role is ambiguous, exclude it.

Filter results by publication title and visible search-result metadata. Keep only titles that match with Frontend Engineer, Full Stack Engineer, Backend Engineer, Software Engineer, Developer, Engineer or close title variants. Do not open a job candidate or use JD/body text for inclusion because this phase must not fetch details.
Also avoid results related to PHP, Java, C#, Kotlin, Swift, Elixir, or C++. Exclude Crossing Hurdles, FITFILE, and micro1 whether any appears as the hiring company or publisher.

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
