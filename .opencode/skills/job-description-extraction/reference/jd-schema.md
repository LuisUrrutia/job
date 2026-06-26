# JD JSON Schema

Create `ai/{company}/{slug}-jd.json` as a compact recruiter and ATS decision model. Extract what drives screening and tailoring. Do not archive the whole post.

Use `requirements[]` as the only source of truth for employer requirements. Other sections may summarize, group, or cross-link to these IDs, but must not create a second requirement list.

Use `not_stated` when the JD omits location, compensation, visa, sponsorship, or work authorization.

Use short source quotes for every high-risk field:

- High-priority requirements
- Eligibility, visa, sponsorship, or work authorization
- Geography or relocation constraints
- Compensation
- Red flags and candidate-risk notes

## Top-Level Structure

```json
{
  "position": "Python Tech Lead",
  "company": "ExampleCompanyName",
  "department": "Engineering",
  "employment_type": "full-time",
  "seniority_level": "lead",
  "work_model": {
    "id": "constraint-work-model",
    "state": "remote",
    "source_quote": "This role is remote within the United States."
  },
  "location": {
    "id": "constraint-location",
    "state": "United States",
    "source_quote": "Remote within the United States"
  },
  "compensation": {
    "id": "constraint-compensation",
    "state": "not_stated",
    "source_quote": null
  },
  "eligibility": {
    "id": "constraint-eligibility",
    "visa": "not_stated",
    "sponsorship": "not_stated",
    "work_authorization": "Must be authorized to work in the US",
    "source_quote": "Candidates must be authorized to work in the US."
  },
  "requirements": [
    {
      "id": "req-001",
      "text": "5+ years of backend engineering experience",
      "category": "experience",
      "priority": "high",
      "confidence": "high",
      "evidence_type": "explicit",
      "source_quote": "5+ years of backend engineering experience"
    },
    {
      "id": "req-002",
      "text": "Production Python experience",
      "category": "technical_skill",
      "priority": "high",
      "confidence": "high",
      "evidence_type": "explicit",
      "source_quote": "Strong production experience with Python"
    }
  ],
  "responsibilities": [
    {
      "text": "Lead backend architecture and guide implementation across the team",
      "requirement_ids": ["req-001", "req-002"]
    }
  ],
  "success_outcomes": [
    {
      "text": "Improve reliability for customer-facing services",
      "requirement_ids": ["req-002"]
    }
  ],
  "keyword_signals": [
    {
      "term": "microservices",
      "reason": "ATS and recruiter term repeated in platform responsibilities",
      "priority": "medium"
    }
  ],
  "screening_priorities": [
    {
      "id": "screen-001",
      "rank": 1,
      "reason": "Backend leadership is central to the role scope",
      "requirement_ids": ["req-001", "req-002"],
      "evidence": "Lead backend architecture"
    }
  ],
  "employer_constraints": [
    {
      "id": "constraint-001",
      "type": "geography",
      "state": "United States",
      "source_quote": "Remote within the United States"
    },
    {
      "id": "constraint-002",
      "type": "work_authorization",
      "state": "Must be authorized to work in the US",
      "source_quote": "Candidates must be authorized to work in the US."
    },
    {
      "id": "constraint-003",
      "type": "travel",
      "state": "not_stated",
      "source_quote": null
    },
    {
      "id": "constraint-004",
      "type": "schedule",
      "state": "not_stated",
      "source_quote": null
    }
  ],
  "candidate_risk_notes": [
    {
      "id": "risk-001",
      "text": "Role may be inaccessible for a candidate outside the United States without US work authorization",
      "severity": "blocker",
      "requirement_ids": [],
      "constraint_ids": ["constraint-001", "constraint-002"],
      "source_quote": "Candidates must be authorized to work in the US."
    }
  ],
  "red_flags": [
    {
      "id": "risk-002",
      "text": "No compensation range is disclosed",
      "severity": "minor",
      "constraint_ids": ["constraint-compensation"],
      "source_quote": null
    }
  ]
}
```

## Field Rules

Set each requirement with:

- `id`: stable lowercase ID, such as `req-001`; keep it stable for the same JD across later edits.
- `text`: concise employer requirement in human-readable language.
- `category`: one of `experience`, `technical_skill`, `domain`, `leadership`, `education`, `certification`, `language`, `eligibility`, `geography`, `compensation`, `security_clearance`, or `other`.
- `priority`: one of `high`, `medium`, or `low`.
- `confidence`: one of `high`, `medium`, or `low`.
- `evidence_type`: one of `explicit`, `repeated`, `inferred_from_responsibilities`, or `company_site_repair`.
- `source_quote`: a short JD quote when the requirement is high priority or the field carries eligibility, geography, compensation, or candidate risk. Use `null` only when no quote exists because the value is inferred or not stated.

Give every downstream-cited constraint, screening priority, candidate-risk note, and red flag a stable ID. Use `constraint-*`, `screen-*`, and `risk-*` prefixes unless a clearer stable prefix already exists in the file.

Keep extraction employer-side. Capture constraints and candidate risks for the fit gate, but do not decide whether the candidate should apply.

Keep `keyword_signals[]` separate from `requirements[]`. Use it only for ATS or recruiter terms worth repeating in the resume.

Rank `screening_priorities[]` qualitatively. Include `id`, `rank`, `reason`, `requirement_ids`, and `evidence`. Do not assign numeric weights.
