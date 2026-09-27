# Architecture

The two frontends import one shared parser, rule engine, solver and source-labeled UI. Node serves the built web application and a public evidence API. SQLite caches public source snapshots, provider health, community entities/references, instructor identities and crawl jobs. Private student context never enters that database.

```mermaid
flowchart TD
  UMN[Official UMN SSO and Duo] --> UA[uAchieve first-party pages]
  UA --> CS[Extension semantic DOM parser]
  CS --> Local[Chrome local profile and plans]
  Local <--> Web[Web workspace]
  Local <--> Inline[Schedule Builder native inline Smart UMN UI]
  Web --> Core[Shared deterministic rule engine and solver]
  Inline --> Core
  Web --> API[Loopback public course-context API]
  Inline --> API
  API --> SB[Schedule Builder adapter]
  API --> GG[GopherGrades adapter]
  API --> DB[SQLite public evidence]
  Worker[JEV targeted background worker] --> DB
```

## APAS state machine

Disconnected → Connect creates an owned ordinary uAchieve tab → native UMN authentication, if required → completed-audit list → deterministic primary-program selection or an explicit program picker when ambiguous → semantic audit and same-origin Course History → local normalized state → optional explicit import of additional major/minor/certificate audits → broadcast to planner tabs → close only the owned temporary tab. The extension stores the program name, not an authentication or audit token, as selection preference. Periodic refresh runs every six hours while a profile exists. Discovery has bounded hops and a three-minute acquisition window; reconnect restarts acquisition. A source parser error preserves the prior profile and sets an explicit status.

The extension is not injected into login.umn.edu or Duo. It never reads cookies or network headers. Its first-party fetch uses normal browser-managed authentication without exposing cookie values.

## Parsing and correctness

The first `#audit` is authoritative. Parsing is program-agnostic: primary program titles are not restricted to a degree-abbreviation allowlist, total-degree credits use the semantic APAS `category_Total_Hours` marker when available, and additional imported program requirement IDs are namespaced by their program title.  the observed UMN page embeds a second responsive copy. Requirements retain hierarchy, status, attributes and explicit selectable course metadata. Course History is authoritative for individual course records, with normalized campus prefixes and term strings. Failed / unknown courses never satisfy a prerequisite. Complex credit caps, residency, GPA, cross-requirement allocation and unparsed rules remain unknown. The parser supports explicit course lists with known count / credit semantics. It deliberately does not infer rules from arbitrary prose.

Requirement interpretation separates strict course routes, candidate routes, and policy/accounting constraints. Exact selectable pools with proven count/credit semantics, exact Liberal Education categories, deterministic level patterns, and explicit `<SUBJECT> designator` credit statements can become strict. Pools with unresolved caps or qualifiers remain candidate-only. Degree-credit totals, GPA, residency, upper-division-in-major accounting and similar policies stay visible but do not authorize arbitrary courses. The solver uses three-valued logic: yes / no / unknown. Only yes authorizes a course. Unknown OR branches do not defeat an independently proven alternative. Candidate discovery also runs locally: explicit APAS course rules become exact course lookups, while supported subject/range rules request only that public subject's current Schedule Builder catalog and are filtered against the private rule in the browser. The bounded candidate pool is round-robin balanced across the scarcest supported remaining targets instead of taking the first 16 catalog matches. During schedule evaluation, a deterministic scarcity-aware allocator assigns each planned course to at most one deepest supported remaining target; aggregate parent requirements are not simultaneously counted when supported child targets exist. Degree-progress coverage ranks before optional timetable preferences, while APAS remains the final authority for cross-requirement policy. In-progress prerequisites are not treated as completed. Each selected course needs a proven remaining requirement match; sections need known dated meetings, open capacity, satisfied section prerequisites and resolved linkage/restrictions. Community references are not solver inputs.

A schedule proves the supported course eligibility and timing constraints; it does not certify graduation, registration entitlement, minimum-grade completion of a future course or final APAS credit allocation. Explanations explicitly preserve that boundary.

## Reliability

Public requests use per-provider pacing, bounded timeout, one-flight deduplication and schema checks. Current subject discovery uses Schedule Builder's own `courses_wildcard` followed by bounded `courses` bulk lookups; the localhost API receives a subject code and term, never the APAS rule that caused the lookup. Failed refreshes retain old evidence with the original retrieval timestamp and degraded health. Stale sections cannot enter the solver. The browser refreshes selected public context before generation. Search is bounded to 16 candidates / 25,000 nodes / eight displayed options, and reports truncation.

Community references come from precomputed DB lookup. Browser collection never runs on the course detail request path. JEV uses a distinct named session and only owned tabs on sources with an explicit current `allow` policy. Reddit and RateMyProfessors are currently `link-only`; their original links can be attached to verified course/instructor entities, but the worker will not scrape them. Site access policy, CAPTCHA detection, URL allowlisting and entity evidence precede persistence.

## Deployment boundary

This is a single-user localhost prototype. Shared hosting would require authenticated per-user storage, explicit academic-data consent, TLS, CSRF protection, deployment configuration, a production database migration strategy, provider governance and multi-user authorization tests. Those are not silently claimed by this local architecture.
