# Limitations

Smart UMN Planner is currently a local-first **Twin Cities** prototype with a public Web/public-evidence API deployment. Personalized academic state remains browser-local; the hosted service is not a student-account backend.

## Data-source boundaries

- **UMN Schedule Builder:** the current public `api.php` routes are usable but undocumented. They are isolated behind an adapter, schema checks, health state, caching, and stale-data handling. A future UMN change can still require an adapter update.
- **GopherGrades / campus scope:** the current public GopherGrades frontend/API is Twin Cities-only. To keep the combined product internally consistent, Smart UMN currently supports Twin Cities Schedule Builder only rather than offering branch-campus planning with a missing historical-evidence pillar.
- **APAS / uAchieve:** personalized degree data is read from the student's browser-authenticated first-party pages. This is not a documented production APAS API. Semantic DOM/parser changes may require an update.
- **Official UMN course feedback:** no verified integration is implemented yet; third-party fields are not relabeled as official feedback.
- **Reddit / RateMyProfessors:** current policy is link-only. The prototype stores verified original links/entity associations but does not scrape those hosts or import their ratings into ranking.

## Planning correctness boundary

The rule engine is deliberately conservative. AP/IB/test/transfer credit is recognized only after APAS has articulated it to a UMN-equivalent course with positive awarded credit and an explicit source; the planner does not predict future credit from an exam score or external equivalency table. A proven completion rule may authorize a course; an explicit APAS course pool whose cap/exception semantics are unresolved is exposed only as a **candidate route**, never as proof that the course will satisfy the requirement. Degree-wide caps, residency/GPA allocation rules, unresolved linked sections, unknown meeting times, stale availability, or unproven prerequisites remain review-only and cannot authorize a final schedule. Supported cross-requirement assignment is deterministic and scarcity-aware, prevents one planned course from being double-counted, and prefers distinct remaining-target coverage; it is not a claim that every institutional double-count exception or degree-wide allocation policy has been modeled. Generated schedules are planning aids, not graduation audits or registration guarantees.

## Product / deployment boundary

- The production Node service binds to loopback behind a named Cloudflare Tunnel at `https://smartumn.qinyangtan.com`; Cloudflare terminates TLS. The backend has no student accounts, hosted academic-state storage, application sessions, or institutional SSO because personalized state intentionally stays in the browser.
- The canonical `smartumn.qinyangtan.com` origin is still laptop-backed until DNS/custom-domain promotion is completed. A separate Netlify serverless deployment has passed end-to-end staging acceptance and removes the laptop dependency on its own hostname, but it is not yet the canonical origin.
- The Chrome extension is currently distributed as a reviewed ZIP / unpacked Developer-mode build rather than through the Chrome Web Store.
- Academic state is local but not application-level encrypted; software with access to the same machine/browser profile may be able to read browser storage.
- The extension initiates normal UMN/APAS navigation but never captures credentials, Duo codes, cookies, or SAML material.
- Community references are displayed for human review and are never converted into a sentiment, difficulty, or professor-quality score.
- Large subject/result pages use viewport-aware rendering and bounded public-data batches. One-click APAS discovery checks at most 12 rule-derived subjects (range subjects first, then subjects with more explicit course routes) and 12 exact official Twin Cities requirement categories, and loads at most 16 candidate courses per run; additional matches are reported rather than silently treated as exhaustive.

## Production work still required

The canonical HTTPS deployment has bounded public API inputs, origin/Host checks, request budgets, provider timeouts, persistent public SQLite storage, schema-version checks, synthetic fresh-browser acceptance, and aggregate health metrics. The Netlify serverless staging path has also passed public API and fresh-browser acceptance using an ephemeral live cache plus a checked-in reviewed public-evidence seed. Remaining public-release work is primarily canonical custom-domain promotion/rollback, explicit provider/privacy/legal governance, Chrome Web Store packaging/review, schema-drift alerting, formal accessibility/UX review, and a larger anonymous real-APAS compatibility corpus. The serverless seed must be refreshed and redeployed when curated official policy snapshots expire; stale snapshots remain non-authoritative and disappear from current policy evidence.

## Checkpoint deployment note

The source of truth is the Hermes workspace. The current Chrome unpacked installation uses a separate build directory under Documents/Codex. Its displayed version and loaded path must be checked after deployment. Local academic records parsed by an older build may lack campus identity and remain prerequisite-review-only until APAS is synced with the current parser; the planner must not infer a missing campus to make them pass.
