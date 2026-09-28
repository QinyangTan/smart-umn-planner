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

Terminate TLS with a trusted reverse proxy or a named Cloudflare Tunnel. Preserve the public Host header. Bind remains 127.0.0.1 by default. For a container network set BIND_HOST=0.0.0.0 and firewall the backend so only the proxy can reach it. Do not expose SQLite, var/, .runtime/, source trees or private developer files. Only dist/web is served. Development and production build output are generated separately from source; rebuild after changing PUBLIC_ORIGIN.

`GET /api/health` is a cheap process liveness check with last-known provider health and aggregate counters. It performs no provider requests. `GET /api/health/providers` refreshes adapter health and is rate-limited. Health is public; it contains no student data, URLs from incoming requests, IPs or request bodies. These in-memory counters reset after restart.

Requests are bounded to 32 KiB JSON, 12 course codes per batch, 32 concurrent API requests, 120 requests/minute per socket address and 600/minute globally. Each provider has a bounded 32-request queue and a 12-second upstream timeout. The backend ignores forwarded client-IP headers. Behind a tunnel all clients share a socket-address budget: configure a front-proxy limit before increasing these conservative defaults. Rate limiting is not authentication; all served evidence is public.

## Persistent evidence and optional embeddings

Back up the public SQLite database with the SQLite backup API or after graceful shutdown; do not copy a live WAL database alone. The database must never receive APAS HTML or personal schedules. The deterministic core works with SMART_UMN_EMBEDDINGS=off. Warm optional MiniLM on the deployed service host before using cached auto mode; do not download models on student requests. See SEMANTIC_POLICY_RETRIEVAL.md. Policy refresh currently depends on the documented JEV worker and needs a separately provisioned worker; do not report an unconfigured refresh job as healthy.

## Stable hostname versus availability

A named tunnel on an existing domain provides a stable hostname, not an availability guarantee. A laptop-backed service goes offline when that machine sleeps or disconnects. Public student production use needs an always-on host, monitored restarts, backups, and appropriate provider/privacy review. No paid resource is required by the local build. A live deployment is accepted only after HTTPS health, clean-browser import/planning and production-extension origin tests pass.
