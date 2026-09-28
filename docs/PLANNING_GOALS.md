# Planning goals and academic exploration

## Current behavior

Plan now asks what matters most before **Build my plan**. The selection is local to the browser and defaults to the existing degree-progress behavior.

| Goal | Ranking after all hard constraints | Evidence boundary |
| --- | --- | --- |
| Make degree progress | Supported APAS coverage, allocated credits, timetable preferences | Existing behavior |
| Lightest useful load | Supported APAS coverage first, then fewer credits, then existing tie-breakers | Credit range is still student-controlled; this is not a reduced-load or graduation eligibility ruling |
| Compare grade history | Supported APAS coverage first, then complete course-wide historical A-range share, then existing tie-breakers | Every scheduled course needs nonstale data with at least 30 recorded letter grades. Complete-evidence plans appear before unranked ones. Missing data is not treated as a bad outcome. History does not predict a student's grade |

All goals preserve proven APAS course routes, prerequisites, current sections, linked sections, seats, meeting conflicts, travel buffers, and the bounded search. The existing **Why this plan?** explains the chosen goal. Because candidate discovery is bounded, the comparison covers the current loaded candidate pool rather than every course the University offers. The existing graduation roadmap remains a planning estimate; APAS and registration systems are authoritative.

## Next: long-range planning

The current roadmap estimates a graduation horizon and leaves future course assignments blank when offering or prerequisite evidence is insufficient. A next iteration should make prerequisite chains and possible bottleneck terms visible, let students compare course-load and summer scenarios, and report which future courses remain unassigned. It must never fill future schedules from a present-term section or imply a future offering is guaranteed.

## Next: undecided-major exploration

An undecided student should be able to choose two or three Twin Cities programs and compare official sample-plan paths, shared introductory courses, divergence points, and credits already articulated by UMN. The repository currently stores an official inventory of program **names**, not the per-program plan requirements. Before recommending a program-specific term, ingest and version the actual official sample plan, validate course identities and catalog year, and label the result **exploration only** until the student's own APAS contains that program. Do not synthesize degree requirements from a program name or apply one major's rules to another student's audit.

Suggested acceptance example: an undecided first-year student selects Computer Science and Statistics, sees the official source and catalog year for each path, common courses with a justified mapping, and a clear warning when either sample plan cannot be retrieved. A student near graduation selects Lightest useful load, enters a 1–6 credit range, and sees the smallest option among plans with equal proven APAS coverage, with unresolved policy requirements still visible.
