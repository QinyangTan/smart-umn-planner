# Limitations

Smart UMN Planner is currently a local-first **Twin Cities** prototype with a public Web/public-evidence API deployment. Personalized academic state remains browser-local; the hosted service is not a student-account backend.

## Data-source boundaries

- **UMN Schedule Builder:** the current public `api.php` routes are usable but undocumented. They are isolated behind an adapter, schema checks, health state, caching, and stale-data handling. A future UMN change can still require an adapter update.
- **GopherGrades / campus scope:** the current public GopherGrades frontend/API is Twin Cities-only. To keep the combined product internally consistent, Smart UMN currently supports Twin Cities Schedule Builder only rather than offering branch-campus planning with a missing historical-evidence pillar.
- **APAS / uAchieve:** personalized degree data is read from the student's browser-authenticated first-party pages. This is not a documented production APAS API. Semantic DOM/parser changes may require an update.
- **Official UMN course feedback:** no verified integration is implemented yet; third-party fields are not relabeled as official feedback.
- **Reddit / RateMyProfessors:** current policy is link-only. Smart UMN stores verified original links/entity associations but does not scrape those hosts. A single RMP aggregate is displayed only when GopherGrades already republishes it for an unambiguous instructor match; it never enters schedule ranking. Reuse terms for these sources have not been legally reviewed; see [GOVERNANCE.md](GOVERNANCE.md).

## Planning correctness boundary

The rule engine is deliberately conservative. AP/IB/test/transfer credit is recognized only after APAS has articulated it to a UMN-equivalent course with positive awarded credit and an explicit source; the planner does not predict future credit from an exam score or external equivalency table. A proven completion rule may authorize a course; an explicit APAS course pool whose cap/exception semantics are unresolved is exposed only as a **candidate route**, never as proof that the course will satisfy the requirement. Degree-wide caps, residency/GPA allocation rules, unresolved linked sections, unknown meeting times, stale availability, or unproven prerequisites remain review-only and cannot authorize a final schedule. An aggregate credit pool with no direct course list, such as “take 23 credits from the lists below”, is promoted only to the cap-free subset of its child lists. This happens only when each included list's own credit cap is at least the remaining need. Lists with count ranges (“0–2 courses”), approval gates, exceptions or caps below the remaining need, and courses named in a combined cap (“up to 3 credits from A, B and C combined”), stay review-only. The derivation is recorded in `rawMetadata.derivedRule` (parser 0.4.6). Supported cross-requirement assignment is deterministic and scarcity-aware, prevents one planned course from being double-counted, and prefers distinct remaining-target coverage; it is not a claim that every institutional double-count exception or degree-wide allocation policy has been modeled. Generated schedules are planning aids, not graduation audits or registration guarantees.

## Product / deployment boundary

- The primary public Web/public-evidence origin is `https://smartumn.qinyangtan.com`, served by Netlify Free. The Netlify service subdomain remains available as an alternate hostname. The backend has no student accounts, hosted academic-state storage, application sessions, or institutional SSO because personalized state intentionally stays in the browser.
- The historical Mac/Cloudflare service remains available only as a rollback origin behind the previously recorded Tunnel CNAME. It is laptop-backed and can go offline when that host sleeps or disconnects; primary availability no longer depends on it.
- The Chrome extension is currently distributed as a reviewed ZIP / unpacked Developer-mode build rather than through the Chrome Web Store. Version 0.10.7 is production-accepted: the canonical download is byte-identical to the reviewed Git artifact, and the online exact package passed fresh-profile browser and accessibility acceptance. Chrome Web Store item `ocbpkaiefaaboeiliopklleejlfnegbd` has been uploaded but is not yet approved or published. Its submission state is controlled in the owner's Dashboard. The Store build is key-free, so it has the Store-assigned ID, which the production API explicitly allows.
- Academic state is local but not application-level encrypted; software with access to the same machine/browser profile may be able to read browser storage.
- The extension initiates normal UMN/APAS navigation but never captures credentials, Duo codes, cookies, or SAML material.
- Community references are displayed for human review and are never converted into a sentiment, difficulty, or professor-quality score.
- Large subject/result pages use viewport-aware rendering and bounded public-data batches. One-click APAS discovery checks at most 12 rule-derived subjects (range subjects first, then subjects with more explicit course routes) and 12 exact official Twin Cities requirement categories, and loads at most 16 candidate courses per run; additional matches are reported rather than silently treated as exhaustive.

## Production work still required

The primary Netlify HTTPS deployment has bounded public API inputs, exact host/origin checks, Netlify edge rate limiting, provider timeouts, an ephemeral public live cache, a reviewed public-evidence seed, synthetic fresh-browser acceptance, and fail-closed policy freshness. As of v0.10.5 there is a scheduled production canary with provider-outage versus schema-drift classification, a documented governance boundary, and a formal accessibility pass (axe-core plus keyboard, dialog, reflow and reduced-motion checks on the Web and the Schedule Builder extension UI). Remaining public-release work:

- Chrome Web Store upload, review and publication.
- A larger anonymous real-APAS compatibility corpus. Real AP, IB, other test-credit, multi-program, minor, certificate and unusual transfer audits are still unrepresented.
- The human/legal items in [GOVERNANCE.md](GOVERNANCE.md).
- Screen-reader testing with a real assistive technology. The automated and keyboard checks do not replace it.
- A regular policy-seed refresh. Curated policy snapshots stop being served 7 days after capture and must be refreshed and redeployed. Stale snapshots stay non-authoritative and disappear from current policy evidence, and the canary warns 4 days before expiry.
- APAS DOM drift can only be observed inside a student's authenticated browser. The server-side canary cannot see it; parser regressions are guarded by fixtures and the anonymous compatibility passport.

## Checkpoint deployment note

The source of truth is the Hermes workspace. The current Chrome unpacked installation uses a separate build directory under Documents/Codex. Its displayed version and loaded path must be checked after deployment. Local academic records parsed by an older build may lack campus identity and remain prerequisite-review-only until APAS is synced with the current parser; the planner must not infer a missing campus to make them pass.

## Canonical-domain status

The controlled v0.10.3 cutover completed on 2026-09-28. Public DNS for `smartumn.qinyangtan.com` now targets `smart-umn-planner.netlify.app`; Netlify has a matching Let’s Encrypt certificate, and final-host API, security-header, edge-rate-limit, fresh-profile Web and fresh-profile extension acceptance passed. The old Tunnel-backed service remains intentionally preserved for rollback. Free-hosting availability is still not a permanent-service guarantee, and external UMN/GopherGrades availability remains outside Smart UMN’s control.
