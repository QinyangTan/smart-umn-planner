# Providers and provenance

All normalized external evidence carries source, retrieval timestamp and period; historical grades carry sample size. Section seat timestamps are displayed. Raw authenticated APAS is local only.

| Source | Mechanism | Observed / supported | Failure behavior |
|---|---|---|---|
| UMN APAS | Browser-authenticated semantic HTML | Main audit, Course History, explicit selectable attributes, first-party discovery | Retain previous local profile; report unknown rules / reconnect |
| UMN Schedule Builder | Public undocumented `api.php` GET + public page metadata | Twin Cities `type=course`, `type=sections`, `type=courses_wildcard`, `type=courses`, `type=courses_crse_attr`, and the official Twin Cities Liberal Education requirement catalog | Validate schema, preserve stale cache, exclude stale availability; non-Twin-Cities product requests fail closed |
| GopherGrades | Public `umn.lol/api/class/<code>` | Current public frontend/API is Twin Cities-scoped: historical counts, term distributions, instructor labels | Optional historical evidence; its scope defines Smart UMN's current public campus scope |
| Official UMN SRT | Separate provider, unavailable until verified integration | Official results landing page exists | Explicit unavailable status; no third-party substitution |
| Reddit / RMP | Original-link integration; permitted browser collection only | Verified public discussion URLs/titles; no ratings | Link-only by default; no automated bypass |

Current Schedule Builder `description` is an array and includes a `prereq:` entry. Course `equivalents` may be structured objects such as `{subject:"CSCI", catalog_nbr:"1133H"}`; the adapter normalizes these to canonical UMN course codes instead of stringifying raw objects. Sections use `id`, `section_number`, seconds since midnight, epoch date milliseconds, instructor objects nested under meetings and `auto_enroll_sections`. Parent lecture/lab registration may differ from meeting-bearing components. Adapter isolation prevents these raw shapes from leaking into planning logic.

GopherGrades returns `{success,data}`. Its current public frontend SQL hard-codes `campus == "UMNTC"` for class info, distributions, search, departments, and instructor classes; live probes for branch-campus-only courses returned no public class result. `total_grades` is a count map; distributions may group an instructor's multiple terms. Normalization expands per-term rows and never adds instructor aggregate totals again. Professor RMP scores and serialized `srt_vals` are deliberately not normalized into recommendation evidence.

Official references inspected:

- https://github.com/samyok/gophergrades — architectural context; no source-code reuse
- https://schedulebuilder.umn.edu/ — current public UI and JavaScript course-card structure
- https://srt.umn.edu/srt-results — official course-level results distinction and access links
- https://developer.chrome.com/docs/extensions/develop/concepts/network-requests — first-party content-script request behavior
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts — isolated content-script behavior and page integration

## JEV reuse

`packages/community/upstream/snapshot.js` is copied byte-for-byte with LICENSE and UPSTREAM.md from the existing local Hermes vendored JEV UltraFast source at commit `1231850a0bf1a0c0341fe408ef1668dbbfdfac46`. It provides stable node caches, bounded actionable snapshots and target guards. Planner transport/lifecycle code is separate from the ChatGPT-specific supervisor.

The prototype worker can collect one targeted original discussion per invocation using chrome-use only when `config/community-policy.json` has a current reviewed `allow` record for that host. Policy configuration is not a way to override a site's denial. Reddit and RateMyProfessors are explicitly `link-only` under the current review: the worker may persist verified original URLs and entity associations, but automated browser collection is disabled. Course references and instructor references use separate entity keys; RateMyProfessors links must resolve to an original `/professor/<id>` page and may only attach to a verified instructor identity. A block stops collection. Search/pagination automation and a continuously scheduled collector remain unavailable until a permitted source exists.

## API

`GET /api/health`, `GET /api/general-education?campus=UMNTC&term=...`, `GET /api/catalog/:subject?campus=UMNTC&term=...`, `GET /api/attributes/:attribute/:value?campus=UMNTC&term=...`, `GET /api/courses/:code?campus=UMNTC`, `GET /api/courses/:code/sections?campus=UMNTC`, `GET /api/courses/:code/context?campus=UMNTC`, `POST /api/course-context/batch` with `{codes,term,campus:"UMNTC"}`. Non-Twin-Cities product calls are rejected. The subject/attribute catalog routes expose only current public Schedule Builder metadata; APAS matching remains client-side. Maximum 12 codes per batch, 32 KiB request body, JSON content type, origin / Host checks. Data calls are rate-paced.

Private context / plans and recommendation / solver API routes return HTTP 409 in local mode: these operations are implemented in shared browser code to keep academic data local. There is no authenticated hosted account API. Do not treat the existence of an explicit unsupported route as an implemented cloud feature.
