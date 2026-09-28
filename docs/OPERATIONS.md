# Operations

## Monitoring and alerting

- **Production canary**: `.github/workflows/production-canary.yml` runs `npm run verify:production` every 6 hours and on demand. It needs no `npm ci`, no secrets and no student data. Each check has one category:
  - `canonical`: DNS CNAME to Netlify, TLS certificate days remaining (warn below 21, fail below 7), home/privacy/support HTTP 200, Netlify edge, `/api/health` running, and the deployed version matching `package.json`.
  - `security`: HSTS/CSP/nosniff/no-referrer headers, hostile Origin → 403, and policy search staying `decisionAuthority: none`.
  - `provider-outage` vs `schema-drift`: live `CSCI 1133` context is validated against the normalized contract. Data present but malformed, or a provider message about schema/mismatch/invalid, is **drift** and always fails. An unreachable upstream is an **outage**: it fails for Schedule Builder and only warns for optional GopherGrades.
  - `policy-freshness`: official policy evidence is actually served, and the oldest seeded snapshot is more than 4 days (warn) / 2 days (fail) from its 7-day expiry.
  - `package`: the live `/smart-umn-extension.zip` SHA-256 equals the release ZIP for the current version.
  - `rate-limit`: any HTTP 429 on the canary's own low-volume requests fails.
- **Notification**: a scheduled failure opens, or comments on, one open GitHub issue labelled `production-canary`, using the workflow `GITHUB_TOKEN`. Repository watchers get GitHub's normal email. The report is uploaded as an artifact for 30 days. No Slack/pager channel is configured. Adding one needs an owner-provided secret, and no credential has been invented.
- **Source canaries**: `live-canaries.yml` runs daily and checks the Twin Cities subject directory, ten subject catalogs, the Liberal Education catalog, GopherGrades and all official majors directly against the upstream sources.
- **Not observable server-side**: APAS/uAchieve DOM drift. Only a student's authenticated browser can see it. It is guarded by parser fixtures, the anonymous compatibility corpus and the in-product "Audit structure is not supported" failure.
- **Accessibility regression**: `SMART_UMN_CHROMIUM=… PUBLIC_ORIGIN=https://smartumn.qinyangtan.com npm run verify:a11y` runs axe-core and keyboard/dialog/reflow checks with a fresh profile and the synthetic fixture only. Set `SMART_UMN_EXTENSION_DIR` to an unzipped online download to test the exact published package.

## Policy seed refresh (required at least weekly)

Seeded policy snapshots stop being served 7 days after capture. The canary warns at 4 days remaining.

1. On a trusted machine: `PLANNER_DB=/path/to/public-cache.sqlite npm run policy:refresh`. It uses the JEV/Playwright worker against `policy.umn.edu/education` only.
2. `node scripts/export-public-evidence-seed.ts /path/to/public-cache.sqlite config/public-evidence-seed.json`, then review the diff. It must contain public policy text and reviewed links only.
3. Run the full release gate. Seed-only changes do not alter the extension ZIP, so they do not need a version bump.
4. Deploy from a clean `git archive` of the reviewed commit, then run `npm run verify:production` and confirm `policy-seed-expiry` passes.

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

The existing `devspace-hermes` tunnel and `com.qinyang.smartumn` LaunchAgent remain active, and the old service still answers its loopback Host-header health check as v0.10.1. Re-checked on 2026-09-28 after the v0.10.5 release: the LaunchAgent is loaded, and the loopback health check on port 4320 answers v0.10.1 / parser 0.4.5. A rollback therefore serves **v0.10.1** behavior and ZIP until Netlify is restored; retiring or upgrading that service is a separate owner decision. If Netlify/custom-domain production fails, restore exactly the rollback CNAME target, Proxied status and Auto TTL, then verify external HTTPS, `/api/health`, provider health and extension canonical-origin access. Preserve the unrelated `devspace` record. Do not delete the rollback service merely because the cutover is currently healthy.
