# Schedule Builder Inline UI

The extension follows a strict **value-add only** rule. Schedule Builder remains the owner of official catalog/section presentation; Smart UMN should not restate information that is already visible next to the injected UI.

## What Schedule Builder owns

Do not duplicate these in the default Smart UMN surface:

- course title or description
- section number/component
- open/closed label or remaining seats
- meeting days/times
- classroom/location
- instruction mode
- the ordinary instructor listing

Those fields may still exist in the provider model because the planner/solver needs them. They are not default extension presentation.

## What Smart UMN adds

The inline rail is reserved for information Schedule Builder does not natively present in the same place:

1. **APAS fit** — personalized Twin Cities remaining-requirement match across imported degree / major / minor / certificate program routes plus a derived prerequisite verdict. Candidate-only routes use a warning state instead of a checkmark.
2. **Course grades** — Twin Cities historical GPA summary, most-common grade, sample size, and a compact distribution sparkline from GopherGrades.
3. **Instructor history** — the same Twin Cities historical summary for the instructor(s) teaching the current section when exact identity evidence exists.
4. **References** — original Reddit / RateMyProfessors / other reviewed links for human context only; no Smart UMN sentiment, difficulty, or professor-quality score.
5. **Full planner** — a small escape hatch to the richer web workflow.

Expanded panels are allowed only for richer versions of those same value-add datasets. There is no generic Details/Overview panel.

## Visual hierarchy

The default surface should be readable in one glance:

- one small Smart UMN brand line;
- a responsive row of 3–4 insight cards;
- one strong value, one short supporting line, optional tiny visualization;
- subtle UMN maroon/gold accents rather than a second full application embedded inside Schedule Builder;
- no side panel and no iframe;
- source links are direct and clearly labeled.

The historical-grade pattern is inspired by the successful GopherGrades approach: compact inline placement, average/most-common/sample-size summaries, and a small chart. Smart UMN implements its own DOM/CSS and adds APAS-personalized context rather than embedding GopherGrades UI.

## Regression guard

Tests must assert that the inline Shadow DOM does **not** contain fixture-native catalog values such as course description, seat counts, meeting location, or section number. This prevents a future refactor from turning Smart UMN back into a duplicate Schedule Builder.
