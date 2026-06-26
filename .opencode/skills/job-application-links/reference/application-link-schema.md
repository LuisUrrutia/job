# Application Link Schema

Create `ai/{company}/{slug}-apply.json` as the final-stage application routing and answer-prep artifact.

```json
{
  "job": {
    "position": "Example Role",
    "company": "Example Company"
  },
  "application_route": {
    "recommended_apply_url": "",
    "source_type": "official_company_site",
    "match_status": "likely_match",
    "match_reason": "",
    "alternate_urls": [
      {
        "url": "",
        "source_type": "ats_job_board",
        "reason": ""
      }
    ]
  },
  "page_inspection": {
    "status": "inspected",
    "blocked_reason": "",
    "page_url": "",
    "required_uploads": ["resume"],
    "visible_questions": [
      {
        "id": "question-001",
        "label": "Why are you interested in this role?",
        "required": true,
        "answer_type": "short_text",
        "suggested_answer": "",
        "grounding_sources": ["info.json", "jd.json", "company_profile"],
        "notes": ""
      }
    ]
  },
  "source_notes": [
    {
      "claim": "",
      "source_url": "",
      "confidence": "direct"
    }
  ]
}
```

## Field Rules

- `source_type`: use `official_company_site`, `company_linked_ats`, `ats_job_board`, `recruiter_link`, `third_party_repost`, or `unknown`.
- `match_status`: use `likely_match`, `possible_match`, `not_match`, or `unknown`.
- `page_inspection.status`: use `inspected`, `partially_inspected`, or `blocked`.
- `required_uploads`: list visible upload requirements such as `resume`, `cover_letter`, `portfolio`, or `other`.
- `visible_questions[].answer_type`: use `short_text`, `long_text`, `yes_no`, `single_select`, `multi_select`, `number`, `date`, `file_upload`, or `other`.
- `visible_questions[].suggested_answer`: write in English. Use an empty string when the truthful answer needs user input or the answer is a file upload.
- `grounding_sources`: list the source artifacts or clarifications that support the answer. Do not cite a source that was not actually used.
