# Privacy and security

- No UMN login form, password handling, Duo handling, cookie API, cookie serialization, SAML parsing, auth-header logging, network interception or credential upload exists in the application.
- The manifest grants storage and alarms only. Content scripts run on uAchieve `/selfservice/`, Schedule Builder and loopback planner pages, not SSO/Duo pages. The extension has no Chrome Side Panel dependency.
- APAS is parsed from semantic DOM. Only program, academic records, requirement metadata and parser status persist locally. Raw HTML and student identity headers are not uploaded or saved by the extension.
- Backend cache contains public courses, sections, grades, source health and community links only. Solver and saved plans run locally. Course-context batches reject extra fields, and subject-catalog discovery receives only a public subject code plus term; the APAS rule that triggered the lookup remains in the browser.
- Extension storage access is restricted to trusted extension contexts. Only the precise `http://127.0.0.1:4317` web origin receives normalized academic state; Schedule Builder content scripts cannot retrieve the profile. They obtain public course context plus limited derived prerequisite/degree-fit results. When APAS changes, the background worker broadcasts only a refresh signal to open Schedule Builder tabs.
- All source-provided text is HTML-escaped; original community URLs use HTTPS with a strict host/path allowlist. Links use noopener/noreferrer. The web page has a restrictive CSP and no external scripts, fonts or analytics.
- Only extension-owned sync tabs are closed. Authentication credentials remain managed by Chrome and UMN. Logging captures counts and public provider state only.
- Remember that localStorage / extension storage is not application-level encryption; other software with access to the user's Chrome profile or machine may access stored academic data. This prototype does not provide a multi-user threat boundary.
- The local raw pages used during development are outside the deliverable under `work/inspection/`. Structural fixtures strip identity headers and real course history. Do not publish raw captures.

Data removal: use **Forget local academic data**, clear site data for the planner origin, or remove the extension. Removing the extension alone does not erase the web origin's localStorage. Public caches can be removed by deleting this project's `var/` directory when the server is stopped.
