# v0.7.x product acceptance

Scope: University of Minnesota Twin Cities local release candidate. v0.7.1 adds the provider-health correctness patch described below. This document maps the eight product-hardening directions to concrete implementation and verification evidence. Smart UMN remains a planning aid; APAS and official registration systems remain authoritative.

| Direction | Implemented product behavior | Acceptance evidence |
| --- | --- | --- |
| 1. Broader real-world APAS coverage | Anonymous structural compatibility passport in the web UI plus `npm run report:apas-compatibility`; private audits stay local, unknown structures become sanitized synthetic regressions. Official inventories are verified separately from real-audit count. | `tests/apas-cross-major-matrix.test.ts`, `tests/all-twin-cities-programs.test.ts`, `docs/REAL_APAS_VALIDATION.md`, `npm run verify:majors` |
| 2. Multi-semester graduation roadmap | Deterministic term sequence, credit horizon, prerequisite-order projection, evidence-backed future course placement, and explicit blank future slots where UMN has not published enough evidence. | `tests/planning-product.test.ts`, browser acceptance roadmap assertions, demo 01 |
| 3. Historical offering patterns | Course-context history is converted into transparent Spring/Summer/Fall offering signals with bounded confidence; patterns are planning evidence, never a future-offering guarantee. | `offeringPattern()` tests, candidate rows, roadmap bottlenecks, demo 01 |
| 4. Rich section constraints | Latest class end, cross-building transition buffer, maximum campus days, linked components, restrictions, live seats, and opt-in waitlist-only sections are enforced by the deterministic solver. | `tests/solver-integrity.test.ts` |
| 5. Actionable uncertainty | Unknown prerequisite, capacity, policy, stale evidence, registration restriction, and future-offering reasons map to concrete next actions instead of generic warnings. | `actionableReview()` tests and APAS detail/roadmap review UI |
| 6. Registration handoff | Generated options expose class numbers, copy action, official Schedule Builder links, and one-click opening of the selected courses; final enrollment remains in UMN systems. | browser acceptance `registrationText`, demo 01 |
| 7. First-run/install/onboarding | Three-step APAS → verify → build/handoff onboarding, explicit local-privacy boundary, unpacked-extension setup guidance, and a packaged extension release artifact. | `tests/web-ux.test.ts`, `release/smart-umn-planner-extension-v0.7.1.zip` |
| 8. Deterministic what-if planning | Summer inclusion, roadmap credits/term, temporary primary-program-only scope, and compare-without-selected-course scenario persist locally; adding a real minor/second program requires importing its actual APAS. | `tests/planning-product.test.ts`, persistent disclosure regression, demo 02 |

## Broader product direction

The web app still exposes only **Plan** and **Explore** as primary destinations. Plan now surfaces graduation horizon, bottlenecks, review items, and **Why this plan?** without introducing dashboard sprawl. Explore remains the full official catalog ordered by APAS relevance rather than filtered by it.

## Correctness bugs found during final student-flow acceptance

- A scoped statement such as `Of the 23 credits required for …, 11 must have a CSCI designator` was initially treated as an independent subject-wide course authorization. Parser 0.4.3 now fails this accounting constraint closed unless the parent scope is machine-readable. The saved real CS audit now gives `CSCI 1113` neither a strict nor candidate fit from that wording.
- Browser acceptance initially allowed stale extension storage to overwrite the newly parsed fixture. The verifier now seeds the exact current profile into both web and extension state and asserts parser-version identity.
- The nested What-if disclosure initially collapsed after the first preference change. Its open state now survives rerenders.

## v0.7.1 provider-health hardening

A final post-release check found that an expected course-level GopherGrades 404 could overwrite provider-wide health and make `/api/health` report the whole source as down. v0.7.1 separates record-level not-found evidence from provider availability, probes known healthy records for provider health, and actively refreshes Schedule Builder + GopherGrades on `/api/health`. `tests/provider-health.test.ts` locks the regression. The final running API reports both providers healthy.

## Final acceptance boundary

The official-inventory gate verifies current program identities and structural title-independence; it is **not** a claim that 161 private real audits were collected. Real-audit sample count is reported separately. Demo recordings use synthetic academic state only.
