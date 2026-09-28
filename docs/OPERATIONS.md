# Operations

- Monitor `/api/health` for process availability and aggregate error/latency counters; inspect `/api/health/providers` separately for upstream failures. An unavailable optional historical/community provider must not authorize or block otherwise verified degree rules.
- Alert on repeated provider `schemaDrift`, failed refreshes, rising `overloaded` counts and stale official evidence. Preserve last-known cache with `stale:true`; the solver excludes stale official schedules.
- Restart only the Smart UMN service. Keep DevSpace and other tunnel routes unchanged. A deployment is not complete until external HTTPS checks pass.
- Roll back by checking out the previous reviewed commit in a separate deployment directory, reinstalling its lockfile and rebuilding for the same PUBLIC_ORIGIN. Preserve the public DB backup; never move private browser state to the server.
- A student can use **Forget local academic data**, clear the planner origin's site data, and remove the extension. Removing the extension does not clear the separate Web origin.
- Do not log bodies, query text, full URLs, cookies, headers, raw errors containing academic text, or student profiles. Current counters are aggregate and memory-only. If an incident may involve private data, stop collection and preserve only the minimum non-content diagnostic evidence.
