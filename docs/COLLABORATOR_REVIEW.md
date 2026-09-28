# Collaborator review — 2026-09-28

Fresh remote review found one non-main branch: `origin/cheng-planning-goals`, authored by Cheng Peng (peng0477), commit `9ccd53b`. PR #1 targets main and was already merged as `386bc63`. `git merge-base origin/cheng-planning-goals main` is the collaborator tip: no unmerged contribution remains.

The branch changes 14 files: planning goal types/UI/persistence, solver ranking and explanations, course-wide grade signals, per-professor extension evidence, targeted tests, documentation, and a platform-safe static path separator. Code inspection confirms eligibility, conflicts and supported APAS allocation still precede ranking; unknown grade evidence is not assigned an invented grade. Per-professor rows join by instructor identity rather than borrowing the first instructor's evidence.

A clean archive of the collaborator tip (separate from the canonical checkout) passed all 132 branch tests, TypeScript and both builds. Current main passed all 154 baseline tests and both coverage gates. Real browser review on a new loopback origin imported only `tests/fixtures/apas-acceptance.html`, exercised the planning-goal controls and Plan/Explore navigation, and inspected the narrow layout. Fresh live extension acceptance remains a separate release gate; earlier reports are not substituted for that gate.

The browser review exposed a pre-existing graduation roadmap error: absent degree credits were treated as zero remaining credits and described as completion. Targeted regressions also reproduced drop-course horizon miscalculation and same-semester prerequisite promotion. Main now requires an explicit finite nonnegative remaining-credit total, adjusts dropped credits before building the horizon, and evaluates future prerequisites against completions before that semester. All three new regressions failed before the repair and pass afterward. The same browser import now shows “Not enough evidence” and requests APAS review.

Decision: retain the already merged collaborator contribution; repair these shared planning defects. This is acceptance of the contribution's intent, not production or campus-wide real-audit certification.
