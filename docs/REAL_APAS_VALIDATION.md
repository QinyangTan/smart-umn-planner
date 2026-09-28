# Real APAS validation program

Smart UMN should expand real-world correctness without collecting raw student audits in GitHub or in the local public-data API. The project therefore separates **private local parsing** from **anonymous structural compatibility evidence**.

## How a real student audit is validated

1. Save the APAS audit (and optionally Course History) locally in the tester's browser/machine.
2. Generate schema-v1 anonymous JSON locally with `npm run --silent report:apas-compatibility -- <audit.html> [history.html] > report.json`, or use **Copy anonymous compatibility report** in the APAS detail panel. The `--silent` flag matters when redirecting npm output so the file contains JSON only.
3. Validate and add a reviewed anonymous report with `npm run add:apas-corpus -- report.json`; then run `npm run verify:apas-corpus`. The checked-in corpus is `docs/evidence/apas-compatibility-corpus.json`.
4. The schema contains only parser/schema version, a coarse rule-family fingerprint, program-kind counts, strict/candidate/policy/aggregate/unresolved counts, warning/in-progress counts, and transfer cohorts as counts only (`apCreditCount`, `ibCreditCount`, other test credit, and non-test transfer). It contains no program name, course code, requirement text, exam name, source institution, or raw HTML.
5. The validator uses an exact allowlist and rejects extra fields such as `programName` or course lists. Coverage buckets, policy buckets, transfer cohorts, and program-kind counts must also satisfy internal accounting invariants.
6. Never commit raw APAS HTML, course history, student names, internet IDs, cookies, SAML/Duo material, or screenshots containing personal data.
7. When a new structural shape fails, reproduce it with a sanitized synthetic fixture that preserves the DOM/rule semantics but removes identity and course-history details; fix the parser/engine, add a regression, and rerun the official 146-major / 161-program identity matrix.

## Coverage cohorts to recruit

The next real-audit validation pool should deliberately include: CSE, CLA, Carlson, CBS, CEHD, Design, Nursing, CFANS, CCAPS and interdisciplinary programs; first-year AP/IB-heavy students; transfer students; honors students; students with second majors; minor/certificate combinations; students near graduation; and students with residency/GPA/cap exceptions.

Real-audit count is reported separately from the official identity matrix. Passing 146/146 major names or 161/161 program-degree identities proves title independence and structural compatibility, **not** that 161 private real audits were observed.

The current checked-in anonymous corpus contains **1 real report / 1 unique structural fingerprint**. It has a degree program, non-test transfer credit and in-progress coursework, but currently has **0 AP-credit reports, 0 IB-credit reports, 0 multi-program reports, and no real samples from the other target cohorts yet**. Synthetic tests verify AP/IB parsing and duplicate-credit behavior, but they are not counted as real cohort evidence.

## Promotion rule

A previously unseen APAS structure may become strict/executable only when the machine-readable semantics are sufficient to prove the rule. Otherwise it remains candidate-only, policy-only, or unresolved. LLM output is never an authority for promotion. The release corpus gate intentionally fails when a checked-in report still contains unresolved requirements or unclassified policy constraints; preserve the private audit locally, create a sanitized regression, fix or explicitly contain the shape, then regenerate the anonymous report.
