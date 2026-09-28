# Verification

This file records the current prototype verification boundary. It is evidence for a local development build, not a production-service certification.

## Automated gate

Run from `outputs/smart-umn-planner`:

```sh
npm run typecheck
npm test
npm run build
```

The current gate passes with 117 tests. Coverage includes community source/entity boundaries, current-instructor grade aggregation, compact inline Schedule Builder rendering, eligibility-first APAS summaries, missing-APAS behavior, batching, personalization refresh, Twin Cities-only extension fail-closed behavior, explicit APAS course pools, APAS count/credit semantics, candidate routes for unresolved caps, AP/IB/transfer-credit parsing plus prerequisite and duplicate-credit behavior, structured Schedule Builder equivalent-course normalization, end-user Plan no-result and immediate saved-plan feedback, exact official Liberal Education enrichment, generic subject/designator routes across multiple colleges, multi-program degree/minor/certificate import, newest-audit-per-program selection, APAS-personalized Explore ordering without catalog filtering, mutually exclusive strict/candidate/policy/unknown coverage accounting, the representative cross-major synthetic APAS matrix, the official 161-program Twin Cities structural matrix, no-double-count allocation, scarcity-aware assignment, balanced bounded candidate selection, allocation-aware schedule ranking, and the two-destination / Folwell-aligned web-UX contract.

## Live source / UI checks

Verified on 2026-09-26/27 against the current local build:

- Loopback API `GET /api/health` reports the Schedule Builder and GopherGrades adapters healthy.
- Scope verification came first: live GopherGrades probes for branch-campus-only examples (`CS 1411`, `ACCT 2101`, `CSCI 1302`, `BIOL 2331`) returned no public class record, while Twin Cities `PSY 1001` returned healthy data. The current public GopherGrades frontend source also hard-codes `UMNTC` in class/distribution/search/department/instructor-class queries. Smart UMN therefore deliberately scopes the public product to Twin Cities.
- `npm run verify:live` now verifies the live Twin Cities subject directory (330 current subject codes in the latest run), representative Spring 2027 catalogs across multiple colleges/domains (CSCI, PSY, BIOL, ACCT, GDES, JOUR, NURS, FSCN, EPSY, PUBH), the current Twin Cities Liberal Education metadata, and GopherGrades historical evidence.
- The public API and Chrome extension reject / ignore non-Twin-Cities planning rather than silently dropping the historical-evidence pillar.
- A browser E2E fixture with a remaining CSCI 5000–5999 APAS rule used **Build schedules from APAS** to discover the currently offered, prerequisite-eligible CSCI 5302 and produce a valid 3-credit, two-campus-day schedule without sending the synthetic APAS rule to the API.
- A second browser E2E fixture with overlapping requirements (exact `CSCI 5302` plus a broad CSCI 5000-level elective) generated eight live Spring 2027 schedule options. The leading options displayed **Degree allocation** with `CSCI 5302 → Numerical Algorithms requirement` and a different current course such as `CSCI 5103 → Advanced CSCI elective`, proving the same course was not double-counted across both targets.
- Browser acceptance renders the redesigned Smart UMN value-add rail directly inside a real Twin Cities Schedule Builder course page. The personalized block is labeled APAS fit; current eligibility takes precedence over a structural requirement match, and non-Twin-Cities Schedule Builder pages receive no Smart UMN injection.
- The default rail shows a personalized APAS fit verdict, historical course GPA/distribution, instructor-specific GopherGrades history, and direct RateMyProfessors/Reddit source links. A strict APAS match gets a checkmark; an explicit but quantitatively unresolved APAS course pool gets a candidate-route warning instead. The removed generic Details/Overview panel no longer repeats native description, section, seat, meeting-time, or location content.
- References are visible without an extra tab click and the expanded Community view remains available for source notes. Reddit and RateMyProfessors remain references only.
- The web workspace course row renders current instructor, live open-section count, historical sample size, and direct third-party source links from the same `CourseContext`.
- The extension manifest/build contains no Side Panel permission or Side Panel bundle.

## Requirement-route verification boundary

The parser now separates **strict completion routes**, **candidate routes**, and **policy/accounting constraints**. Exact selectable-course rules, proven count/credit semantics, exact Twin Cities Liberal Education categories, and deterministic labels such as `4xxx/5xxx-level <SUBJECT> coursework` may become strict. Explicit APAS pools containing unresolved caps/exceptions remain candidate-only. Parser 0.4.4 adds an explicit non-authorizing `policy` Rule IR. It recognizes generic degree-credit, institutional-GPA, residency, final-residency, major-credit, upper-division-major-credit, and scoped-designator accounting prose without turning any of those shapes into course authorization. The saved real Computer Science audit currently has two raw strict course routes (Upper Division Math Oriented and 4xxx/5xxx-level CSCI coursework), one candidate Technical Electives route, seven non-authorizing aggregate containers, and nine actual policy/accounting constraints across nineteen open nodes; seven of those policy constraints are now structured policy rules and only two remain unclassified. Exact official Liberal Education enrichment can add strict attribute routes in the browser without changing the private raw-audit classification.

A primary APAS program can retain additional explicitly imported program audits such as a second major, minor, or certificate. Requirement IDs are namespaced by program; the primary audit is never silently replaced or all historical/what-if audits automatically merged.

## Community verification boundary

Reddit and RateMyProfessors are currently configured as `link-only` in `config/community-policy.json`. Their original URLs can be attached to verified course or instructor entities. Automated browser collection is disabled for those hosts under the current policy review. RMP overall-quality aggregates may be carried in display-only instructor evidence when supplied by GopherGrades; missing rating metadata is not invented. Reddit/RMP evidence never enters the degree-rule engine or planner solver.

## Privacy checks

The extension does not request cookies, debugger, webRequest, identity, history, or Side Panel permissions. UMN username/password, Duo prompts, cookies, SAML assertions, and raw authenticated audit HTML are not sent to the local public-evidence API. Normalized academic state is kept in browser-local storage and only derived prerequisite/degree-fit results are exposed to Schedule Builder content scripts.

## Re-run after changes

After any source/UI change:

1. run the automated gate above;
2. reload the unpacked extension;
3. reload a real Schedule Builder course page;
4. confirm inline rendering, source labels, direct links, and degree-fit refresh;
5. for web changes, load the localhost planner and verify the corresponding course row/detail view.

## Checkpoint hardening — 2026-09-27

Re-ran the 36-test baseline before edits. Added adversarial solver tests; 11 initially failed (invalid/future evidence timestamps, stale nested sections, mismatched course/campus, reversed meeting times/dates, empty meetings, invalid credits, negative seats and mixed-term batches). The solver now rejects these cases while retaining fresh valid schedules. An additional candidate-pool regression reproduced unknown-prerequisite courses displacing a proven eligible course; discovery now prioritizes strict, prerequisite-proven candidates before balancing review-only routes into spare slots.

The current v0.9.2 automated gate passes 117 tests, type checking and both web/inline-extension builds. `npm run verify:live` also passes against the current Twin Cities Schedule Builder subject directory/catalogs, Liberal Education metadata, and GopherGrades. `npm run verify:majors` refetches two official inventories and currently verifies 146/146 CAPE major names plus 161/161 Sample Plans program-degree/APAS identities across 13 colleges/schools, with zero inventory drift and zero structural failures. Scope remains Twin Cities; no Side Panel was restored.

Live public-source check at 2026-09-27T07:33Z: the Twin Cities subject directory returned 330 subject codes. Representative Spring 2027 catalogs returned CSCI 84, PSY 52, BIOL 43, ACCT 23, GDES 28, JOUR 68, NURS 104, FSCN 35, EPSY 94 and PUBH 169 records; 13 Liberal Education categories. GopherGrades PSY 1001 returned 19,704 historical students over terms 1175–1263. Counts describe retrieved catalog records, not guaranteed open or eligible courses.

Reparsed the previously saved authentic audit and Course History locally with parser 0.3.0 (22 completed/transfer records with known campus identity). Current public sections for CSCI 5302 and CSCI 5421 produced three schedules, including their nonoverlapping 6-credit combination. See `evidence/checkpoint-20260927-live-plan.json`; this check uses saved audit HTML, not a fresh authenticated audit fetch.

Chrome then performed a new official UMN/APAS sync. Without reloading the planner, its connection panel advanced from Sep 26 7:58 PM to Sep 27 12:27 AM, confirming the normalized-state push reached the page. No login credentials or cookie values were accessed.

### Deployment identity

The source authority remains the Hermes workspace (`outputs/smart-umn-planner`). Version 0.9.0 builds with only `storage`/`alarms` permissions and Twin-Cities Schedule Builder/APAS/loopback host access. A normal user installation is still an unpacked Developer-mode extension and must be reloaded after a rebuild before judging already-open tabs. For repeatable automated acceptance, the project now uses an isolated Chromium-compatible profile over CDP because current branded Google Chrome does not reliably honor command-line unpacked-extension loading; this automation limitation does not change the manual Developer-mode installation path.

The real APAS discovery plan expanded to 176 exact course IDs. The old web flow fetched full context (including grades and sections) for all IDs before keeping 16, causing long loading and unnecessary public-provider calls. Discovery now loads at most 12 subject catalogs (including subjects derived from explicit course IDs) and 12 attribute catalogs, filters locally, then loads full context only for the selected pool of at most 16 courses. The omitted-subject and additional-match counts remain visible in the page instead of only a transient toast. A regression verifies subject prioritization, deduplication and omission counts.

Earlier real-Chrome acceptance after the v0.4.0 reload and fresh APAS sync at 00:43 displayed 8 schedules by the observation 28 seconds after clicking. That historical evidence remains in `CHECKPOINT-20260927.md` and `evidence/checkpoint-20260927-live-schedule.png`.

Final v0.6.0 isolated-browser acceptance on 2026-09-27 loaded the current unpacked extension and verified the exact manifest-declared `background.js` MV3 service-worker target, then parsed the saved real APAS locally, rendered only **Plan** and **Explore** as primary destinations, and completed **Build my plan** against live Spring 2027 evidence. It produced 8 schedule options; the leading option was 9 credits over 2 campus days and allocated CSCI 5302 to the Upper Division Math Oriented target without double-counting CSCI 5103/5143. Explore loaded all 84 current CSCI catalog rows. The same run opened the real Schedule Builder CSCI 1133 page and observed a `smart-umn-insight` Shadow-DOM rail with APAS fit, historical grades, references, and a full-planner link. Because the saved real APAS already contains CSCI 1133, the rail correctly summarized it as **Not eligible now · Already completed; duplicate credit excluded** instead of showing a misleading green requirement-match summary. See `evidence/final-browser-acceptance-20260927.json`, `evidence/final-browser-plan-20260927.png`, `evidence/final-browser-explore-20260927.png`, and `evidence/final-browser-schedulebuilder-inline-20260927.png`.

The final APAS coverage report is `evidence/apas-coverage-20260927.json`. Its 13 representative synthetic program fixtures span degree, major, minor and certificate routes with 12 strict-supported fixtures, one candidate-only cap fixture and zero unknown/unrouted fixtures. The broader official-inventory verification is `evidence/twin-cities-program-coverage-20260927.json`: the live and saved CAPE inventory both contain 146 current majors, while the live and saved Twin Cities Sample Plans inventory both contain 161 program-degree rows across 13 colleges/schools. All 146 major names and all 161 program-degree identities pass the same ten-shape structural APAS matrix, including behavior-checked structured exclusions, strict GPA/count routes, a candidate-only cap, a policy constraint, and a deliberately unsupported fail-closed route, with zero added/removed/duplicate entries relative to either saved snapshot. Structured `notcourses` exclusions remain strict even when the APAS label says `except`; prose-only exceptions without machine-readable exclusion evidence remain review-only. `TWIN_CITIES_PROGRAM_COVERAGE.md` exposes the status row by row.

The saved real Computer Science APAS has 19 active remaining nodes classified mutually exclusively as 2 raw strict course routes, 1 candidate route, 7 aggregate containers, 9 policy/accounting constraints and 0 unknown/unrouted nodes under parser 0.4.4. Seven of the 9 policy constraints have explicit typed Policy Rule IR; only two remain unclassified policy/accounting constraints. It is currently the only matched major and program-degree identity labeled `real+synthetic`; the other 145 major names and 160 program-degree identities are intentionally labeled `synthetic-structural-only`. Coverage percentages intentionally count only course-authorizing strict/candidate routes; policy constraints stay visible but do not authorize arbitrary courses.

## v0.7.0 product acceptance — 2026-09-27

The v0.7.0 product gate adds deterministic graduation-roadmap/what-if tests, historical offering-pattern tests, richer timing/travel/waitlist solver tests, anonymous APAS compatibility-passport coverage, release-version alignment, and persistent What-if disclosure behavior. Final browser acceptance must observe the current parser version in the actual page state, render the graduation roadmap, Why-this-plan reasoning, offering patterns, class-number registration handoff and what-if controls, and reject any roadmap regression that reintroduces `CSCI 1113` from the scoped designator accounting constraint.

The v0.7 demo media and v0.7.1 extension archive remain available from their historical Git tag/Release. Current `main` uses the v0.8 Web Advisor / Extension Course Intelligence recordings documented in `DEMOS.md`; the current distributable extension archive is versioned from the manifest and package version.

## v0.9.2 aggregate-aware APAS coverage accounting — 2026-09-27

Coverage accounting now separates non-authorizing parent requirement wrappers from actual policy work. A remaining node with child semantics, no strict route, and no candidate route is counted as an `aggregateContainer` instead of duplicating the child policy/accounting constraints. On the saved real Computer Science audit, the 19 active nodes are now measured as 2 strict course routes, 1 candidate route, 7 aggregate containers, 9 actual policy/accounting constraints, and 0 unknown/unrouted nodes. Seven of those 9 policy constraints have typed Policy Rule IR and only two remain unclassified. This changes coverage/advisor accounting only; aggregate containers still do not authorize courses or enter allocation/solver logic. The anonymous compatibility passport now reports the aggregate-container count explicitly.

## v0.9.1 typed APAS policy Rule IR — 2026-09-27

Parser 0.4.4 adds explicit non-authorizing `policy` Rule IR for recurring APAS accounting shapes: minimum degree credits, institutional GPA, residency credits, final-credit residency, minimum major credits, upper-division major credits, and scoped designator-credit constraints. These rules are structured for explanation and coverage accounting but are hard-blocked from course matching, allocation, discovery, and solver execution. On the saved real Computer Science audit, parent wrappers are no longer double-counted as policy work: 7 aggregate containers are separated from 9 true policy/accounting constraints. Seven of those 9 constraints are typed policy rules and only 2 remain unclassified; strict and candidate course-route counts remain 2 and 1 respectively. The anonymous compatibility passport now reports `recognizedPolicyRules` and `unclassifiedPolicyConstraints` separately so campus-wide coverage growth can be measured without collecting raw APAS HTML or course history. Fresh-browser acceptance confirms parser 0.4.4 and Extension 0.9.1 while preserving all prior semantic retrieval, planner, Explore, and Schedule Builder gates.

## v0.9.0 semantic policy retrieval — 2026-09-27

Review-only APAS policy language now uses two physically separate retrieval channels. The classification channel searches only the internal typed policy-family registry; the evidence channel searches only curated official UMN pages extracted with the pinned JEV Ultra Fast snapshot implementation. A q4 `all-MiniLM-L6-v2` model provides optional 384-dimensional reranking from a ~53 MB local cache. The API returns `decisionAuthority: none`; retrieved matches never mutate Rule IR, prerequisite evaluation, degree allocation, the solver, or graduation feasibility. Fresh-browser acceptance verifies typed `gpa` / `residency` / `credit-cap` classifications, `policy.umn.edu` evidence links, `bounded-lexical+minilm` mode, and the review-only UI boundary. Six curated undergraduate policy sources refresh successfully through JEV with stable source keys, while manual snapshots remain quarantined from the student index.

## v0.8.1 native Schedule Builder integration — 2026-09-27

The course-detail Extension mount now inserts immediately after the native description and before the native prerequisite paragraph. The default intelligence row is transparent, flat, and separated by thin rules: no rounded cards, no drop shadows, and no detached panel chrome. Unit coverage locks the placement and style contract, and isolated-browser acceptance checks the real CSCI 5302 DOM plus computed style (`border-radius: 0`, `box-shadow: none`, transparent background). README demos were regenerated from this UI and the README itself was reduced to product description, features, demos, minimal setup, and disclaimers.

## v0.8.0 surface differentiation — 2026-09-27

The Web and Extension now have intentionally different acceptance contracts. Web must lead with the deterministic **Registration Advisor** brief and keep graduation-roadmap mechanics collapsed until requested. The Extension must expose a denser Course Intelligence rail. Final isolated-browser acceptance opens the real Spring 2027 CSCI 5302 Schedule Builder page and requires current-professor RMP aggregate evidence through GopherGrades, an expanded historical GPA trend chart, reviewed/manual Reddit excerpt/topic evidence when attached, and offering-history evidence. The real CSCI 1133 duplicate-credit eligibility regression remains in the same run. `V0_8_POSITIONING_ACCEPTANCE.md` documents the full product boundary.

Reddit/RateMyProfessors automated collection remains link-only. The reviewed-excerpt worker action is an explicit human-reviewed import path, not a scraping path. Community/RMP evidence remains excluded from degree truth and schedule feasibility.

## v0.7.1 provider-health patch — 2026-09-27

A final post-release health check found a monitoring correctness bug: one expected course-level GopherGrades 404 could overwrite the provider-wide health row and make `/api/health` report the entire source as down even while known live queries succeeded. Record-level 404s now remain local to that evidence request and do not poison provider-wide health. Provider health probes use known positive records, and `/api/health` actively refreshes Schedule Builder and GopherGrades health before responding. `tests/provider-health.test.ts` locks this behavior. On the patched running API both providers return `healthy`.
