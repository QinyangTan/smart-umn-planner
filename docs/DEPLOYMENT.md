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

For Netlify, build the Web for the final HTTPS origin and deploy the function plus `dist/web`. The serverless handler has an exact HTTPS host/origin allowlist and exact extension ID; it does not rely on mutable runtime environment variables for those security boundaries. Its in-process request budget remains defense-in-depth; the Netlify edge rule is the cross-instance per-client control. Netlify Free does not provide the Enterprise-only absolute per-domain aggregate ceiling, so provider queues/timeouts remain the backend-wide safety boundary. Optional MiniLM is not bundled into the lexical-only function path; `packages/retrieval/lexical.ts` and `documents.ts` intentionally contain no HuggingFace/native dependency.

DevSpace Git worktrees store `.git` as a pointer to an absolute local path. Do not upload that pointer to Netlify. Deploy from a clean source copy that excludes `.git`, `node_modules`, `.runtime`, `dist`, `release` and `.netlify`, or deploy from a normal Git checkout.

## Persistent evidence and optional embeddings

For the long-running Node service, back up the public SQLite database with the SQLite backup API or after graceful shutdown; do not copy a live WAL database alone. The database must never receive APAS HTML or personal schedules. The deterministic core works with SMART_UMN_EMBEDDINGS=off. Warm optional MiniLM on a long-running host before using cached auto mode; do not download models on student requests. The Netlify function deliberately runs lexical-only retrieval. See SEMANTIC_POLICY_RETRIEVAL.md. Policy refresh currently depends on the documented JEV worker; refresh the reviewed source cache and regenerate/redeploy the public seed rather than reporting an unconfigured refresh job as healthy.

## Stable hostname versus availability

A named tunnel on an existing domain provides a stable hostname, not an availability guarantee. The historical Mac/Cloudflare origin goes offline when that machine sleeps or disconnects. An independently accepted Netlify serverless deployment is available as an always-on hosting path, but the canonical custom-domain cutover must not occur until DNS/TLS and the final hostname pass the same HTTPS API and clean-browser/extension acceptance gates. No paid resource is required by either current path.
