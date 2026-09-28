# Twin Cities Course Intelligence coverage

Public-data snapshot: **6,105 current Schedule Builder courses across 330 subjects** for term `1273`, checked 2026-09-28T04:13:12.085Z.

This is a public-source coverage audit, not a claim that every course has every optional evidence layer. Official Schedule Builder fields and third-party historical/community evidence are reported separately.

## Official UMN current-course layer

- Subject catalogs: **330/330 healthy**, 0 degraded, 0 unavailable.
- Description present: **6,092 / 6,105 (99.8%)**.
- Credits known: **6,105 / 6,105 (100%)**.
- At least one current section indexed: **6,036 / 6,105 (98.9%)**.
- Courses with published prerequisite text: **2,934**; deterministic parser handles 1,259 and leaves 1,675 review-only rather than guessing.
- Official attribute-tagged courses: **1,046**.

## Historical grade evidence

GopherGrades department endpoints were available for **320/330 subjects**; 10 had no department record and 0 errored during this snapshot.
No department record: **CAHP, CMPE, GME, LM, PHRM, POP, PREV, RONC, VIET, VTMD**.
Current courses with historical GopherGrades records: **3,457 / 6,105 (56.6%)**. A missing historical record is shown as unavailable; Smart UMN does not synthesize grades.
Offering-history charts are derived from per-course historical distributions when that course context is available; this campus-wide department scan does **not** report a separate offering-history coverage percentage.

## Community / professor evidence

Community collection remains **curated/link-only**. The local reviewed store currently contains 1 course-level reference covering 1 current course. Campus-wide current-professor/RMP coverage is intentionally **not claimed by this audit** because exact instructor identity depends on live sections and per-course historical distributions.

## Subjects with the largest current-course historical-grade gap

| Subject | Current courses | With historical grades | Gap |
|---|---:|---:|---:|
| MUSA | 178 | 3 | 175 |
| INMD | 118 | 11 | 107 |
| LAW | 209 | 105 | 104 |
| CVM | 102 | 51 | 51 |
| PUBH | 169 | 119 | 50 |
| NURS | 104 | 61 | 43 |
| LANG | 35 | 2 | 33 |
| MUS | 81 | 50 | 31 |
| MED | 30 | 1 | 29 |
| SURG | 30 | 1 | 29 |
| DT | 28 | 0 | 28 |
| PED | 28 | 0 | 28 |
| ESL | 38 | 11 | 27 |
| ANTH | 51 | 26 | 25 |
| FNRM | 41 | 16 | 25 |
| TH | 69 | 45 | 24 |
| ECON | 59 | 35 | 24 |
| FSOS | 56 | 32 | 24 |
| EPSY | 94 | 71 | 23 |
| VMED | 31 | 8 | 23 |

## Product interpretation

- Schedule Builder is the authority for current course identity, description, credits and sections.
- GopherGrades is an optional historical layer; absence never blocks APAS fit or schedule construction.
- Reddit/RateMyProfessors remain contextual evidence and never enter prerequisite, degree-allocation or solver truth.
- “Supports all Twin Cities courses” means the Extension can attach to recognized Schedule Builder course pages and degrade gracefully when optional evidence is absent; it does **not** mean every course has grades, professor ratings or community discussion.
