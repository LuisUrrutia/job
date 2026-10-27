---
id: 6
title: Fullstack Developer
company: Dxpress
location: Santiago, Chile
years: 2015 - 2017
tech:
  - Python
  - Go
  - JavaScript
  - Node.js
  - TypeScript
  - Angular
  - AngularJS
  - Flask
  - PostgreSQL
  - Redis
  - Tile38
  - Google Cloud Platform (GCP)
  - Git
  - Vagrant
  - Docker
  - Docker Compose
  - Cassandra
  - RabbitMQ
  - WebSockets
  - Webpay Oneclick
  - Google Cloud Messaging (GCM)
---

## Contributions

- Contributed to building Dxpress from idea through launch and live restaurant-delivery operations in Chile, working with a small product and engineering team inside an investment firm.
- Focused on backend development across Python and Go services, building platform capabilities for advanced search, geolocation, real-time operational features, and product ETL workflows.
- Developed ETL pipelines that ingested and normalized product data from manual uploads, APIs, web scraping, and FTP CSV files, supporting catalogs with more than 5,000 products.
- Applied frontend skills in Angular for operational interfaces, and managed business metrics, performance monitoring, and deployment workflows to support continuous process improvements.
- Helped define the greenfield product and its requirements across customer, courier, restaurant, and administrative applications.
- Co-designed and implemented the backend as one of two backend developers, sharing technical decisions across a general Python API and a dedicated courier location and assignment service; part of the location service was later migrated to Go.
- Took direct responsibility for integrating Webpay Oneclick, drawing on prior payment-integration experience at Laboratorio de Ideas.
- Contributed to an MVP completed in about six months; management then extended development by a couple of months to add features while restaurant agreements were being finalized.
- Supported AngularJS frontend development and a later partial migration to Angular 2 with TypeScript; mobile contributions were on the backend/API side, not iOS or Android client development.
- Worked with a Vagrant development environment that later moved to Docker, and with office-hosted infrastructure before production deployment on Google Cloud.
- Used Cassandra for some order-related functionality and Redis for caching.

## Details

### Joining a greenfield startup

The company was created specifically to build a food-delivery platform in Chile, similar to the Uber Eats model we were studying in the United States. A Chinese investor backed the venture, and another person was responsible for bringing together the technical team. I received an attractive offer and moved from the software-factory environment into a startup.

There was no existing product or codebase when I joined. We started with product research and requirements: what we wanted to build, how food delivery should work, how restaurants would receive and manage orders, and how couriers would be located and assigned. At this stage, we were still working out the operating model and did not yet have a courier workforce in place.

### Product surfaces, team responsibilities, and working practices

The scope included separate experiences for customers, couriers, restaurants, and internal administrators. We planned mobile applications for customers and couriers. Restaurants would receive orders through a web platform, and the administrative platform would also be web-based.

I worked mainly on the backend alongside another developer. As the two backend developers, we shared responsibility for designing and implementing the entire backend, including the general API, location service, and automatic courier assignment and reassignment. We made technical decisions collectively as a team, and my contribution was not limited to a single backend module.

Other teammates focused on the frontend, and I also helped there because I already knew AngularJS. After gathering the requirements and deciding what we wanted to build, we hired a designer to help with the interfaces.

We adopted Agile ways of working, which were receiving a lot of attention at the time. The team was highly motivated by building the product from nothing.

### API design and service boundaries

We chose Python for the initial backend and AngularJS for the frontend. An API was central to the design because the same platform needed to support the planned customer and courier mobile applications as well as the web interfaces.

We designed the API structure and service boundaries from scratch. We expected some workloads, especially location updates, to become much busier than others. Rather than starting with many small services, we separated two main responsibilities: the general application API and a location service.

The location service updated courier coordinates and helped find a courier for an order. Matching needed to consider proximity, whether the courier was available rather than occupied, and other business rules. We were designing these rules alongside the product and operating model.

We also used RabbitMQ for message queues.

We used WebSockets for real-time communication in the platform.

### Automatic courier reassignment

The platform automatically searched for another nearby courier when an offer was rejected or went unanswered. Each selected courier had several seconds to respond before the search moved on.

If the search returned the same courier because they were the only nearby candidate, the system could offer them the order again. If they still did not respond or rejected the repeated offer, the system temporarily blocked that courier from all assignments and continued looking for someone else. While the block was active, the courier was excluded from candidate searches for any order, not just the original order.

When no eligible courier remained available, the operations team intervened.

### Geolocation and data stores

We evaluated PostGIS with PostgreSQL for location queries. I remember the team finding that approach limiting for what we wanted to do and looking for an alternative. This describes our assessment of the fit at the time, not a claim that PostGIS could not perform proximity queries.

We selected Tile38 for geospatial functionality, including geofencing and nearby-courier searches. Redis also served as a cache for several parts of the system. For some order-related functionality, we used Cassandra.

Later, we decided to migrate part of the geolocation service to Go. The scope was part of that service, not a rewrite of the entire backend.

The motivation was learning and professional development. Tile38 was already working in our stack, and knowing that it was written in Go sparked our interest in the language. Traffic was still low at that stage; we pursued the partial migration to gain hands-on experience with Go, not in response to high traffic.

My main takeaway was learning to work with Go itself, rather than a migration-specific lesson.

### Development infrastructure and production deployment

We initially used Vagrant for development. We later moved to Docker because bringing up the environment with Vagrant was slow for us. We used Docker Compose to bring up the development services.

During the initial development phase, we hosted the system on a physical server in the office. When we moved toward production, we chose Google Cloud as the deployment platform.

### Mobile API support and notifications

Other developers built the iOS and Android applications; I did not develop those mobile clients. My involvement was on the backend, including implementing the API endpoints they needed.

I also worked on the backend integration for push notifications using Google Cloud Messaging (GCM).

### Payment integration ownership

I was directly responsible for integrating Transbank's Webpay Oneclick. I was the only person on the team who already had payment-platform integration experience, from my previous role at Laboratorio de Ideas.

The payment flow let customers link a credit card so that the platform could make subsequent charges and issue refunds. The integration handled payments as part of the order-placement flow.

### MVP and launch preparation

We had an MVP ready to go to market after about six months. Management decided to spend a couple of additional months adding features while agreements with restaurants were being finalized. This was a team delivery milestone and a management decision, not a claim that I built the MVP alone.

Once the product was ready, the company hired couriers and ran a marketing campaign for the launch. The courier model involved hiring couriers, rather than the commission-based partner arrangement we associated with Uber Eats.

### Live operations and product evolution

After launch, we began operating in selected municipalities and cities in Chile and receiving real customer orders. Orders were mainly from restaurants; we were not yet handling supermarket orders. We had agreements with restaurants, including restaurant chains, which we considered favorable. The platform and deliveries were working relatively well, with roughly five couriers involved at that stage.

We continued adding features after launch. The team replaced the restaurant-facing web application with a mobile application while other mobile applications were already being developed. The restaurant app supported kitchen order tickets, and that workflow was also working well. This was a team-level product change; my mobile-related work remained on the backend and API side, rather than native app development.

### Business outcome and closure

The business needed a much higher volume of orders to generate sustainable margins. Although orders were coming in and delivery operations were functioning, volume did not reach the level the business needed. The company eventually closed.

### Monitoring, analytics, and frontend evolution

We implemented monitoring and observability, along with web analytics to understand how users behaved in the product.

As Angular 2 emerged during this period, we began migrating some frontend functionality from AngularJS to Angular 2 with TypeScript. This was a partial migration, not a confirmed replacement of every frontend application.

We used Node.js to run frontend build scripts and tooling for AngularJS and later Angular with TypeScript. We did not use Node.js for backend services.

## Open questions

- Company spelling and dates: the existing record is `Dxpress`, `2015 - 2017`; the spoken account says "DExpress" and places the beginning around late 2015 or early 2016. Confirm official spelling and months before changing the metadata.
- Market context: the candidate remembers a perceived gap before comparable platforms arrived in Chile and tentatively extends this recollection to Latin America. The original profile described Dxpress as one of Chile's first Uber Eats-style services. When describing the closure, he called it the first in Chile and linked insufficient demand to that early market position. The market-priority claim and that causal interpretation are unverified; they must not become "first in Chile/Latin America" or proven market-causation claims in the resume.
- Initial team size: the two-person backend team and its shared responsibility for the whole backend are confirmed. The candidate thinks the initial engineering team had four people in total, including two frontend developers; only the overall and frontend headcounts remain approximate. Confirm those counts before using them as numerical claims.
- Geospatial chronology and terminology: the candidate remembered Tile38 as "based on Redis"; historical documentation clarifies that it was an independent server using Redis's RESP protocol. He also tentatively recalls Redis lacking geolocation support at the time; Redis GEO reached stable release in May 2016, with a release candidate available in December 2015. Exact adoption dates, deployed versions, and the specific limitations encountered with PostGIS remain unknown. These historical facts do not establish the project's configuration. See [the technology timeline](../docs/research/dxpress-technology-timeline.md).
- Environment reconstruction: Docker Compose use for the development environment is confirmed. Pending details include the Vagrant provider, exact Compose service definitions, networking, volumes, local operating systems, split between local and office-server services, and Google Cloud services. Do not infer CoreOS, Kubernetes, managed cloud databases, or use of Compose in production.
- Message queues: the candidate clarified that the transcribed "Coles" meant queues and confirmed RabbitMQ. Which operations used the queues? Do not infer Celery, payment jobs, location-event transport, routing patterns, or delivery guarantees from RabbitMQ use alone.
- WebSocket workflow: use of WebSockets is confirmed. The candidate associates it with restaurant communications, possibly incoming orders or kitchen tickets, but the exact flow remains tentative. The transcribed verb "bulear" is unclear and does not establish polling or a particular implementation. Do not infer Socket.IO or a connection to RabbitMQ. Node.js was used only for frontend tooling, not backend services.
- Courier timing and implementation: response windows lasted several seconds, and a blocked courier was temporarily excluded from all assignments. The exact response interval, retry limit, block duration, reactivation mechanism, and RabbitMQ's role in this flow remain unspecified.
- Frontend transcription: one sentence says "Electron" and "Angular 10", whereas the clear parts of the account describe AngularJS followed by Angular 2 with TypeScript. Confirm whether the unclear words were "frontend" and "AngularJS" before treating Electron or Angular 10 as experience.
- Push notifications: Google Cloud Messaging (GCM) is confirmed for the candidate's backend integration. Exact notification flows and any later transition to Firebase Cloud Messaging (FCM) remain unspecified. Do not assign mobile SDK implementation to him; he explicitly described backend/API work rather than native client development.
- Payment operation: Webpay Oneclick is now confirmed; the candidate corrected the earlier recollection of Onepay. He describes "securing" the order amount at order placement, but the exact transaction mechanism is unresolved. Distinguish authorization/reservation from capture or immediate charge before using a more specific claim. Retries, duplicate-charge prevention, reconciliation, webhook handling, and measured outcomes have not been described.
- Cassandra and Go: what order data or operations used Cassandra, why was it chosen, and what remained in PostgreSQL? Which portion of the location service moved to Go? The learning-driven motivation, Tile38's influence, and low-traffic context are confirmed. No business justification or measured performance benefit has been established for the migration. Do not recast it as a response to scaling pressure or infer throughput improvements or complete migration.
- Observability and analytics: the capabilities are confirmed. Platforms, collected signals, instrumentation ownership, and outcomes remain to be established. Historically available tools are candidates for validation, not evidence of use or proof of which platform was most popular.
- Delivery and operations: live restaurant orders, roughly five couriers, continued product development, and closure after insufficient order volume are confirmed. Exact start, launch, and closure dates, named municipalities and cities, restaurant counts, order volume, financial figures, and employment terms remain unspecified. The courier count is approximate, and descriptions of things working well are qualitative rather than measured delivery or reliability results. The comparison with Uber Eats describes the team's understanding, not a verified universal statement about Uber's workforce model.
- Existing source context: Flask, product ETL from uploads/APIs/scraping/FTP CSV files, catalogs exceeding 5,000 products, advanced search, and business-metric work remain preserved from the earlier profile. They have not yet been expanded in this interview. Do not assign an exact Python framework or data-store role to a specific service beyond that evidence.

### Backend scenario reconstruction — pending validation

The following is an engineering reconstruction requested by the candidate, not additional employment evidence. Each section explores a plausible problem and design options for a delivery startup with the confirmed stack. It does not establish that the problem occurred, that the team implemented a particular solution, or that the candidate owned that work. All sections remain under `Open questions`, outside the assembled resume profile, until validated individually.

The confirmed foundation is a general Python API, a separate location service partly migrated to Go, Tile38, PostgreSQL, Redis, Cassandra, RabbitMQ, GCM, Oneclick, Docker Compose for development, and Google Cloud for production. Their exact connections are not established. Historical messaging capabilities and limitations are documented in [the backend scenario references](../docs/research/dxpress-backend-scenario-references.md).

#### 1. Courier coordinates and location freshness

A courier can appear close to a restaurant while the last coordinate is already stale. A mobile connection can drop, deliver several updates together, or send an older position after a newer one. GPS readings can also jump or carry poor accuracy.

Design options to validate include storing the observation time separately from server receipt time, rejecting malformed coordinates, preventing older updates from replacing newer positions, and defining when a location becomes too old for assignment. Tile38 could support spatial queries while another store holds operational state. A position inside a pickup geofence could be a signal, but would not by itself prove that food was collected.

#### 2. Courier availability and competing assignments

Location and availability are different pieces of information. A nearby courier may already be carrying an order, have ended a shift, or have lost connectivity. Two order-assignment requests may select the same available courier at nearly the same time.

Possible controls include explicit availability states, a temporary reservation during an offer, and a conditional update that prevents competing assignments from both succeeding. Candidate ranking could use distance and business rules; travel-time estimates, batching, or optimization algorithms are separate possibilities, not established features. The actual policy for one courier handling multiple orders needs confirmation.

#### 3. Offers, rejection, timeout, and reassignment

Automatic reassignment, several seconds to respond, another attempt for the only nearby courier, subsequent temporary exclusion from all assignments, and operations intervention when no eligible courier remained are now recorded in the confirmed narrative. The remaining scenarios concern late acceptance and competing responses.

Possible mechanisms to validate include tracking each offer's identity, status, and expiration, distinguishing a rejection from an unanswered offer in stored data, and checking that an offer is still active before accepting a late response. Operations handled the no-courier fallback; this does not establish an automated alert, a particular support tool, or the team's subsequent actions. Neither a specific timer implementation nor RabbitMQ's involvement is established by confirmation of the automatic behavior.

#### 4. Restaurant hours, temporary closure, and acceptance

A restaurant may close after a customer starts checkout, pause orders during a busy period, reject an order, or stop responding through its web interface. An item may become unavailable before the kitchen accepts the order.

Possible rules include rechecking availability when an order is submitted, distinguishing scheduled hours from a temporary pause, setting an acceptance deadline, and handling a restaurant response that arrives after cancellation. The relationship between restaurant acceptance, courier assignment, and payment is a product decision to validate, not a sequence that can be inferred from the stack.

#### 5. Order lifecycle and allowed transitions

Illustrative states might include submitted, awaiting restaurant response, accepted, preparing, awaiting courier, collected, delivered, rejected, and cancelled. These are example labels, not recovered Dxpress status names. Payment status may need to remain distinct from preparation and delivery status.

The design questions concern who may perform each transition, how repeated requests are handled, and which actions must be refused once an order reaches a terminal state. Examples include a restaurant accepting an already-cancelled order, a duplicate delivery confirmation, or a cancellation arriving as collection is confirmed. Version checks or conditional writes are possible mechanisms; their actual use is unconfirmed.

#### 6. Checkout, prices, and delivery coverage

The menu or delivery charge can change between browsing and order submission. An address can be incomplete, outside the service area, or geocoded to a location different from the customer's intended entrance.

Potential backend responsibilities include validating the basket against current restaurant data, calculating totals on the server, retaining the accepted price and item description with the order, and checking the delivery zone. Discounts, minimum-order rules, delivery-fee calculations, taxes, and address-verification providers should only be added as experience if confirmed. Neither proximity to a restaurant nor successful geocoding alone establishes deliverability.

#### 7. Card enrollment, charges, and uncertain payment results

Oneclick integration and the ability to enroll cards, charge, and refund are confirmed. The details below are candidate edge cases, not confirmed implementation work: interrupted enrollment, an expired enrollment attempt, a declined charge, repeated checkout requests, or a provider timeout after a charge may already have succeeded.

Possible safeguards include stable operation identifiers, recording provider responses, and resolving an unknown payment outcome before attempting another charge. An authorization hold and a captured charge are different operations; the account does not yet identify which operation "securing the amount" described. No particular Oneclick API version or support for a specific authorization/capture flow is assumed.

#### 8. Cancellations, refunds, and reconciliation

A customer might cancel before acceptance, a restaurant might reject after a payment operation, or delivery might become impossible after preparation starts. A refund request can itself time out or be repeated.

Topics to validate include the cancellation policy at each stage, who could request a refund, the amount eligible for return, duplicate-refund protection, and the distinction between refund requested and refund confirmed. A reconciliation process could compare local payment records with provider outcomes and flag discrepancies for operators. Full versus partial refunds, automatic versus manual processing, and any reconciliation jobs are not established facts.

#### 9. Possible RabbitMQ responsibilities

RabbitMQ use is confirmed; the mappings below are hypotheses. Queue names, event names, worker frameworks, and delivery settings are deliberately not supplied as historical facts.

| Candidate workload | Possible purpose | Failure or race to handle |
| --- | --- | --- |
| Order-state notifications | Let a worker prepare notifications after an order changes state | A delayed message describes a state that is no longer current |
| Courier-offer follow-up | Recheck an expired or rejected offer and request another assignment | A stale task reassigns an order that already has an accepted courier |
| Restaurant-response follow-up | Check an unanswered order after an acceptance deadline | The restaurant accepts at the same time the timeout is processed |
| GCM notification delivery | Move outbound push requests outside the API request path | Redelivery sends duplicate notifications; an invalid token requires different handling from a transient failure |
| Payment reconciliation | Investigate incomplete or ambiguous payment records asynchronously | Retrying a worker must not blindly create a second charge or refund |
| Catalog imports and normalization | Process uploads, API data, scraped data, or FTP CSV files outside interactive requests | Reprocessing a batch duplicates products or overwrites newer data |
| Operational analytics | Process business events without holding up checkout | Replayed events inflate counts or revenue reports |

For independent consumers that each need an event, separate subscriptions would be a candidate design; workers sharing one task queue instead divide the work. These are different arrangements. RabbitMQ transport does not define the order lifecycle, replace a database transaction, or prove that a restaurant or courier accepted an order. The [scenario references](../docs/research/dxpress-backend-scenario-references.md) distinguish these guarantees.

#### 10. Queue retries, duplicate effects, and backlog

Potential failure cases include a worker crashing before acknowledgement, a broker connection dropping, or an external operation succeeding just before the worker loses its connection. A redelivered task can therefore repeat work unless the application recognizes an already-completed operation.

Candidate mechanisms include explicit acknowledgement after the intended work, idempotent handlers, bounded retries, a delay between retries, and a place for failed messages that need investigation. These are options to validate, not a claim that they were configured. The design would also distinguish expired tasks from useful pending work, monitor backlog, and avoid unlimited immediate requeue loops. RabbitMQ acknowledgement is not evidence of an exactly-once business operation. See the [historical messaging references](../docs/research/dxpress-backend-scenario-references.md).

#### 11. Consistency between services and data stores

The general API, location service, databases, cache, and broker can disagree temporarily. An order might be committed before its follow-up message is published, or a cache might still show a courier as available after assignment.

Questions for reconstruction include which component owned order state, which owned assignment and availability, how shared identifiers were handled, and how stale views were repaired. A database-backed record of pending messages is one possible way to address the database-to-broker gap, but its use is not established. PostgreSQL, Cassandra, Redis, and Tile38 should not be assigned undocumented responsibilities merely to make the architecture appear complete.

#### 12. Notifications and mobile reconnection

GCM integration and backend endpoints for the mobile clients are confirmed. Possible challenges include changing device tokens, phones losing connectivity, duplicate or delayed pushes, and applications reconnecting after several order changes.

A possible design would make push notifications a prompt to retrieve current state from the API, with explicit application actions for accepting an offer or confirming an order event. Broker acceptance, push-provider acceptance, device delivery, and a person's business decision are distinct events. The actual notification payloads, refresh mechanism, retries, and client behavior remain to be validated; native app implementation is outside the candidate's confirmed ownership.

#### 13. API permissions and business validation

The same backend served several roles: customer, restaurant, courier, and administrator. Potential checks include limiting restaurants to their own orders, couriers to their assigned deliveries, customers to their own purchases, and privileged operational actions to authorized staff.

Other possible work includes validating state changes on the server, dealing with repeated mobile requests, maintaining compatibility across app releases, and controlling access to addresses and location history. Authentication mechanisms, token formats, audit retention, rate limits, and specific security controls are not inferred from the existence of an API.

#### 14. Catalog ingestion and product-data quality

The earlier source profile confirms ETL from uploads, APIs, scraping, and FTP CSV files, with catalogs exceeding 5,000 products. Possible implementation challenges include inconsistent encodings, missing fields, duplicate items, changing identifiers, price updates, and batches that fail partway through.

Design options to validate include a stable identity per source item, normalization before publishing data, a record of failed rows, and repeatable imports that do not duplicate products. RabbitMQ could have supported batch processing, but that connection is not confirmed. The source does not establish whether every catalog was a restaurant menu or whether these workflows also supported another part of the product.

#### 15. Observability and operational intervention

Monitoring, web analytics, and an administrative interface are confirmed. Candidate operational signals include orders waiting too long for restaurant acceptance, repeated courier rejection, stale location data, notification failures, payment mismatches, and queue backlog.

Possible support tools include an order timeline, correlation between logs and an order identifier, controlled reassignment, and visibility into pending payment operations. No dashboard, alert threshold, tracing platform, support permission model, or response-time improvement should become a career claim without evidence. Operations intervention when no courier was available is confirmed, but the tools and escalation mechanism remain unspecified.

#### 16. Performance, testing, and deployment tradeoffs

The initial location-service split anticipated a workload that could grow differently from the general API. The later partial Go migration was motivated by learning and professional development, with Tile38 sparking interest in the language while traffic was still low. These are distinct decisions. Query latency, concurrency, or deployment needs must not be substituted as motivations for the Go migration, and no measured performance improvement is established.

Potential tests include two couriers accepting competing offers, an order cancelled while a worker is running, a repeated payment request, a restaurant closing during checkout, and recovery after a broker or database restart. Docker Compose could provide a development setup for service integration, but the exact service list is not confirmed. Similarly, deploying to Google Cloud does not establish automated CI/CD, a particular cloud service, or zero-downtime releases.

### Validation of reconstructed scenarios

Promote a scenario into the confirmed narrative only after establishing what actually happened, what was implemented, and the candidate's contribution. Preserve whether the work was a proposal, prototype, MVP behavior, production feature, or later change. Record qualitative results when that is the available evidence; do not manufacture scale, reliability guarantees, performance gains, or ownership. A domain problem being common is not confirmation that this team solved it in a particular way.
