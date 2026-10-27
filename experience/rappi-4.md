---
id: 4
title: Software Engineer
company: Rappi
location: Colombia, Remote
years: 2020 - 2021
tech:
  - Go
  - Python
  - TypeScript
  - JavaScript
  - Git
  - PostgreSQL
  - Node.js
  - Redis
  - Amazon Web Services (AWS)
  - Angular
  - Docker
  - Kubernetes
  - Kafka
---

## Contributions

- Built backend integrations for merchant ingestion pipelines, normalizing data from FTP, APIs, SOAP XML feeds, and web scraping to support pricing, stock, availability, bundles, and product attributes.
- Built an internal integration and onboarding platform with Go, Node.js, and Angular, enabling other business areas to configure merchant integrations and removing dependency on an external engineering support team that cost $75,000 annually.
- Implemented real-time catalog and pricing updates with Go and Kafka so product and discount changes reached the app faster, contributing to a 21% increase in CSAT and improved NPS.
- Migrated several remaining merchant integrations from Python to Go; the core was already in Go.
- Adapted the catalog-ingestion core's consumption interface for queue-driven update triggers while reusing its internal processing logic, retaining cron-triggered work for some sources and enabling webhook-triggered real-time processing.
- Addressed idempotency risks from overlapping manual and automatic updates across multiple workers, and prioritized team-triggered manual updates over queued events to address errors promptly.
- Drove unit testing for critical pricing, offers, and bundles logic with an 80% coverage target, reducing critical rollout defects by 33% and improving release confidence.

## Details

### First remote role and asynchronous collaboration

Rappi was my first remote job. I learned to work remotely, including substantial asynchronous collaboration.

### CPGs Integrations and merchant catalogs

I worked in the CPGs Integrations team. I developed merchant integrations to process catalogs, products, promotions, and discounts. The integrations consumed information from FTP, APIs, SOAP, XML, and even web scraping, and normalized it to support pricing, stock, availability, bundles, and product attributes.

I worked with both Go and Python in this role.

### Configuration-driven onboarding and external engineering support

Before the internal platform, merchant integrations were configured through a configuration file that engineers had to edit. When another team needed to onboard a new merchant, it contacted an external engineering support team, which handled the configuration changes.

That external support team cost $75,000 per year. Depending on a third party to make those changes also slowed the onboarding process.

### Internal integration and onboarding platform

I built the internal web platform myself using Go, Node.js, and Angular. It let people in other business areas, including customer service teams, create merchant integrations through a web interface instead of relying on engineers to edit configuration files. This removed the dependency on the external engineering support team and made onboarding easier for those areas.

Users could configure how a merchant's product catalog was consumed. For FTP-based ingestion, they could specify the file format, including JSON, CSV, or TSV, and define fields and their mappings. For API-based ingestion, they could specify which API to call to retrieve the information.

### Porting remaining integrations from Python to Go

I migrated several remaining merchant integrations from Python to Go. The core was already in Go; my language-migration work concerned integrations, not the core. This was separate from changing the core's consumption interface to use queues.

### From scheduled processing to update triggers

Catalog ingestion and processing had relied on cron jobs. I adapted the catalog-ingestion core's consumption interface to process update triggers through queues.

The processing service received events that triggered updates, not already-normalized product events. Some updates still originated from cron jobs, while other triggers allowed real-time processing. For example, receiving a webhook message could trigger processing so product and discount changes reached the application without relying solely on the scheduled runs.

The earlier source profile identifies Go and Kafka for the real-time catalog and pricing work. The interview adds the distinction between the update trigger and the product data processed afterward, and confirms that cron-triggered and real-time updates coexisted.

### Idempotency and priority across workers

Previously, the core took a file and processed it; duplicate handling could be managed within that processing flow. Event consumption allowed several workers to listen for jobs, making coordination between overlapping updates important.

I addressed idempotency risks where the same work could start twice. For example, a manually requested update and an automatic update could overlap and trigger duplicate processing.

Duplicate protection operated at the individual product level because product information could differ between consumed files. Each product had its own independent hash. Files such as CSVs were also checked using a fingerprint hash: a file with an unchanged hash was not consumed again.

Manual update events issued by our team had priority over events already waiting in the queue. This was intended to let us address errors as quickly as possible.

This was one of the more involved parts of the change, but it was manageable. The core was already well structured, so the main work was changing the consumption interface and adding queue handling while reusing the existing internal processing logic.

### Unit testing for pricing, offers, and bundles

I pushed for better unit testing within the project, particularly for critical pricing, offers, and bundles logic. We aimed for 80% code coverage; this was a target, not a confirmed measurement of achieved coverage. The testing work helped reduce regression problems we had been experiencing.

## Open questions

- Configuration format: the candidate tentatively recalls YAML. Editing a configuration file is confirmed; its exact format is not.
- External support cost: $75,000 per year is confirmed as the cost of the external engineering support team whose involvement was no longer needed. The earlier wording called this an annual saving. Do not treat it as a measured net saving after platform development and operating costs without a cost basis.
- Outcome measurement: the earlier outcome figures retained in the contributions are a 21% increase in CSAT, improved NPS, and a 33% reduction in critical rollout defects. This account confirms faster event-triggered updates and fewer regression problems, but does not add measurement periods, baselines, or attribution details for those earlier figures. The 80% coverage figure is a target.
- Conflict resolution: the earlier source states, "Engineered a Redis-based conflict resolution layer that prioritized real-time event processing over scheduled tasks, handling duplicate and out-of-order updates while improving product data accuracy and reliability by 40%." The candidate now recalls idempotency across workers, independent product hashes, file fingerprints, and priority for manual updates, documented above. The Redis implementation, product freshness rules, out-of-order handling, and 40% claim remain unconfirmed. The mention of update timing and the latest version does not establish how the system selected the most recent product information. Do not replace the confirmed manual-update priority with the older, broader real-time-versus-scheduled claim. The transcribed names "Rails" and "Race" do not establish separate technologies. Redis remains in the technology list from the earlier profile.
