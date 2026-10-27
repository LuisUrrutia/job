---
id: 3
title: System Architect
company: Vitamina Holding
location: Santiago, Chile
years: 2019 - 2022
tech:
  - React
  - TypeScript
  - JavaScript
  - Redux
  - Express.js
  - Tailwind CSS
  - Python
  - C#
  - .NET Framework 2.0
  - .NET Framework 4.x
  - .NET Core
  - ASP.NET
  - Git
  - MSSQL
  - MySQL
  - Node.js
  - Amazon Web Services (AWS)
  - Kubernetes
  - Docker
  - Angular
  - Azure
  - Azure DevOps
  - Datadog
---

## Contributions

- Improved architecture and delivery process for a legacy internal platform built on .NET Framework and Microsoft tooling, where releases depended on multiple approval meetings and manual documents.
- Worked with product, engineering, and infrastructure teams to replace months-long waits to review completed supplier work with partial deliveries, demos, and sprint reviews every two weeks, plus ongoing feedback on working versions hosted on company servers.
- Defined architecture, set priorities, and coordinated modernization from ASP.NET to Angular and from .NET Framework to .NET Core, removing Internet Explorer-only constraints and enabling Chrome compatibility while preserving existing functionality; an assigned developer implemented the browser migration.
- Implemented transaction-related API flows with Express.js, including integrations with Transbank for payment processing use cases.
- Introduced DevOps practices and led a staged migration from on-prem to Azure hybrid infrastructure across applications, databases, jobs, storage, and networking.
- Drove changes to a document-heavy, vendor-led waterfall process, introducing Agile ways of working, faster communication, and direct collaboration with internal users to prioritize modernization.
- Coordinated Docker-based CI/CD adoption for internal development environments and the customization of legacy .NET Framework build and deployment automation for existing servers.
- Introduced Azure DevOps for project management, source repositories, and CI/CD, replacing source-code handoffs through compressed archives.
- Helped establish an internal development capability alongside external providers, with a couple of developers hired to deliver internal work and support legacy applications.
- Shaped new development around C# and .NET Core services with APIs so the company's applications could communicate with one another.
- Defined project architectures and technology guidance and coordinated provider selection and assignments to keep new developments consistent with the existing technology environment.
- Agreed technical guidelines with external providers before implementation, balancing flexibility in development with constraints from the company's existing technology and support arrangements.
- Helped introduce Datadog error logging, APM, and alerts, helping the team identify failure causes faster than under the previous document- and approval-based process for accessing logs.
- Defined observability roles, permissions, alert recipients, and incident-response coordination with IT and providers, and took responsibility for preparing a workshop on the workflow and its benefits.

## Details

### Architecture role and transformation mandate

Vitamina was an early childhood education institution, the type known in Chile as a "jardin infantil." Its central management platform covered enrollment and new registrations, payments, contracting, content campaigns, and promotions. It was the main system for managing the organization's operations.

Vitamina hired me as a System Architect to make a substantial change in its technology and delivery practices. The work amounted to a digital transformation: modernizing old applications, changing how projects moved through the organization, and bringing the technology area into closer contact with the rest of the business.

My responsibilities covered business culture, technology, and processes. I prioritized initiatives and organized coordination responsibilities. I defined project architectures, guided technology choices, and coordinated the selection and assignment of external providers for other developments. The aim was to keep those projects consistent with the technology environment the company already had.

The starting point combined legacy software with a slow, approval-heavy process. Development depended on external providers; the company did not initially have an in-house development team. Technology was largely isolated from other departments instead of working directly with them to understand their needs.

### Legacy applications and the Internet Explorer dependency

The company had applications built on .NET Framework 2.0 and .NET Framework 4.x. Its main and most important application was the .NET Framework 2.0 system, which worked only with Internet Explorer 8. Workstations needed that browser installed and kept at that version so people could use the application.

This browser dependency became one of the clearest pain points when we spoke with internal users. We investigated the requirements for removing it so employees could use other browsers. The earlier career record documents modernization from ASP.NET to Angular and from .NET Framework to .NET Core, with Chrome compatibility as a delivered outcome. The broader goal was to let users choose their browser without depending on Internet Explorer.

We migrated parts of the system while preserving the existing functionality. Retaining what the application already did was a requirement of the modernization.

I did not write the code for this migration. Because my responsibilities covered the wider transformation, I requested a developer and the company assigned one to work with me. That developer implemented the changes that removed the IE8 dependency and enabled use of other browsers. I prioritized and coordinated the work and defined its architectural direction.

### How delivery worked before the changes

The previous process followed a waterfall model, with documents and approvals passed between the project manager, CTO, external provider, architect, and IT team:

1. The project manager gathered requirements and wrote the proposed scope, supporting documents, and diagrams. The CTO reviewed and approved that material before supplier selection could proceed.
2. The company sought external providers and obtained quotations. Those alternatives went back to the CTO for approval of a provider.
3. The internal team met with the chosen provider to explain the requirements, existing systems, and any integrations the project needed.
4. The provider prepared another set of documents describing its work plan, schedule, and delivery approach. These also went to the CTO for approval before development started.
5. The provider developed the solution. Delivery was organized around receiving the completed work rather than short feedback and release cycles.
6. Before handoff, the provider prepared infrastructure requirements, server execution instructions, scope documentation, and any required migration procedures.
7. The architect reviewed those documents and the code. Problems or disagreements with the implementation sent the work back to the provider for correction and another review.
8. Once the architect approved it, the project manager assembled another request for CTO approval. Further documentation then went to IT so it could provision and configure the servers and application.
9. Before deployment, a meeting established when and how the release would happen and fixed a deployment date.
10. After deployment, another meeting reviewed the result, followed by a report on how the release had gone.

Formal confirmations generally happened through email. Work could wait a day for someone to read and answer a message, or require finding the person in the office. The workflow offered little opportunity for fast iteration: for a project that took six months, users could wait that long for delivery, with additional delays if review sent it back to the provider. Even a bug could remain unresolved for months under this process.

### Changing collaboration and supplier delivery

Part of my responsibility was to introduce Agile development practices and reduce the bureaucracy around delivery. This involved changing company culture as well as tools. We began working more directly with internal stakeholders to identify their biggest pain points and decide which legacy technology problems to address first.

We moved toward chat-based communication instead of relying on email confirmations for every exchange. We also looked for providers willing to work with Agile methods. External suppliers remained part of delivery, so the changes had to improve that collaboration rather than assume all development would immediately move in-house.

I worked with product, engineering, and infrastructure teams to simplify delivery. We adopted Agile working practices with providers: deliveries were partial, and we reviewed them through demos every two weeks, on a sprint-like cadence.

Our team requested demos from providers, shared them internally, and collected any additional feedback. We relayed those comments back to the providers.

Because the work ran on our own servers, we could inspect the current version whenever needed and give feedback continuously, not only at the scheduled reviews. This was an important change from waiting months for completed work before providing feedback. The two-week interval describes the review cadence for partial deliveries.

### Provider agreements and technology constraints

Before implementation, we presented the proposed approach and technical guidelines to external providers. They confirmed whether they could deliver within those guidelines. We aimed to give providers flexibility to make development easier while retaining the requirements that mattered to the company, including consistency with technologies it already used.

There was resistance to moving away from established technologies. In database decisions, the company strongly preferred SQL Server over alternatives because its agreement with Microsoft provided access to support. This made the existing support arrangement a factor in technology selection.

### Development environments, containers, and delivery automation

We worked to allocate infrastructure to development and configured CI/CD processes using Docker. Applications could be brought up inside the company's environment without waiting for the entire finished-project documentation and handoff sequence. Containers reduced the amount of manual setup needed to run the application, while environment-specific work such as assigning URLs and configuring certificates could still remain manual.

The aim was to make applications available within our environment earlier and reduce repeated server configuration. This development-environment change was part of the move toward shorter delivery cycles, not evidence that every production approval was removed.

Legacy applications required a different approach. Integrating CI/CD with old .NET Framework applications was a substantial challenge because builds and deployment had to fit the server infrastructure already in place. We developed a customized process to build the legacy code and integrate it with those existing servers instead of assuming the same container workflow covered every application.

### Azure DevOps and source-code handoffs

Source code had been handed over through compressed archives. We introduced Azure DevOps for project management, source repositories, and CI/CD execution. This gave the development process a repository-based home alongside the work to automate builds and deployments.

### New .NET Core services and internal development

For new development, we chose .NET Core while retaining C# as the language. We moved the architectural direction from monolithic applications toward services that exposed APIs. Almost all of the company's services needed to connect to one another at some point, so making those interactions possible was a concrete reason for that choice. The APIs also left a way to connect additional systems later.

Alongside the supplier changes, the company hired a couple of developers for internal work and support of the legacy technology. Establishing that capability was intended to make support and small internal changes more responsive, given that bugs could previously remain open for months. Providers continued to contribute; this was not a complete replacement of outsourced development.

### Satisfaction surveys and response synchronization

One new development was a satisfaction-survey system that synchronized responses with another platform.

### Daily childcare records and parent communication

Another system was implemented to manage children's daily care at each childcare center. Early childhood educators recorded attendance, whether children had eaten, bowel movements, and behavioral observations. The system also supported photos for parents and communications with them, with information organized by center.

Educators used a web application on tablets. Families received the daily information at the end of the day, while specific communications were sent by email. The system connected to the central enrollment system to retrieve children's data.

### Payment integrations

The earlier career record also includes transaction-related API work with Express.js and Transbank integrations.

### Migration to hybrid Azure infrastructure

The on-premises servers were aging, and the company was considering buying replacements. An existing education-related agreement with Microsoft offered lower pricing, which we took advantage of for the move to Azure.

I led a staged migration from on-premises infrastructure to a hybrid Azure environment, covering applications, databases, jobs, storage, and networking. Legacy applications that were difficult to move remained on the existing servers, with plans to migrate them later.

One of my architectural decisions was to link Azure with the on-premises servers to support data migration and queries. Security and keeping data access as fast as possible were priorities. For this legacy integration, we chose direct database access because creating and exposing an API on top of the existing applications would have been more complicated.

Access from Azure supported both reading and writing to the legacy database, so systems could update information when needed.

### Observability with Datadog

We introduced Datadog with error logging, application performance monitoring (APM), and alerts. Before that, the monitoring platform only checked whether an application was reachable; it did not provide error logging or APM.

Obtaining diagnostic logs required preparing documentation, submitting a formal request, getting authorization from the CTO, and waiting for someone to retrieve and provide the records. Logs existed, but this bureaucratic process delayed access to them during investigations.

Datadog changed how we responded to incidents and helped us identify failure causes much faster than under that request-driven process.

I defined observability roles and permissions, decided who would receive which alerts, and established how incident response would be coordinated with IT and external providers. I was also responsible for preparing a workshop to explain how the new observability workflow would work and its benefits.

### Timing and the pandemic

The transformation took time and was already underway when the pandemic began. The move toward chat-based communication helped the wider company at that point. This was a benefit of changes started beforehand, not a transformation initiated in response to the pandemic.

## Open questions

- Core application: enrollment, payments, contracting, content campaigns, and promotions are confirmed. The specific internal user groups and the meaning of "contrataciones" remain unspecified; do not assume it refers to staff hiring rather than enrollment or service contracts.
- Browser modernization: migration of parts of the system while preserving existing functionality is confirmed, alongside the earlier Angular, .NET Core, and Chrome compatibility evidence. The exact migration sequence, component boundaries, and technical approach remain unspecified. Do not infer a complete rewrite, an unchanged database schema, zero downtime, or compatibility testing across every browser.
- Delivery-cycle measurement: earlier wording described reducing delivery cycles "from months to about two weeks." The candidate has now confirmed partial deliveries and demo reviews every two weeks, with continuous access and feedback between reviews. Use that concrete cadence rather than interpreting it as two-week end-to-end project delivery, production release frequency, or bug-resolution time. Those measurements remain unspecified. The earlier six-month project was an illustration of the waterfall process, not a measured average.
- Chat platform: Microsoft Teams was mentioned as an example of the kind of communication tool introduced. Confirm the actual product before listing Teams as a role technology.
- Legacy automation: .NET Framework 4.x is confirmed, but its exact minor version and the build tools, server configuration, and pipeline implementation remain unspecified. The transcribed phrase "Next 4.0" does not establish use of Next.js. Do not infer that the .NET Framework 2.0 application was containerized or that all legacy applications used the same pipeline.
- Internal team: the company hired a couple of developers for internal work and legacy support. The candidate requested and received an assigned developer for the browser migration, which he prioritized and coordinated rather than coding himself. Recruiting and formal line-management responsibilities have not been established.
- Service boundaries and delivery: the API-based direction, integration need, architectural guidance, and provider coordination are confirmed. The service boundaries, production rollout sequence, and implementation assignments for other developments remain unspecified. Keep the browser migration's confirmed division of responsibilities separate from other projects, and do not assume a complete microservices rewrite.
- Satisfaction surveys: responses were synchronized with another platform. HubSpot is a tentative recollection, not a confirmed integration product. The destination platform and synchronization mechanism remain to be confirmed.
- Hybrid connectivity: read and write access to the legacy database is confirmed, but the link technology remains unspecified. Do not infer VPN, ExpressRoute, specific security controls, or a measured latency improvement.
- Observability: operating responsibilities and workshop preparation are confirmed. No measured reduction in diagnosis or resolution time has been provided. The workshop reference transcribed as "DAO" may refer to Datadog; it does not establish a separate technology.
- Pandemic outcome: the wider company benefited from chat adoption, but the account does not establish a company-wide remote-work rollout, its size, or a quantified continuity outcome.
