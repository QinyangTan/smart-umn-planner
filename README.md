# Smart UMN Planner

A working local-first academic-planning vertical slice for University of Minnesota Twin Cities students across majors, colleges, second majors, minors and certificates. Browser-owned UMN authentication, semantic APAS parsing for degree / major / minor / certificate routes, live Schedule Builder sections, historical GopherGrades evidence, original community links, a deterministic conservative solver, a web workspace and a Chrome extension that renders course context directly inside Schedule Builder.

**Status:** local release candidate for the Twin Cities planning scope. The current build passes its automated, live-provider, APAS-coverage, and isolated-Chrome acceptance gates, but it is not an official UMN graduation audit or registration authority. See [APAS coverage](docs/APAS_COVERAGE.md), [verification](docs/VERIFICATION.md), [web UI contract](docs/WEB_UI.md), and [limitations](docs/LIMITATIONS.md). No LLM is required. No credentials or API keys are required.

## Run

Requires Node.js 24 or newer (tested with 25.9), npm and Chrome 120+.

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4317/** in Chrome. The API binds only to loopback. SQLite public evidence cache is at `var/planner.sqlite`. Never expose this development server to the Internet.

## Install Chrome extension

1. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked** and select this project's `dist/extension` folder.
2. Open or reload `http://127.0.0.1:4317/` in the same Chrome profile.
3. Click **Connect UMN**. Complete any normal UMN login / Duo prompts yourself. The extension neither injects into UMN SSO nor reads credentials.
4. An existing APAS is found and parsed locally. The primary program stays primary, and the planner can explicitly import additional completed APAS program audits (for example a second major, minor, or certificate) without replacing it. The newest completed audit for each exact program title is used; ambiguous primary-program selection still fails closed.
5. In **Plan**, keep the default personalized settings or open **Make it yours**, then click **Build my plan**. The browser expands supported remaining APAS course/range rules, exact Twin Cities liberal-education categories, and conservative candidate routes from explicit APAS course pools across the current Twin Cities Schedule Builder catalog. It builds a balanced bounded candidate pool, verifies prerequisites and live sections, then runs the local deterministic timetable solver. Generated options include an **APAS allocation** block: one planned course is counted toward at most one supported remaining requirement, and options that advance more distinct supported targets rank ahead of equally valid alternatives. Manual candidate tuning stays under one optional disclosure instead of becoming another primary workflow.
6. Open any Twin Cities course in Schedule Builder. Smart UMN renders a compact **value-add insight rail** rather than duplicating the native course card: **APAS fit**, **Course grades**, **Instructor history**, and **References**. The default surface intentionally omits the course description, section number, seats, meeting time/location, instruction mode, and ordinary instructor listing because Schedule Builder already shows them. No Chrome side panel is used. See [docs/EXTENSION_UI.md](docs/EXTENSION_UI.md).

When extension code changes: `npm run build`, reload the extension in Chrome, then reload existing planner / Schedule Builder tabs. An expired session opens normal sign-in; the previous local profile is retained with its original sync timestamp.

## Verification

```sh
npm run typecheck
npm test
npm run verify:live
npm run verify:majors
# Optional: parse one locally saved private audit without uploading it:
npm run verify:live -- /absolute/path/audit.html
```

The current automated gate contains 80 tests. It includes anonymized real APAS structures, a cross-major synthetic APAS matrix spanning degrees/majors/minors/certificates, an official Twin Cities major-name smoke across all 146 current CAPE majors, an APAS program-degree identity smoke across all 161 current Sample Plans rows, strict/candidate/policy/unknown coverage accounting, AP/IB/transfer-credit prerequisite and duplicate-credit regressions, saved real public provider responses, unknown-rule regressions, transfer / in-progress courses, conservative prerequisite logic, dated meeting conflicts, linked sections, cache degradation, DOM rerenders, Shadow DOM, batching, source-link dedupe and privacy permissions. Aggregate APAS coverage evidence is written to `docs/evidence/apas-coverage-20260927.json`; the 161-program matrix is in `docs/evidence/twin-cities-program-coverage-20260927.json` and `docs/TWIN_CITIES_PROGRAM_COVERAGE.md`. Raw private HTML is not copied into those reports.

`npm run verify:live` prints counts and public provider evidence only. `npm run verify:majors` refetches both official inventories: CAPE Major Profiles for current major names and Twin Cities Sample Plans for degree/program identities that more closely resemble APAS headings. It fails on inventory drift and runs the same ten-shape APAS structural matrix across every current major name and program-degree title, covering strict routes, exclusions, GPA/count wrappers, candidate-only caps, policy constraints, and a deliberately unsupported fail-closed route. If optional local APAS files are supplied, verification reports only parser/count health and never prints or saves the private normalized profile. Raw private HTML must not be placed in fixtures or committed.

## Community worker

Collection is separate from the student-facing request path. Under the current reviewed policy, Reddit and RateMyProfessors are **link-only**: Smart UMN may attach verified original discussion/professor URLs to course or instructor entities, but it does not automate scraping on those hosts.

```sh
npm run worker -- import-link 'CSCI 5302' 'https://www.reddit.com/r/uofmn/comments/kal74z/' 'CSCI 5302 with Daniel Boley?'
npm run worker -- import-instructor-link 'Daniel Boley' 'https://www.ratemyprofessors.com/professor/309254' 'Daniel Boley at University of Minnesota - Twin Cities'
npm run worker -- status
```

For a permitted source, set `CHROME_USE_BIN` to the existing `chrome-use` binary, configure a reviewed `allow` policy in `config/community-policy.json`, and use `worker -- collect <course> <original-url>` or `worker -- collect-instructor <name> <original-url>`. The worker reuses the pinned JEV UltraFast snapshot (MIT), a separate persistent session, guarded DOM operations, rate limits and incremental job state. It stops at authentication / CAPTCHA / blocking / drift, and a `link-only` policy cannot be overridden by the worker. See [providers](docs/PROVIDERS.md).

## Local privacy and plans

Academic state and saved plans live in Chrome extension storage and the planner origin's localStorage. Only public Twin Cities course/subject identifiers, official requirement-category identifiers, and term are sent to the local API; APAS requirements themselves stay in the browser. No raw authenticated HTML, identity header or authentication material is sent. **Manage UMN connection & privacy → Forget local academic data** clears the local profile and saved plans. Browser sync/cloud accounts are not used.

## Layout

- `packages/schemas`: normalized domain models, rule AST, provider interfaces
- `packages/apas-parser`: semantic browser DOM parser and audit discovery
- `packages/core`: prerequisites, rule matching, eligibility, dated schedule solver
- `packages/providers`: isolated current source adapters, SQLite cache and health
- `packages/community`: neutral reference extraction, URL / entity validation, JEV snapshot
- `packages/ui`: shared course, grades and reference rendering
- `apps/web`: responsive planning workspace
- `apps/extension`: MV3 background, APAS connection, web bridge, Schedule Builder observers and Shadow-DOM inline course rendering
- `apps/api`: loopback public-evidence API
- `apps/worker`: bounded JEV collector and link import

The web workspace intentionally has only two primary destinations — **Plan** and **Explore**. APAS details, connection/privacy controls, candidate-course tuning and saved plans stay progressive/on-demand instead of becoming competing top-level pages. **Explore never filters the official catalog because of a student's APAS**; it simply moves proven APAS matches first, review-only candidate routes second, and unrelated courses after them. The current visual system follows a restrained Folwell-inspired UMN maroon/gold editorial language, uses small state transitions, and honors `prefers-reduced-motion`. See [docs/WEB_UI.md](docs/WEB_UI.md).

No code was copied from GopherGrades. Its public repository and live response structure informed the historical evidence adapter. The API excludes RMP rating fields and does not label third-party SRT-like fields as official UMN feedback.
