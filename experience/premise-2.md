---
id: 2
title: Software Engineer
company: Premise
location: US, Remote
years: 2021 - 2022
tech:
  - React
  - Next.js
  - TypeScript
  - JavaScript
  - Express.js
  - GraphQL
  - Apollo GraphQL
  - DataLoader
  - Material-UI
  - Tailwind CSS
  - Storybook
  - Chromatic
  - Jest
  - GitHub Actions
  - Python
  - PostgreSQL
  - BigQuery
  - GCP
  - Kubernetes
  - Docker
---

## Contributions

- Implemented a MyPremise presentation feature across frontend and backend, with React and TypeScript on the frontend, so account managers and clients could share up-to-date, often live data through a single shareable URL instead of resending PDF or PPT exports after each update.
- Contributed frontend and backend changes to the team's progressive migration from REST to GraphQL with Apollo across key entities, including updates to Express.js services and data-access optimizations with DataLoader, reducing endpoint churn, enabling more flexible data retrieval, improving selected API response times by 35%, and lowering server usage.
- Championed unit and targeted end-to-end testing, expanding coverage with Jest and adding quality gates in GitHub Actions to automate manual release checks and build confidence, enabling daily releases for some changes instead of waiting for the weekly cycle.
- Helped standardize the UI through a gradual migration to Material UI, introduced Storybook for shared component documentation and design handoff, and used Chromatic to review visual changes. With reusable components available in Figma, designers could produce some prototypes in one day instead of a week or a full sprint, alongside improved consistency and fewer UI bugs.
- Built an internal hackathon AI proof of concept using the OpenAI API for natural-language report generation, showing a faster way for teams to request and assemble data-driven reports.

## Details

### Product context and users

Premise paid contributors to complete surveys and other information-gathering tasks. These could include visiting a location to observe how products were arranged, surveying people nearby or people working there, and collecting perceptions of a brand. The company aggregated and analyzed that information to provide useful insights to business customers. This describes the business context, not data-collection or analytics infrastructure that I personally built.

Customers could explore information in the platform and create reports and visualizations. For some customers, internal account managers specialized in preparing those reports and charts on their behalf.

### Shareable presentations in MyPremise

One of the main features I worked on was a presentation feature in MyPremise. The platform already let users create reports and visualizations, but sharing them involved downloading PDF or PowerPoint files and sending them to other people. Corrections and follow-up requests meant exporting and distributing new copies, leaving recipients with different versions.

Both external customers and internal account managers had repeatedly requested a way to share presentations and show the latest changes. The feature let users edit a presentation within the platform and share a link. After a change, they could ask recipients to revisit the same link rather than send another exported file. Recipients could still download PDF or PowerPoint versions for use outside the platform.

For account managers preparing material for customers, this made the latest changes accessible without repeatedly exchanging attachments. External customers could also use the feature to present and share their information. The earlier source profile identifies React and TypeScript for this work and describes the presentations as surfacing up-to-date, often live data.

### Implementation responsibility

The product owner defined the product and its requirements. I implemented the feature across both frontend and backend, including the presentation viewer, comments, and export functionality. A colleague provided occasional help with specific tasks.

### Feedback and presentation viewing

The initial version supported presenting and downloading the material. Comments came later, in response to user feedback. I added them so users could discuss changes within the platform rather than leave it to coordinate feedback and revisions elsewhere.

Users could add comments to the presentation within the platform so the person responsible for it could review the feedback there. Keeping the presentation in the platform also gave us information about who opened it and which version they last viewed.

Internal users were enthusiastic about the feature and said it made their work much easier. They could receive and review comments in the platform instead of managing feedback through email, access the latest presentation, and see which version they were viewing. This was qualitative feedback; no measured time saving was provided.

### GraphQL migration for flexible chart data

I was one of the contributors to the migration from REST to GraphQL with Apollo, not the overall owner or the person who implemented every change.

Building charts from the available information was a core use of the platform. Different charts and customer needs required different combinations of data. A request for an additional field, an exceptional case, or a new chart type could require creating or modifying REST endpoints individually. The team was maintaining many endpoints, including some that were deprecated or no longer used.

The main reason for adopting GraphQL was to make data retrieval more flexible: the application could request the information needed for a particular chart or user requirement. It could also obtain information in one GraphQL request instead of calling several separate endpoints. This addressed the need to keep adapting endpoint responses for each variation in the charts.

### Data access and performance work

Alongside the migration, the team worked on a data-fetching layer with caching and query optimization to address N+1 access patterns. We used DataLoader in this work. We also optimized parts of the database and the queries used to retrieve information. The earlier source profile records changes to Express.js services as part of the migration.

The combined work substantially improved response times for some APIs and reduced server usage. The account attributes these results to the migration together with data-access, query, and database optimization, rather than to changing the API interface alone. Consolidating calls also reduced the need for the application to contact several endpoints to assemble the same information.

### Progressive migration by functionality

My contribution included adapting the frontend and implementing parts of the GraphQL backend. We migrated progressively by platform functionality rather than changing everything at once. For each functionality, we identified the REST endpoints it needed and worked through how to replace those calls.

For example, if a functionality made four requests, we could first replace one with a GraphQL request, then migrate the others individually. Once all four had been migrated, we worked on combining them into a single GraphQL query. REST and GraphQL therefore coexisted during the transition; consolidating requests was a later step, not a prerequisite for migrating the first call. The four-request example illustrates the approach, not a platform-wide measurement.

Retrieving information was comparatively straightforward. Migrating permission logic, handling inputs, and supporting mutations was more complicated and formed part of the work that had to be addressed as functionality moved to GraphQL.

### Automated testing and shorter release cycles

Another of my initiatives was improving unit testing and targeted end-to-end testing. This continued an approach I had advocated in previous roles: well-designed unit tests and end-to-end tests for critical user flows help prevent functional regressions and give the team confidence that changes will work when released.

We wanted to shorten the weekly release cycle and deliver changes as quickly as practical. Users depended on the platform to work with data, and some changes needed to reach them sooner than the next weekly release.

Before this work, release checks involved manual testing around pull requests and manual smoke tests after changes reached production. We automated those checks, introducing test coverage checks and quality gates in GitHub Actions, with unit tests and end-to-end tests focused on critical functionality. The earlier source profile identifies Jest for the test-coverage work; the end-to-end framework is not specified in this account.

The automation reduced the manual testing burden and increased the team's confidence in releasing changes sooner. Some changes were released daily, but this was not a fixed daily cadence for every release. The result was the ability to release more frequently when needed, rather than a claim that all releases took less than 24 hours or that every kind of manual testing was eliminated.

End-to-end coverage focused primarily on report creation, one of the platform's most important workflows. It also covered creating different types of charts, with priority given to the most frequently used types.

### Gradual UI standardization with Material UI

The interface had been assembled from custom-built components without a standardized UI foundation. We wanted a consistent set of components and resources that could also be used by the design team in Figma.

We chose Material UI in part because its Figma resources were already available. We migrated the existing interface to Material UI gradually, replacing individual pieces rather than rebuilding the whole interface at once.

### Reusable components and collaboration with design

I introduced Storybook for shared component documentation and closer coordination with design. We also used Chromatic to review visual changes as the interface evolved. The emphasis was on reusable UI pieces, not just complete screens, so parts could be used again in different contexts.

We created reusable components for certain chart types, primarily wrappers that adapted the charts to the platform's data format. This was adaptation and reuse of chart functionality, not a visualization library built from scratch.

The main observed outcome was faster design prototyping. Work that had previously taken about a week or a full sprint could be prototyped in as little as one day once the design team had the components available in Figma. This describes the team's observed ability to assemble prototypes using those components, not a measured average across every prototype or the time required to implement a production feature.

### Natural-language reporting proof of concept

We were exploring how to integrate AI into a product centered on data. During an internal hackathon, I built a small proof of concept using the OpenAI API to make report creation easier through natural-language requests.

The prototype interpreted the user's intent and selected charts that matched the request or would help present the requested information. It used the GraphQL schemas to determine how to request the data needed for those charts.

The AI returned structured JSON, which the application used to make the data requests and then render the charts. The application handled request execution and rendering; the AI output described what to retrieve and display. This work was a proof of concept, not a confirmed production feature.

The JSON identified which GraphQL operation to call and which fields to request; it did not contain a complete GraphQL query. Our application constructed the query from that information before executing it.

The prototype was first demonstrated to engineering and the product owners. The hackathon process then selected the strongest ideas for presentation to the whole company as possible ways to integrate AI into the product.

The demo received positive, general feedback, but no concrete evaluation results. The reporting initiative was approved for implementation, but development beyond the prototype had not started. It remained pending while the team looked for time to take it on.

## Open questions

- Collaboration detail: the candidate recalls occasional help from a colleague but not the specific tasks. Do not attribute a particular component to that colleague or describe the implementation as entirely unassisted.
- GraphQL implementation detail: Apollo and DataLoader use and the team's caching, data-fetching, query, and database optimization work are confirmed. The exact batch-loading functions, cache scope, invalidation behavior, versions, and division between built-in behavior and custom implementation are not established. General implementation guidance is not evidence that the team used every documented pattern; do not infer automatic database optimization by Apollo.
- GraphQL outcome measurement: the earlier profile's 35% response-time improvement remains in Contributions. The interview confirms a substantial improvement for some APIs and reduced server usage, but does not establish the metric's baseline, measurement period, affected operations, or individual attribution.
- Figma integration: component availability and use for faster prototyping are confirmed. The exact tooling and import workflow are not specified. Do not infer automatic synchronization or a specific plugin.
