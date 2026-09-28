# Contributing

Use a feature branch and pull request. Describe a concrete student problem, reproduce it, add a regression, repair the cause and rerun the same flow. CI must pass tests, TypeScript, both builds, corpus/course coverage gates and production packaging checks. Live source canaries run separately; PR correctness does not depend on transient external pages.

Never commit real APAS HTML or academic records, personal screenshots, credentials, browser profiles or policy snapshots from authenticated systems. Use a sanitized synthetic fixture for a structural regression, and the strict anonymous compatibility intake for real structural counts. Preserve the distinction between official identity inventory, synthetic shapes and anonymous real fingerprints.

Main protection was queried on 2026-09-28 with repository admin access. GitHub returned 403: this private repository needs an eligible paid plan (or public visibility) for branch protection. No visibility or billing change was made. Until an owner enables protection, PR review and required green CI are contributor policy rather than server-enforced protection. CODEOWNERS records review ownership; it does not itself enforce review.

Release procedure: complete the gates in the user's acceptance contract; synchronize versions; package for the production origin; verify README assets and synthetic demos; create an annotated tag and release with extension zip/demo MP4s only after fresh browser acceptance. Do not release merely because the test count increased.
