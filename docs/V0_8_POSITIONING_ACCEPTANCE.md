# Smart UMN v0.8.0 positioning acceptance

Scope: University of Minnesota Twin Cities local release candidate. v0.8 intentionally separates the two product surfaces while keeping one deterministic academic core.

## Product contract

| Surface | Student question | Default density | Must own | Must not own |
| --- | --- | --- | --- | --- |
| Web Advisor | “What should I do next?” | Low | registration decisions, graduation horizon, bottlenecks, what-if, advisor handoff, registration preparation | a dense professor/review analytics dashboard |
| Schedule Builder Extension | “What doesn't Schedule Builder tell me?” | High but collapsible | APAS fit, grade history/trends, current-professor evidence, RMP aggregate provenance, Reddit references/reviewed excerpts, neutral themes, offering history | duplicate description/seats/time/location fields already visible in Schedule Builder |

## Web Advisor acceptance

The first fold must show **YOUR REGISTRATION ADVISOR** before roadmap mechanics. With an imported APAS it answers:
- which registration move to make next;
- the current deterministic planning horizon;
- the most important offering/dependency bottleneck;
- which issue can be automated versus which still needs advisor/official confirmation.

The full graduation roadmap remains a closed progressive disclosure on first load. Building a plan updates the advisor brief into concrete registration guidance and retains deterministic **Why this plan?**, APAS allocation and class-number handoff underneath.

## Extension Course Intelligence acceptance

The live Spring 2027 CSCI 5302 Schedule Builder page is the release acceptance course because current public evidence provides an exact current instructor, historical grades and an RMP aggregate through GopherGrades. The release gate requires:
- personalized APAS fit and prerequisite state;
- course-wide historical grade distribution and term-by-term GPA trend visualization;
- current-professor intelligence with exact identity matching;
- RateMyProfessors overall-quality aggregate explicitly labeled through GopherGrades, without invented rating count/difficulty/would-take-again;
- Student voices with original Reddit links, neutral topic frequencies, and a manually reviewed excerpt when one has been explicitly attached;
- Fall/Spring/Summer offering-history evidence with confidence language.

Reddit and RateMyProfessors automated collection remains **link-only** under the reviewed policy. A displayed Reddit excerpt must come from the explicit manual reviewed-reference workflow; no crawler bypass is permitted.

## Shared correctness boundary

Community or professor evidence never changes degree applicability, prerequisite truth, equivalent-credit decisions, section feasibility or schedule validity. The deterministic APAS/rules/solver pipeline remains authoritative inside Smart UMN, and APAS/official registration systems remain the institutional authority.

## Automated and browser gates

v0.8 adds deterministic advisor-brief tests, course-wide grade-term aggregation tests, neutral community-topic aggregation tests, richer Extension Shadow-DOM contracts, Web advisor first-fold user-flow tests and a real-browser Course Intelligence gate. The browser gate opens real Schedule Builder pages for CSCI 1133 and CSCI 5302 and verifies actual Shadow-DOM rendering.

Official inventory coverage remains a separate claim: 146 current CAPE major names and 161 current Twin Cities Sample Plans program-degree identities are structurally exercised. This does not claim 161 private real APAS audits were collected.

## Final observed acceptance — 2026-09-27

- 105/105 automated tests pass; TypeScript, Web build, MV3 Extension build and release packaging pass.
- Live provider verification passes: 330 Twin Cities subjects; current representative catalogs and GopherGrades are healthy.
- Official inventory verification passes 146/146 current CAPE major names and 161/161 current Sample Plans program-degree identities across 13 colleges/schools, with zero inventory drift or structural failures.
- Fresh isolated-browser acceptance runs Extension 0.8.0 with parser 0.4.3, produces 8 live schedule options from the saved real CS audit, and verifies the Web Advisor first fold plus registration handoff.
- The same browser run opens real Schedule Builder CSCI 5302 and observes: Daniel Boley 2.2/5 RMP overall quality via GopherGrades, 383 historical grade students, an eight-term GPA trend, 10 observed Spring terms, one curated Reddit source with the reviewed excerpt/topic, and the personalized APAS/prerequisite verdict.
- CSCI 1133 still correctly renders **Not eligible now · Already completed; duplicate credit excluded** for the saved real audit.

## Demo/privacy contract

The v0.8 demos use a synthetic academic profile. Public course evidence may be live. The community demo seeds only explicitly reviewed public original links/excerpts. Demos must contain no raw private APAS HTML, student identity, credentials, cookies, Duo/SAML material or personal course history.
