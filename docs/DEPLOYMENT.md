# Deploying Web and the public-evidence API

The Web and API share one origin. The API stores only public evidence in SQLite; personal audits and schedules remain in browser storage. No user accounts or academic server database are introduced by hosting.

## Build and run

Use Node 24 or newer and a persistent directory writable only by the service user. Choose the final HTTPS origin before packaging the extension:

```sh
npm ci
NODE_ENV=production PUBLIC_ORIGIN=https://planner.example.org npm run build
NODE_ENV=production PUBLIC_ORIGIN=https://planner.example.org \
  EXTENSION_IDS=YOUR_32_LETTER_CHROME_EXTENSION_ID \
  PLANNER_DB=/persistent/smart-umn/planner.sqlite PORT=4317 \
  SMART_UMN_EMBEDDINGS=off npm start
```

Replace the example origin and extension ID. A production server refuses missing/insecure origins or invalid extension IDs. Only the compiled Web origin receives normalized academic state from the extension. The production manifest grants that exact host, UMN APAS and Schedule Builder, with no wildcard web access, cookies, tabs, or Side Panel permission. Chrome host patterns do not constrain ports; the bridge verifies the complete origin at runtime.

Terminate TLS with a trusted reverse proxy or a named Cloudflare Tunnel. Preserve the public Host header. Bind remains 127.0.0.1 by default. For the local named-Cloudflare-Tunnel topology, set `TRUSTED_PROXY=cloudflare-loopback`; the server will use a valid `CF-Connecting-IP` for the per-client request budget only when the direct socket peer is loopback. Without that explicit mode, forwarded client-IP headers remain ignored. For a container network set BIND_HOST=0.0.0.0 and firewall the backend so only the proxy can reach it; `cloudflare-loopback` intentionally does not trust a non-loopback proxy peer. Do not expose SQLite, var/, .runtime/, source trees or private developer files. Only dist/web is served. Development and production build output are generated separately from source; rebuild after changing PUBLIC_ORIGIN.

`GET /api/health` is a cheap process liveness check with last-known provider health and aggregate counters. It performs no provider requests. `GET /api/health/providers` refreshes adapter health and is rate-limited. Health is public; it contains no student data, URLs from incoming requests, IPs or request bodies. These in-memory counters reset after restart.

Requests are bounded to 32 KiB JSON, 12 course codes per batch, 32 concurrent API requests, 120 requests/minute per client budget key and 600/minute globally. Each provider has a bounded 32-request queue and a 12-second upstream timeout. By default the client key is the direct socket address. With `TRUSTED_PROXY=cloudflare-loopback`, a loopback Cloudflare Tunnel may supply one syntactically valid `CF-Connecting-IP`, preventing unrelated public clients from sharing the same per-client bucket while preserving the global safety budget. Non-loopback peers and malformed headers always fall back to the socket address. Rate limiting is not authentication; all served evidence is public.

## Netlify serverless deployment

The repository also supports an always-on public-evidence deployment on Netlify Free. Netlify applies a code-defined 120 requests / 60 seconds per IP+domain rate limit to the public API before function execution. `netlify/functions/api.mts` serves only the public `/api/*` routes; normalized APAS state, saved plans, schedules and credentials remain browser-local. The function uses an in-memory SQLite cache for live Schedule Builder/GopherGrades responses. Cold starts therefore lose only refetchable public cache entries.

Reviewed evidence that must survive cold starts is checked in as `config/public-evidence-seed.json`: six curated UMN policy snapshots plus explicitly reviewed community/RMP links. Regenerate it from a reviewed public-cache database with:

```sh
npm run export:public-seed
# or
node scripts/export-public-evidence-seed.ts /path/to/planner.sqlite config/public-evidence-seed.json
```

The export contains no APAS HTML, student identity, course history, plans, credentials or cookies. Policy snapshots still pass the normal source/hash/freshness validation at runtime; a stale seed stops appearing as current official evidence rather than gaining authority.

For Netlify, build the Web for the final HTTPS origin and deploy the function plus `dist/web`. The production build command is intentionally explicit: `NODE_ENV=production PUBLIC_ORIGIN=https://smartumn.qinyangtan.com npm run package:extension`. `tests/netlify-api.test.ts` locks this contract so Netlify cannot silently republish a localhost-host-permission ZIP. The serverless handler has an exact HTTPS host/origin allowlist and exact extension ID; it does not rely on mutable runtime environment variables for those security boundaries. Its in-process request budget remains defense-in-depth; the Netlify edge rule is the cross-instance per-client control. Netlify Free does not provide the Enterprise-only absolute per-domain aggregate ceiling, so provider queues/timeouts remain the backend-wide safety boundary. Optional MiniLM is not bundled into the lexical-only function path; `packages/retrieval/lexical.ts` and `documents.ts` intentionally contain no HuggingFace/native dependency.

DevSpace Git worktrees store `.git` as a pointer to an absolute local path. Do not upload that pointer to Netlify. Deploy from a clean source copy produced from tracked Git content (for example `git archive HEAD`) or a normal Git checkout, excluding `.git`, `node_modules`, `.runtime`, prior `dist`, local release byproducts and `.netlify`. The first direct uploader attempt against the live DevSpace tree scanned gigabytes of runtime state and was intentionally aborted; clean-source upload is the accepted path.

## Persistent evidence and optional embeddings

For the long-running Node service, back up the public SQLite database with the SQLite backup API or after graceful shutdown; do not copy a live WAL database alone. The database must never receive APAS HTML or personal schedules. The deterministic core works with SMART_UMN_EMBEDDINGS=off. Warm optional MiniLM on a long-running host before using cached auto mode; do not download models on student requests. The Netlify function deliberately runs lexical-only retrieval. See SEMANTIC_POLICY_RETRIEVAL.md. Policy refresh currently depends on the documented JEV worker; refresh the reviewed source cache and regenerate/redeploy the public seed rather than reporting an unconfigured refresh job as healthy.

## Stable hostname versus availability

The primary public origin is now `https://smartumn.qinyangtan.com`, served by the accepted Netlify deployment. The Netlify service subdomain `https://smart-umn-planner.netlify.app` remains available as an alternate hostname. The historical Mac/Cloudflare service remains running only as a rollback origin and can go offline when that machine sleeps or disconnects; primary availability no longer depends on it. No paid resource is required by the current hosting path.

## Canonical custom-domain production (2026-09-28)

`https://smartumn.qinyangtan.com` is attached to Netlify site `3acbab52-b741-466a-bc3b-75c138903c83` and is the canonical production origin. Cloudflare authoritative DNS now publishes `smartumn` as a DNS-only CNAME to `smart-umn-planner.netlify.app`. Netlify successfully validated DNS and installed a Let’s Encrypt certificate whose SAN is `smartumn.qinyangtan.com`; direct SNI checks against both observed Netlify service IPs returned the matching certificate and v0.10.3 API response.

Version 0.10.9 is the current accepted production package. Netlify deploy `6abb2501b846eb5ba9201214` (2026-09-28) reports v0.10.9 health and serves the v0.10.9 direct-download ZIP (SHA-256 `ee926306c06f7b58efec56ca496936e53adac217eaa1357ea63b0af289d1eb74`) plus the static synthetic `/demo-apas.html` used by demo mode. It was deployed from a clean `git archive` of the reviewed branch head with `netlify deploy --build --prod`. Earlier deploys: v0.10.8 `6abb1ecabff0a7672a2fbd80`, v0.10.7 `6abb0b23cd07cfcb373fd2c4`, v0.10.6 `6abafacae8b38b6727167aa4`, v0.10.5 `6abaedabfb679a14c7b9e9ca`, v0.10.4 `6abae0cb80e36dc07af5e8e5`.

The API origin allowlist contains exactly two extension IDs. `cleikpoiflloemienikmmmedkniblobc` is fixed by the manifest `key` in the direct-download ZIP. `ocbpkaiefaaboeiliopklleejlfnegbd` is the Chrome Web Store item, which forbids `key`. The Store upload is the key-free `release/*-webstore.zip` (v0.10.9 SHA-256 `37c5b7308327d29d336b44ff962d5af1b2ed62626c660ecfaf6d5e52c4a996a4`), and `verify:release` proves it differs only by `key`. The production manifest grants only the canonical Smart UMN host plus UMN APAS and Schedule Builder, and the canonical `/smart-umn-extension.zip` must be byte-identical to `release/smart-umn-planner-extension-v<version>.zip`. `npm run verify:production` checks this. Store PNG generation deliberately avoids platform zlib so the Netlify/Linux and macOS artifacts stay byte-stable.

Netlify's project-level **Powered by Netlify badge is disabled**. On this Free-plan project the badge was edge-injected as a `srcdoc` inline-script frame, which Smart UMN's strict CSP correctly blocked. Keep the badge off rather than adding `unsafe-inline` to `script-src`.

Rollback is intentionally retained. Note that the rollback service currently runs **v0.10.1**, not the current release; a rollback therefore temporarily serves older Web behavior and an older ZIP, and the production canary will report the version/ZIP mismatch until Netlify is restored. To roll back, restore the `smartumn` record to CNAME `d3d8090b-2935-4862-ad10-ab90540a9c3f.cfargotunnel.com`, Proxied, TTL Auto. The `com.qinyang.smartumn` LaunchAgent and its public SQLite cache remain intact for that rollback; do not change the unrelated `devspace` DNS record or tunnel.
