# Data, provider and legal governance

This page describes what Smart UMN Planner actually does with each data source, where data lives and how long, and which questions still need a human or legal owner. It describes operational behavior; it is **not** a legal opinion and does not claim institutional approval.

## Status

- Smart UMN Planner is an independent student project. It is **not affiliated with, endorsed by, or operated by the University of Minnesota**, and no UMN office has reviewed or approved it.
- Official APAS, advisors, registration systems and University policy remain authoritative. Smart UMN output never authorizes degree completion, prerequisite satisfaction, eligibility, registration, graduation or course allocation.
- The product has no accounts, no hosted student-profile database, no advertising, no analytics scripts and no data sales or broker transfers.

## Where data lives

| Data | Location | Retention | Leaves the browser? |
|---|---|---|---|
| Normalized APAS profile, planning preferences, saved plans | `localStorage` on `smartumn.qinyangtan.com` and `chrome.storage.local` in the extension | Until the student uses **Forget local academic data**, clears site data or removes the extension | No. The extension bridges it only to the exact canonical Web origin in the same browser |
| Raw authenticated APAS HTML | Read in-page by the extension content script | Not stored; parsed then discarded | No |
| Passwords, Duo codes, cookies, SAML assertions, authorization headers | Never read by Smart UMN | — | No |
| Public course code / term / campus | Sent to `/api/*` to fetch public evidence | Not logged by Smart UMN code | Yes, public identifiers only |
| Review-only policy lookup phrase (≤ 2,000 chars) plus public program/catalog metadata | Sent to `/api/policy/search` | Not logged or persisted by Smart UMN code; the response echoes only a truncated SHA-256 fingerprint of the phrase back to the caller | Yes, bounded |
| Live Schedule Builder / GopherGrades responses | In-memory SQLite inside a Netlify Function instance | Lost on every cold start; bounded TTL | Public data only |
| Curated UMN policy snapshots and reviewed community links | `config/public-evidence-seed.json` in Git | Policy snapshots stop being served 7 days after capture (fail closed) | Public data only |
| Connection metadata (IP, user agent, TLS) | Netlify edge/platform | Under Netlify's own terms; Smart UMN code does not log it | Processed by the host |

Netlify's edge rate limiter aggregates requests by IP and domain to enforce 120 requests / 60 s. Smart UMN code does not read or persist that IP.

## Sources and their boundaries

| Source | How Smart UMN uses it | Role | What it must never do |
|---|---|---|---|
| UMN APAS (umn.uachieve.com) | Read in the student's own authenticated session by the content script | The only personal academic truth, kept local | Be uploaded, stored server-side or read on SSO/Duo pages |
| UMN Schedule Builder (public, undocumented `api.php`) | Server-side GETs for public course, section and Liberal Education data; inline rendering on the student's own Schedule Builder page | Current official offering evidence | Be treated as a stable documented API; adapter isolation plus the drift canary exist because it can change without notice |
| UMN policy library (policy.umn.edu/education) | Six reviewed public policy pages, hashed and dated | Review-only explanation (`decisionAuthority: none`) | Authorize any course or satisfy any requirement |
| GopherGrades (umn.lol, third-party student project) | Server-side GETs for historical grade distributions; Twin Cities only | Optional historical context; a visible, student-chosen tie-breaker when **Compare grade history** is selected | Predict a grade, or be ranked above APAS coverage, prerequisites or availability |
| RateMyProfessors | Original-page links. A single aggregate score is shown only when GopherGrades already republishes it for an unambiguous instructor match, with a link to the source | Source-labeled context | Be scraped by Smart UMN, change schedule ranking, or be merged across ambiguous identities |
| Reddit (r/uofmn) | Search links plus a small set of reviewed original thread links | Source-labeled context | Be scraped, sentiment-scored, or influence planning outcomes |

No professor or student is given a hidden score. Schedule ranking uses APAS allocation, prerequisites, section availability, conflicts and the preferences the student set explicitly (credit load, campus days, online preference, preferred instructors, and optionally grade history). Each applied preference is explained next to the plan.

## Operational controls

- Exact host/origin allowlist and exact extension ID on the API; hostile origins receive HTTP 403.
- Request bodies bounded to 32 KiB, 12 course codes per batch; student-data routes return 404/409.
- Strict CSP (`script-src 'self'`), HSTS, `nosniff`, `no-referrer`; no remote executable extension code.
- Chrome permissions limited to `storage` and `alarms` plus three exact hosts.
- Scheduled production canary (`.github/workflows/production-canary.yml`) checks TLS, DNS route, headers, API health, provider outage versus schema drift, policy-seed freshness, hostile-origin rejection, rate limiting and live-ZIP integrity. It uses public endpoints only and never sends student data or credentials.

## Open items that need a human or legal owner

These are not resolved by engineering and are listed so nobody mistakes silence for approval:

1. **Schedule Builder API use.** The endpoint is public but undocumented. No written UMN permission is on file. Traffic is cached and rate-bounded, but an owner should confirm acceptable use with UMN if the product grows.
2. **GopherGrades reuse.** Smart UMN calls the public umn.lol API and shows its RMP aggregates with attribution. No written permission from the GopherGrades maintainers is on file.
3. **RateMyProfessors terms.** Smart UMN does not scrape RMP, but it displays an RMP-derived aggregate obtained through GopherGrades. Whether that display is acceptable under RMP's terms has not been reviewed by counsel.
4. **Use of UMN names.** "UMN" appears descriptively. No UMN logo or mark is used, and every surface carries the non-affiliation notice. Trademark fit has not been reviewed by counsel.
5. **Repository license.** The repository has no `LICENSE` file, so default copyright applies. The owner should choose a license before inviting outside contributions. The vendored JEV snapshot keeps its own upstream license.
6. **FERPA / institutional policy.** Smart UMN never receives education records on a server. The student's own browser processes the student's own audit. A University data-governance review has not been requested.

## Change control

Any change that would add a data flow off the device, a new host permission, a new external source, logging of request content, or a new ranking input must update this page, `docs/PRIVACY.md`, the public `privacy.html`, `docs/store/listing.md` and the Chrome Web Store privacy disclosures in the same pull request.
