# Operations

## Netlify serverless path

- Monitor the primary `https://smart-umn-planner.netlify.app/api/health` and `/api/health/providers`. A Netlify deploy being `ready` is not sufficient; invoke the function and run fresh-browser acceptance.
- Netlify applies a code-defined 120 requests / 60 seconds per IP+domain rate limit to `/api/*` before function execution. The in-memory `RequestBudget` remains defense-in-depth but is instance-local.
- The serverless live provider cache is intentionally ephemeral. Cold starts refetch Schedule Builder/GopherGrades data. Reviewed policy/community evidence comes only from `config/public-evidence-seed.json`.
- Refresh the reviewed public SQLite cache through the existing worker/policy workflow, run `npm run export:public-seed`, inspect the diff, then redeploy. Never seed APAS HTML, student records, plans, cookies or credentials.
- Before deploying from a DevSpace worktree, create a clean upload copy without the worktree `.git` pointer or deploy from a normal Git checkout. Do not upload `.runtime`, `var`, or local databases.
- A serverless rollout is accepted only after health/provider checks, hostile-origin rejection, a representative live course-context query, policy retrieval with `decisionAuthority: none`, and the synthetic fresh-profile browser gate.
- Keep the existing Cloudflare/Mac origin available as rollback while v0.10.2 is observed in production; it is no longer the primary availability path.

- Monitor `/api/health` for process availability and aggregate error/latency counters; inspect `/api/health/providers` separately for upstream failures. An unavailable optional historical/community provider must not authorize or block otherwise verified degree rules.
- Alert on repeated provider `schemaDrift`, failed refreshes, rising `overloaded` counts and stale official evidence. Preserve last-known cache with `stale:true`; the solver excludes stale official schedules.
- Restart only the Smart UMN service. Keep DevSpace and other tunnel routes unchanged. A deployment is not complete until external HTTPS checks pass.
- Roll back by checking out the previous reviewed commit in a separate deployment directory, reinstalling its lockfile and rebuilding for the same PUBLIC_ORIGIN. Preserve the public DB backup; never move private browser state to the server.
- A student can use **Forget local academic data**, clear the planner origin's site data, and remove the extension. Removing the extension does not clear the separate Web origin.
- Do not log bodies, query text, full URLs, cookies, headers, raw errors containing academic text, or student profiles. Current counters are aggregate and memory-only. If an incident may involve private data, stop collection and preserve only the minimum non-content diagnostic evidence.

## Custom-domain rollback checkpoint

Before the pending migration, Cloudflare's authoritative DNS editor showed `smartumn` as CNAME `d3d8090b-2935-4862-ad10-ab90540a9c3f.cfargotunnel.com`, proxied, TTL Auto. The existing `devspace-hermes` tunnel and `com.qinyang.smartumn` LaunchAgent remain active. The service, prior v0.10.1 extension artifact and a SQLite backup made with the backup API are preserved locally outside Git. Never copy a live WAL database alone. The old origin passed external HTTPS and loopback Host-header health checks during preflight.

If a later cutover fails, restore exactly that CNAME target, proxied status and Auto TTL, then verify external HTTPS, health and extension canonical-origin access. Preserve the unrelated `devspace` record. Current evidence proves the old origin works; it does not yet prove a post-cutover rollback drill.
