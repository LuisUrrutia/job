# Skim Rules

## TeX Edit Goals

- Optimize for recruiter skim speed in 5 to 10 seconds.
- Make the bold text alone tell a credible fit story.
- Reflect the JD's actual priorities rather than generic keyword stuffing.
- Keep every claim factually aligned with the source resume and user clarifications persisted to `info.json`.
- Read only the bold phrases and section headers; they should communicate the fit without sounding like keyword decoration.
- If the fit story is unclear, revise bullet order, wording, or emphasis before compiling.

## TeX Skim-Story Rules

- Bolding is not decoration and not a keyword highlighter. It is the resume's 5-second argument.
- Prefer value-shaped phrases: `domain problem + useful outcome`, or `technology + problem + risk reduction`.
- Do not bold internal product names, project names, or bare tools when the reviewer needs the transferable signal instead. Keep names in body text when useful, but bold the reason they matter.
- Do not stop at highlighting the tech. Pair technologies with the work they enabled, for example `RPC failover, signer integrations, and nonce reliability`, not just `EVM transaction handling`; `smart contract audit delivery workflows`, not just an internal audit product name.
- When a role has known gaps, bold adjacent evidence carefully without upgrading it into a missing claim. For example, use `Solidity test-network contracts for audit workflows` only when that is the supported scope; do not imply production protocol ownership, Foundry, wallet, bridge, ABI, or account-abstraction work unless confirmed.
- For each bold phrase, ask: would this incline a recruiter or technical reviewer in the candidate's favor without reading the rest of the sentence? If not, choose a stronger phrase or rewrite the bullet.

## TeX Bolding Rules

- Bold only short, meaningful phrases, usually 2 to 8 words.
- Do not bold single words.
- Do not bold whole sentences.
- Do not bold isolated tech names unless they are part of a stronger phrase.
- Do not bold product or project names unless the name itself is the strongest fit signal.
- Do not bold vague or generic phrases.
- Keep bolding sparse, usually no more than one bolded chunk per bullet unless two are clearly justified.
- If a bullet is weak or generic, tighten or remove it before deciding what to bold.
- If a TeX edit materially rewrites a bullet to create a stronger highlight, mirror the same wording back into `application.json`.

## What Is Worth Emphasizing

- Relevant domain experience.
- User-facing or product ownership.
- End-to-end or cross-functional scope.
- Backend, API, data, platform, or infrastructure responsibility when relevant.
- Reliability, observability, failure-mode handling, and other risk reducers.
- Developer integration workflows, critical user flows, and delivery workflows when they map to the JD.
- Leadership, initiative, or decision-making.
- Measurable outcomes, especially time, cost, reliability, release, defect, or support-load improvements.
- Complexity, scale, or business impact.
- Signals that directly match the role's must-haves, responsibilities, and level.

## Tech and Skills Filtering for the TeX and PDF Layer

- Reorder role tech lines and the Skills section by JD relevance.
- Keep must-have and high-signal adjacent technologies visible first.
- Suppress technologies that are low-signal, generic, outdated, overly detailed, or irrelevant for the JD.
- Do not suppress a technology that is explicitly required by the JD or directly supports a top evidence bullet.
- Do not suppress delivery or platform terms such as `CI/CD` when tied to concrete evidence like release quality or deployment reliability.
- Keep `Rust` visible when it adds credible systems or backend signal and does not crowd out stronger JD matches.
- Preserve the full canonical inventory in `application.json`. Filtering applies only to the TeX and PDF outputs.
- If a role tech line or the Skills section becomes noisy, reduce it to the strongest JD-relevant items for the TeX and PDF outputs.
- For this candidate, often deprioritize low-signal technologies such as `Express.js`, `Node.js` when backend ownership is not central, `JavaScript` when `TypeScript` already carries the stronger signal, `HTML5`, `CSS`, `Git`, `Agile`, `Scrum`, `CloudWatch`, `Sentry`, `GitHub Actions`, `Material-UI`, `Tailwind CSS`, `Storybook`, `AWS Lambda`, `Amazon SQS`, `BigQuery`, `Tile38`, `Stripe`, `Transbank`, `AngularJS`, `PHP`, `Laravel`, `Vagrant`, `Serverless`, `Microservices`, `Solidity`, and other Web3-specific tooling unless the JD explicitly calls for them.
