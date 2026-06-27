# Resume Automation Context

This context describes the jobs pipeline that discovers, enriches, stores, and reports job candidates for resume/application work.

## Language

**Job candidate**:
A persisted job posting row that can move from search-only discovery data to enriched JD and company evidence.
_Avoid_: Listing, posting row

**Discovery**:
The search-only phase that finds job candidates and saves stable candidate rows without fetching JD/details.
_Avoid_: Scraping, sourcing

**Enrichment**:
The phase that reads stored job candidates and fills JD/details plus hiring-company website evidence.
_Avoid_: Details fetch, hydration

**Agent run**:
One invocation of an external or fixture runner that returns stdout, stderr, and exit code, with optional raw output persistence for audit/debugging.
_Avoid_: Discovery runner, bot call

**Job candidate intake**:
The acceptance path that turns Agent run output into safe persisted job candidates by normalizing fields, rejecting incomplete rows, deduping stable identities, and applying prompt defense.
_Avoid_: Discovery normalization, enrichment parsing
