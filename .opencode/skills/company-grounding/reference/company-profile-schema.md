# Company Profile Schema

Add or update this block inside `ai/{company}/{slug}-application.json`:

```json
{
  "company_profile": {
    "description": "",
    "mission": "",
    "vision": "",
    "values": [],
    "products": [],
    "services": [],
    "target_customers": [],
    "industry": "",
    "business_model": "",
    "recent_signals": [],
    "source_notes": [
      {
        "claim": "",
        "source_type": "official_site",
        "source_url": "",
        "confidence": "direct"
      }
    ]
  }
}
```

Do not add `open_roles`, apply links, or application-question data to `company_profile`. Those belong to the final-stage `job-application-links` skill.
