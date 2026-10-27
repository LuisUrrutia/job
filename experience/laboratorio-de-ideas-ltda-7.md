---
id: 7
title: Junior Software Developer
company: Laboratorio de Ideas Ltda.
location: Santiago, Chile
years: 2015 - 2015
tech:
  - AngularJS
  - JavaScript
  - PHP
  - Django
  - Python
  - Vagrant
  - Node.js
  - Laravel
  - jQuery
  - Selenium
  - WordPress
  - Magento
  - PrestaShop
  - PayPal
  - Transbank
  - SSH
  - Subversion (SVN)
  - Git
  - Gulp
  - Grunt
  - Bower
  - PostgreSQL
  - MySQL
  - FTP
  - Apache HTTP Server
  - SCP
---

## Contributions

- Started as a junior developer while at university and took on growing frontend ownership, helping introduce Node.js and AngularJS into the agency stack.
- Introduced Laravel and AngularJS within the company, advocated moving away from its in-house PHP framework, and trained colleagues in the new frameworks; colleagues subsequently used Laravel in projects.
- Helped introduce Git in a gradual transition from Subversion, so developers could record commits locally without depending on the office's Subversion server for each commit.
- Built an internal project management system from scratch with a Kanban task board and client support tickets, working with colleagues to understand delivery and operations workflows.
- Built a medical appointment system from scratch, developing both the AngularJS frontend and the Laravel backend/API, with doctor profiles, availability, and patient bookings; its codebase was reused for the veterinary appointment system.
- Helped define requirements, solution design, scope, and estimates for an auto-parts inventory and wholesale/retail sales platform, then worked on implementation from the initial codebase and project structure onward; another team supplied the interface designs.
- Validated the auto-parts solution with prospective sales representatives and people from workshops; participation ended before the operational rollout stage.
- Developed ecommerce features and integrated PayPal and Transbank payments across client projects, working with WordPress, Magento, and PrestaShop.
- Worked on warehouse inventory systems and an access control system that used license-plate recognition.
- Worked extensively with PostgreSQL and to a lesser extent with MySQL; wrote Python scripts and worked with Django.
- Configured servers with Apache and databases, progressing from shared responsibility to mainly independent work, and used FTP extensively.
- Learned Selenium end-to-end testing and trained a trainee in automated testing to prepare them for QA work.

## Details

### Joining the company while at university

This was my first company job, and I joined while I was still at university. I approached the company with a proposal: hire me for three months, see what I could do, and pay me more if they liked my work. They hired me on a trial basis, were happy with my work, and kept me on after the trial.

Before joining, I had worked as a freelancer. We had a few clients of our own and built projects with CodeIgniter, PHP, and jQuery. That earlier freelance experience gave me a technical foundation and some experience speaking with clients before I joined the company.

### Working across agency projects

The company was a software factory, so I worked on many client projects, primarily ecommerce. Much of the work involved adding features to existing systems, but I also worked on projects from scratch, including the appointment platform, the internal management system, and the auto-parts platform.

I mainly worked with PHP and also used JavaScript and jQuery extensively. I was particularly interested in frontend development: making interfaces visually appealing, usable, and comfortable for the people using them. That interest led me to research frontend tools and learn new approaches on my own.

### Introducing Laravel and AngularJS

The company initially used a PHP framework developed in-house. I already knew CodeIgniter from freelancing, then learned Laravel and pushed for the company to use it instead of relying on its own framework. I saw Laravel as a more modern direction for our PHP projects. I remember being the first person there to learn Laravel and introduce it to my colleagues. This involved both advocating for the change and transferring the knowledge needed to use it.

I took a similar approach with AngularJS. I learned it independently, introduced it within the company, applied it to the appointment project, and trained colleagues. Being an early adopter within the company meant that learning a tool was only part of the work; I also had to explain it to other developers and help them get started.

We scheduled meetings for these training sessions, combining demos with hands-on workshops. Colleagues could try the tools themselves through exercises and a small project. I explained the differences between the approaches as part of the sessions.

Colleagues went on to use Laravel in projects after the training. AngularJS adoption was more limited, which I attribute to most applications being monolithic at the time. The move toward separating applications and using frameworks with APIs began later.

### Frontend tooling and Node.js

My AngularJS development also involved Node.js and frontend tooling including Gulp, Grunt, and Bower. The tools are part of my recollection of this role, but the exact combinations and order in which we adopted or changed them are not established.

### Databases, Python scripting, and Django

I worked extensively with databases, mainly PostgreSQL. I also used MySQL, but to a lesser extent. PostgreSQL accounted for most of the database work I remember from this role.

I wrote many scripts in Python. Some normalized information stored in databases, applied migrations, or made changes on servers. These were practical scripts for particular tasks; their exact implementations are no longer clear in my memory.

I also worked with Django during this period, alongside the PHP and JavaScript projects. I do not recall which project used it.

### Gradual transition from Subversion to Git

We used Subversion (SVN), with its server hosted locally in the office. I was one of the people who introduced Git to the company, and we began moving from SVN to Git gradually.

The main reason was to reduce our dependence on the central server while working. I wanted us to be able to make commits locally and share the changes later, instead of needing to send every commit to the Subversion server to record our progress. Local commits were an important part of the benefit I saw in Git.

This was a migration from SVN to Git, not an ongoing workflow in which I used Git and SVN together. My recollection of an SVN-related command concerns the migration itself.

### Development environments and server access

I used Vagrant during this role and accessed servers over SSH. I also used FTP frequently and worked on general server setup, including configuring Apache and databases. The precise provisioning configuration and deployment sequence are not established in this account.

At first, I shared responsibility for server setup with someone else. Later, I handled this work mainly independently.

### Accidental database deletion and backup practices

We had development and production environments. Through an oversight, I connected to the development environment unintentionally and accidentally wiped its database. Fortunately, we had a backup available.

I carried out essentially all of the recovery, restoring the database from that backup. No information was lost, which I attribute to the systems' relatively low concurrent usage at the time.

Backup practices were also an area I needed to improve. The setup I remember included a script that used SCP to copy files as part of the backup process.

After the incident, we implemented policies to avoid routine access to production, allowing access for incidents or deployments. We applied them through team agreements and permission restrictions. This was a team change to how we worked with the production environment.

### Medical and veterinary appointments

I worked on a medical appointment platform from scratch, developing both the AngularJS frontend and the Laravel backend/API and communicating with the client about the project. Doctors could create profiles and publish their available appointment times. Patients could then book appointments through the system.

This was a small project in which I implemented the separation through APIs described above. It was the first project using that approach that I left with the company for the team to continue working on.

The veterinary appointment system reused the medical platform's codebase rather than being developed independently from scratch.

The technical challenges I remember included managing frontend dependencies, getting the build process right, and using different hashes for generated assets to avoid cache problems. I remember frontend build practices as less settled then: developers put together their own compilation and build workflows rather than following a well-established process.

My build work combined reuse with custom configuration. I started from an existing setup, then modified and adapted it to the project's needs.

### Internal Kanban and client support tickets

I built an internal task and project management system from scratch for delivery and operations teams. It had a Kanban board for viewing and tracking tasks, with a much smaller scope than products such as Jira or Linear.

To work out what the system needed to do, I spoke with people in the company about how they worked and how the tool should fit into their routines. This was requirements work with internal users as well as implementation.

The system also included support tickets. Clients could report incidents or problems, and our team could keep track of those reports and follow up on them. In purpose, that part resembled a smaller alternative to Zendesk, alongside the internal task-management features.

### Ecommerce and payment integrations

I worked on several ecommerce projects, adding features to existing stores and integrating payment systems. These integrations included PayPal and the Chilean payment provider Transbank, along with the handling required for their payment flows.

I also worked with WordPress, Magento, and PrestaShop across client projects. The work covered different existing platforms rather than one single ecommerce codebase.

### Warehouse inventory and access control

I worked on warehouse inventory systems, including work for Bodega San Francisco. I also worked on warehouse access control using license-plate reading or recognition for vehicles entering the warehouse. I remember the plate-recognition work as a substantial project.

### Auto-parts inventory and wholesale/retail sales

I worked on an auto-parts platform from the beginning, including planning and development. The client was a large company that wanted a system for managing its inventory of spare parts and supporting both wholesale and retail sales.

I helped establish the requirements, decide what we would implement, and design the technical solution. I also participated in planning what we could deliver and estimating how long the work would take.

Another team created the interface designs. We received those designs to implement them; I did not create the visual interface design. My implementation work included setting up the initial codebase and project structure and continuing with the application development.

The client's sales representatives would visit small workshops in different parts of Chile and sell parts to them. Supporting those field sales was the wholesale side of the project. The broader scope also included a system through which the smaller retailers could sell parts themselves, plus a website where they could buy parts in bulk for their businesses.

The planned system connected the supplier's inventory with field sales and the needs of smaller workshops and retailers. I validated the solution with some prospective sales representatives and people from workshops. My participation ended before the operational rollout stage, so this experience covers planning, development, and validation with prospective users, rather than operating the system in production.

### Selenium and training a future QA colleague

I learned end-to-end automated testing with Selenium so that I could teach a trainee how to write automated tests. The purpose was to help that person take on QA work. This was another case where I learned a tool and then had to make that knowledge usable by someone else.

### Teamwork, client communication, and pressure

Moving from freelance work into a company taught me how to work as part of a development team. I also learned to communicate with clients in a more formal, business-oriented way, rather than only through the kind of relationship I had known as a freelancer.

The Laravel, AngularJS, and Selenium training gave me practice explaining technical concepts and passing knowledge to other people. I had to develop teaching skills alongside my own technical skills.

The software-factory environment moved quickly and involved many projects and considerable pressure. I learned to manage the stress of that pace and continue working effectively in it.

## Open questions

- Employment dates: the existing record says `2015 - 2015`, while the account places this work approximately in 2015. Confirm the start and end months and whether all the projects described belonged to that same period.
- Company name: the existing record says `Laboratorio de Ideas Ltda.`; the spoken account was transcribed as `Laboratorio de Limitada`. Keep the existing name unless the candidate confirms a correction.
- Trial period: the initial proposal was three months with higher pay if the company liked the work. Confirm the actual trial duration and whether a pay increase followed; only continued employment after the trial is confirmed.
- Frontend tooling chronology: the candidate now recalls using Gulp, Grunt, and Bower alongside Node.js for AngularJS work. He tentatively remembers a Gulp-and-Bower combination followed by Grunt-and-Bower, but is unsure of the order and combinations. Which projects used each setup, and what changed? Do not present that sequence as a confirmed migration. Webpack was mentioned in the earlier recollection of emerging tools, but its use in this role is still unconfirmed.
- License-plate recognition: after reviewing the names, the candidate identified OpenALPR as the probable technology and asked for it to be recorded, while qualifying the recollection with "I think that was it." Preserve OpenALPR as a tentative technology until the identification is certain enough to use as resume evidence. What did the candidate personally implement? OpenCV and Tesseract remain research context only, not separately confirmed experience. No custom machine-learning model, model training, or recognition accuracy has been established. See [the technology timeline](../docs/research/early-career-technology-timeline.md).
- Warehouse projects: was the license-plate access system also for Bodega San Francisco, or was that a different client? Which inventory and access-control components did the candidate own?
- Auto-parts client: the name was recalled uncertainly as `Manheim`. Confirm the exact company name rather than substituting a similar-sounding business.
- Auto-parts validation: what did the candidate review with prospective sales representatives and workshop participants, how was the validation carried out, and what feedback or changes resulted? His participation ended before operational rollout; subsequent deployment and adoption are not established.
- Auto-parts team ownership: which application components did other developers own? Another team is confirmed to have created the interface designs.
- Appointment platform: what did the client communication involve? The candidate's development of both the AngularJS frontend and Laravel backend/API, and reuse of the medical platform's codebase for veterinary appointments, are confirmed. The account refers to this as the family-doctor project ("medico de familia"), but does not establish an official product name.
- Appointment build process: the candidate confirms starting from an existing configuration and modifying and adapting it himself. The starting configuration's source, exact tools, and hash mechanism remain unspecified; do not assign Gulp, Grunt, Bower, or Webpack to this project's build solely from the role-wide tooling account.
- Framework adoption: colleagues' subsequent use of Laravel in projects is confirmed. Beyond the medical appointment platform, which projects used it, and what resistance or migration problems arose? Exact versions, adoption across all projects, and complete replacement of the in-house framework are not established.
- Move toward APIs: the candidate confirms implementing this approach in the small medical appointment project and leaving it with the company for the team to continue working on. He assumes other projects may have followed, but does not confirm them or their outcomes. The exact timing, API design, subsequent adoption, and broader migration remain unspecified; do not infer a company-wide migration or microservices architecture.
- Vagrant and provisioning: Vagrant use is confirmed. The candidate tentatively remembers exploring Chef to provision these environments, but does not remember whether or how he used it. Confirm whether this was investigation, a working configuration, or shared team tooling before treating Chef as a confirmed skill. The provider, recipes or cookbooks, installed software, and provisioning method are unknown.
- Server workflow: the candidate tentatively remembers server changes being mostly manual and says the team did not have an automated CI/CD process. Preserve this recollection without inferring that all changes were manual or that his task-specific Python scripts formed a deployment pipeline. SSH, frequent FTP use, Apache and database setup, and scripts for some server changes are confirmed. Server setup responsibility was initially shared and later mainly independent; the exact deployment sequence, hosting setup, and operating system remain unspecified.
- Backup process and improvements: the candidate remembers an SCP-based script and tentatively recalls pg_dump as the database backup command. Confirm the command before treating it as a known tool. Beyond the confirmed production-access policy, did he change the backup process itself? Script authorship, scheduling, storage destination, retention, and routine restore testing remain unknown. The successful recovery described above does not establish a regular restore-testing practice.
- Migration tooling: the candidate associates the recalled SVN-related command with migration, not with using Git and SVN together. The exact command, remote hosting, and migration completion are still unspecified; do not infer regular git-svn bridge usage.
- Django project: the candidate tentatively remembers working on a project from scratch, but cannot identify it. Django use is confirmed; the project identity, greenfield scope, and version are not. Release history can establish what was available around 2015, not which version the candidate used; see [the technology timeline](../docs/research/early-career-technology-timeline.md).
- Database and scripting details: which projects used PostgreSQL and MySQL, and what did the data normalization and migrations involve? The candidate recalls their general purposes but not the scripts in detail. Schema design, query optimization, migration types, data volumes, and outcomes have not been specified.
- Earlier freelancing: establish clients, collaborators, dates, and project details separately before creating a freelance employment record. CodeIgniter use described in this account belongs to that earlier work, not automatically to this employer.
