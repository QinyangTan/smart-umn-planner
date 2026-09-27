# Schedule Builder Course Intelligence UI

The Chrome extension is deliberately the **high-information-density** Smart UMN surface. Its job is to make Schedule Builder feel like a richer course-intelligence product without replacing Schedule Builder itself. It follows a strict **value-add only** rule: Schedule Builder remains the owner of official catalog/section presentation; Smart UMN should not restate information that is already visible next to the injected UI.

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

1. **APAS fit** — personalized Twin Cities remaining-requirement match plus current eligibility/prerequisite status. Eligibility always wins over a raw structural match.
2. **Grade intelligence** — course-wide historical GPA, sample size, grade-distribution sparkline, an expanded bar chart, and a term-by-term GPA trend derived from GopherGrades.
3. **Professor intelligence** — exact-current-instructor grade history plus RateMyProfessors overall-quality aggregate when that value is supplied by the GopherGrades upstream dataset. The UI explicitly says when RMP rating count/update date are unavailable and never invents difficulty or would-take-again metrics.
4. **Student voices** — curated/manual Reddit references, short reviewed excerpts when present, neutral topic-frequency summaries such as workload/projects/exams, and direct original-search links. Smart UMN does not generate a Reddit sentiment score.
5. **Offering history** — observed Fall/Spring/Summer history with confidence language. This is a planning signal, not a future-offering guarantee.
6. **Full planner** — a small escape hatch to the advisor-oriented web workflow.

Expanded panels are allowed only for richer versions of those same value-add datasets. There is no generic Details/Overview panel.

## Community-source boundary

Reddit and RateMyProfessors remain link-only for automated collection under the currently reviewed site policies. The extension can show a Reddit excerpt only when a human-reviewed/manual reference explicitly supplied that excerpt; it never bypasses site restrictions. RMP overall-quality values currently come indirectly from the public GopherGrades dataset and are labeled with that provenance. This preserves the dense information experience without pretending Smart UMN owns or independently measured third-party review data.

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
