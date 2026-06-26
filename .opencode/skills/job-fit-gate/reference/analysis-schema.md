# Analysis JSON Schema

Create `ai/{company}/{slug}-analysis.json` from the requirement-led JD contract. Consume employer requirements by stable `requirements[].id`, never by copied prose.

```json
{
  "job": {
    "position": "Python Tech Lead",
    "company": "ExampleCompanyName"
  },
  "candidate_constraints": {
    "location": "Outside United States",
    "work_authorization": "No US work authorization",
    "visa_or_sponsorship_needed": true,
    "other_constraints": []
  },
  "fit_analysis": {
    "requirement_pass": "3/5",
    "strengths": [
      {
        "text": "Production Python backend experience matches the core technical screen",
        "requirement_ids": ["req-002"]
      }
    ],
    "gaps": [
      {
        "requirement_id": "req-003",
        "status": "missing",
        "severity": "major",
        "reason": "No grounded Kubernetes production evidence found"
      }
    ],
    "eligibility_risks": [
      {
        "requirement_id": null,
        "constraint_id": "constraint-002",
        "severity": "blocker",
        "constraint": "US work authorization required",
        "candidate_state": "No US work authorization",
        "source_quote": "Candidates must be authorized to work in the US."
      }
    ],
    "resume_focus_priority": [
      {
        "rank": 1,
        "focus": "Lead with backend architecture and Python production evidence",
        "requirement_ids": ["req-001", "req-002"],
        "screening_priority_id": "screen-001",
        "screening_priority_rank": 1
      }
    ],
    "keyword_usage": [
      {
        "term": "microservices",
        "action": "repeat only where backed by existing resume evidence",
        "requirement_ids": ["req-002"]
      }
    ],
    "recommendation": "apply_with_risks"
  },
  "requirement_evidence_map": [
    {
      "requirement_id": "req-002",
      "status": "matched",
      "severity_if_missing": "major",
      "evidence": [
        {
          "role": "Senior Software Engineer, Example Corp",
          "bullet": "Built backend services in Python for customer-facing workflows"
        }
      ]
    }
  ]
}
```

## Field Rules

Use `requirement_evidence_map[]` as the proof ledger. Include exactly one entry for each JD requirement ID.

Set each map item with:

- `requirement_id`: stable ID from `jd.json`.
- `status`: one of `matched`, `partial`, or `missing`.
- `severity_if_missing`: one of `blocker`, `major`, or `minor`.
- `evidence`: grounded resume evidence. Use an empty array when status is `missing`.

Reference stable requirement IDs in `strengths`, `gaps`, `resume_focus_priority`, and `keyword_usage` when the point ties to a requirement.

Use `null` for `eligibility_risks[].requirement_id` only when the risk comes from an employer constraint rather than a requirement row. In that case, set `constraint_id` to the stable JD constraint ID.

Do not create an `eligibility_risks[]` entry for an omitted or unsupported constraint. If the JD uses `not_stated`, an empty value, or no source quote for location, timezone, work model, visa, sponsorship, work authorization, or geography, treat it as acceptable for applying and leave it out of `eligibility_risks[]`.

Keep recommendation qualitative. Do not calculate numeric scores or weights.
