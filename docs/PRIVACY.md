# Privacy and security

Smart UMN Planner is an independent student planning tool. It is not affiliated with or endorsed by the University of Minnesota. Official APAS, advising, registration and University policies remain authoritative.

## Single purpose

The Chrome extension connects a student's existing UMN APAS audit to Smart UMN's local planning experience and adds source-labeled course intelligence inside UMN Schedule Builder. It does not provide advertising, social tracking, credential management or unrelated browser features.

## Data the extension handles locally

On `https://umn.uachieve.com/selfservice/`, after the student signs in through UMN's own pages, the extension reads the rendered audit and normalizes the academic records, program metadata and requirement structure needed for planning. Chrome Web Store policy treats page content as potentially sensitive user data, so Smart UMN discloses this as **website content** even though the normalized academic profile stays in the user's Chrome/browser storage.

Smart UMN does **not** read or store passwords, Duo codes, authentication cookies, SAML assertions or authorization headers. Raw authenticated APAS HTML and student identity headers are not uploaded to the Smart UMN public API and are not saved by the extension.

The Web planning surface keeps its copy of the normalized academic profile, preferences and saved plans in that browser's local storage. Browser/extension storage is not application-level encryption; software with access to the same machine or Chrome profile may be able to read it.

## Data sent to the public-evidence API

The extension and Web contact only the canonical HTTPS Smart UMN public-evidence origin to obtain public planning evidence.

Requests may include:
- public course code, term and Twin Cities campus code;
- for review-only policy lookup, a bounded requirement phrase (maximum 2,000 characters) plus public program/catalog metadata.

The API does not accept raw APAS HTML, completed-course history, saved schedules, credentials, cookies or student identifiers. Smart UMN application code does not log or persist policy-query text, incoming request bodies, IP addresses or student profiles. Public provider responses may be cached; aggregate operational counters may be kept in memory. Netlify supplies hosting/TLS and necessarily processes normal connection metadata under its own terms.

Policy retrieval is explanation/review evidence only (`decisionAuthority: none`); it cannot make a degree, prerequisite or registration decision.

## Schedule Builder and third-party evidence

On `https://schedulebuilder.umn.edu/`, Smart UMN renders course intelligence next to the course using public UMN Schedule Builder data and optional public historical/context sources. RateMyProfessors and Reddit references are original links or reviewed context only. Smart UMN does not scrape either site. A professor-rating aggregate appears only when the public GopherGrades service already republishes it, with a link to its source. Source and legal boundaries are summarized in [GOVERNANCE.md](GOVERNANCE.md). Following an external link sends the browser to that third-party site under that site's privacy practices.

Smart UMN does not sell user data, use it for advertising, build advertising profiles, or transfer academic data to data brokers. The project has no advertising or analytics scripts. Humans do not read individual academic profiles through a Smart UMN backend because those profiles are not stored there.

## Chrome permissions

- **storage** — stores the normalized APAS profile, connection status and saved planning state locally in Chrome.
- **alarms** — schedules a periodic APAS refresh only after a profile has already been connected.
- **umn.uachieve.com/selfservice** host access — reads the student's APAS audit after the student reaches the official UMN audit page.
- **schedulebuilder.umn.edu** host access — renders Course Intelligence within the official UMN Schedule Builder page.
- **smartumn.qinyangtan.com** host access — bridges local academic state to the canonical Smart UMN Web in the same browser and requests public evidence from the Smart UMN API.

The extension does not request cookies, webRequest, browsing-history, all-sites, geolocation, clipboard, downloads or Side Panel permissions. Manifest V3 code is packaged with the extension; it does not execute remotely hosted JavaScript.

## Limited Use

Smart UMN uses data accessed through extension permissions only to provide or improve its user-facing APAS planning and Schedule Builder Course Intelligence features. It does not use or transfer that data for personalized advertising, creditworthiness, resale, unrelated profiling or other purposes outside this single purpose.

## Security

The public service is HTTPS-only and uses an exact host/origin allowlist, bounded request inputs, rate limiting and restrictive browser security headers. Source-provided text is escaped before rendering. Community links use approved HTTPS hosts and open with `noopener`/`noreferrer`.

## Delete your data

Use **Forget local academic data** in Smart UMN, clear site data for `smartumn.qinyangtan.com`, and remove the extension if desired. Removing the extension clears its Chrome extension storage but does not automatically clear the separate Web origin's local storage.

## Development evidence

Automated acceptance uses checked-in synthetic APAS fixtures. Raw authenticated development captures and private academic records must never be committed to the repository, store listing, screenshots or public issue trackers.

For privacy questions, use the support/contact information published on the Smart UMN Web site. Do not send private audits, student IDs, passwords or authentication material in public support messages.

Policy updated September 28, 2026.
