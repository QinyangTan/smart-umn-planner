# Operations

## Netlify serverless path

- Monitor the canonical `https://smartumn.qinyangtan.com/api/health` and `/api/health/providers`. The Netlify service subdomain remains useful for origin diagnosis, but a Netlify deploy being `ready` is not sufficient; invoke the canonical hostname, compare the live `/smart-umn-extension.zip` SHA with the reviewed release artifact, and run fresh-browser acceptance on the online-downloaded package.
- Netlify applies a code-defined 120 requests / 60 seconds per IP+domain rate limit to `/api/*` before function execution. The in-memory `RequestBudget` remains defense-in-depth but is instance-local.
- The serverless live provider cache is intentionally ephemeral. Cold starts refetch Schedule Builder/GopherGrades data. Reviewed policy/community evidence comes only from `config/public-evidence-seed.json`.
- Refresh the reviewed public SQLite cache through the existing worker/policy workflow, run `npm run export:public-seed`, inspect the diff, then redeploy. Never seed APAS HTML, student records, plans, cookies or credentials.
- Before deploying from a DevSpace worktree, create a clean upload copy without the worktree `.git` pointer or deploy from a normal Git checkout. Do not upload `.runtime`, `var`, or local databases.
- A serverless rollout is accepted only after health/provider checks, hostile-origin rejection, a representative live course-context query, policy retrieval with `decisionAuthority: none`, and the synthetic fresh-profile browser gate.
- Keep the existing Cloudflare/Mac service, LaunchAgent and public SQLite cache available as rollback after the v0.10.3 custom-domain cutover; they are no longer the primary availability path.

- Monitor `/api/health` for process availability and aggregate error/latency counters; inspect `/api/health/providers` separately for upstream failures. An unavailable optional historical/community provider must not authorize or block otherwise verified degree rules.
- Alert on repeated provider `schemaDrift`, failed refreshes, rising `overloaded` counts and stale official evidence. Preserve last-known cache with `stale:true`; the solver excludes stale official schedules.
- Restart only the Smart UMN service. Keep DevSpace and other tunnel routes unchanged. A deployment is not complete until external HTTPS checks pass.
- Roll back by checking out the previous reviewed commit in a separate deployment directory, reinstalling its lockfile and rebuilding for the same PUBLIC_ORIGIN. Preserve the public DB backup; never move private browser state to the server.
- A student can use **Forget local academic data**, clear the planner origin's site data, and remove the extension. Removing the extension does not clear the separate Web origin.
- Do not log bodies, query text, full URLs, cookies, headers, raw errors containing academic text, or student profiles. Current counters are aggregate and memory-only. If an incident may involve private data, stop collection and preserve only the minimum non-content diagnostic evidence.

## Custom-domain rollback checkpoint

The accepted v0.10.3 production route is Cloudflare authoritative DNS `smartumn` as a DNS-only CNAME to `smart-umn-planner.netlify.app`. Netlify owns the active Let’s Encrypt certificate for `smartumn.qinyangtan.com`. The pre-cutover rollback value is CNAME `d3d8090b-2935-4862-ad10-ab90540a9c3f.cfargotunnel.com`, Proxied, TTL Auto.

The existing `devspace-hermes` tunnel and `com.qinyang.smartumn` LaunchAgent remain active, and the old service still answers its loopback Host-header health check as v0.10.1. If Netlify/custom-domain production fails, restore exactly the rollback CNAME target, Proxied status and Auto TTL, then verify external HTTPS, `/api/health`, provider health and extension canonical-origin access. Preserve the unrelated `devspace` record. Do not delete the rollback service merely because the cutover is currently healthy.
