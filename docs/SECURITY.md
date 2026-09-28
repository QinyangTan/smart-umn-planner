# Security and privacy threat model

## Trust boundaries

APAS and Schedule Builder DOM, saved browser state, public provider responses, and community references are untrusted inputs. The API accepts public course identifiers and bounded policy queries only. It has no student account, credential endpoint or academic persistence. Degree/prerequisite/conflict authority remains deterministic; embeddings and community evidence cannot grant eligibility. Browser state is a planning copy, not a signed institutional audit.

| Threat | Implemented control / evidence | Remaining boundary |
|---|---|---|
| Malicious APAS markup, unknown structures | Semantic DOM parser, escaped output, local import bounds, fail-closed Rule IR, synthetic parser and storage tests | A structurally valid forged audit is not cryptographically distinguishable from user-edited local data |
| Malicious Schedule Builder DOM | Bounded course-code discovery; public API supplies context; exact permitted sender host; inline text nodes/escaping; extension tests | Live DOM drift requires canary/browser acceptance |
| XSS and unsafe links | CSP, text escaping, HTTPS source allowlists, noopener/noreferrer, malicious community regression tests | A future renderer change must retain escaping |
| Poisoned localStorage / Chrome storage | Bounded recursive profile validation, explicit profile/storage versions, bounded preferences/plans; storage-validation tests | Local machine/browser compromise can read local academic data |
| Localhost CSRF / DNS rebinding / origin confusion | Exact Host and Origin allowlists; JSON content type; cross-site fetch-metadata rejection; real HTTP tests | Public API is intentionally not authenticated; CORS is not access control for non-browser clients |
| URL injection / SSRF | Fixed provider roots; bounded canonical identifiers; no caller-supplied fetch URL; policy collector restricted to public policy.umn.edu education paths | Operator-selected public sources require manifest review |
| Provider poisoning / drift / overload | Adapter schemas, stale flags, bounded queue, upstream timeout, schemaDrift and overload counters; provider/solver tests | Undocumented upstream schemas can still change; stale sections cannot authorize schedules |
| Community source spoofing | Entity-specific references and strict links; RMP only via matched legitimate evidence; community tests | Curated content remains subjective context; no automated Reddit sentiment |
| Policy source spoofing / stale evidence | Configured source identity and URL, text hash, seven-day TTL, manifest-owned scope, redirect rejection; semantic-retrieval tests | Hash detects content mismatch, not independent institutional authenticity; HTTPS and curated source review remain required |
| Extension privilege abuse | storage/alarms only; no cookie, Side Panel, webRequest or broad tabs permission; production origin compiled into bridge and manifest | Store review and new permission prompts remain external acceptance gates |
| Private academic logging/persistence | Rejected private API fields/endpoints, generic HTTP errors, aggregate counters, no body/URL/IP logging; marker-based real HTTP tests | Reverse proxy/hosting access logs must also be configured to avoid bodies and query text |

## Release requirements

Never run a public demo or browser acceptance using a real student's saved audit. Use synthetic identity and synthetic academic history only. Anonymous compatibility reports have a separate strict allowlisted count schema, not this local normalized profile schema. A production claim requires fresh browser and extension acceptance, HTTP boundary tests, live provider checks, version/artifact checks and reviewed deployment configuration.

Dependency audit on 2026-09-28 found zero reported production dependency vulnerabilities (`npm audit --omit=dev`). This is a point-in-time check, not proof that dependencies are vulnerability-free.
