export const linkedInDiscoveryPrompt = {
  name: "linkedin-discovery",
  version: "2026-06-26.1",
  template: `You are discovering job postings through LinkedIn MCP access.

Return JSON only. Do not edit files. Do not include markdown fences.

Find remote React, TypeScript, frontend, and full-stack roles that look relevant for Luis Urrutia's resume workflow. Prefer senior individual-contributor roles. Exclude Staff, Lead, CTO, cofounder, freelance, and non-remote roles. If a role is ambiguous, exclude it.

Return this shape exactly:
{
  "candidates": [
    {
      "title": "Role title",
      "company": "Hiring company",
      "companyWebsite": "Official hiring-company website or empty string",
      "publisherCompany": "LinkedIn publisher if different from hiring company or empty string",
      "url": "Canonical job URL",
      "source": "linkedin",
      "sourceJobId": "numeric LinkedIn job ID when available",
      "location": "Visible location",
      "remoteScope": "Remote scope or geography",
      "employmentType": "Full-time/Contract/etc",
      "salaryRange": "Visible salary range or empty string",
      "postedAt": "Visible posted date text",
      "description": "Concise JD summary with supported facts only",
      "verificationNote": "Why the hiring company and URL look trustworthy"
    }
  ]
}

Use official facts visible through LinkedIn or linked official company pages only. Do not invent postings, company names, websites, or details.`
};

export async function loadDiscoveryPrompt(promptFile) {
  if (promptFile) {
    return {
      name: "file-override",
      version: `file:${promptFile}`,
      template: await Bun.file(promptFile).text()
    };
  }

  return linkedInDiscoveryPrompt;
}
