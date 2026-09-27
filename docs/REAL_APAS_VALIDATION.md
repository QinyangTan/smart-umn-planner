# Real APAS validation program

Smart UMN should expand real-world correctness without collecting raw student audits in GitHub or in the local public-data API. The project therefore separates **private local parsing** from **anonymous structural compatibility evidence**.

## How a real student audit is validated

1. Save the APAS audit (and optionally Course History) locally in the tester's browser/machine.
2. Run `npm run report:apas-compatibility -- <audit.html> [history.html]` locally, or use **Copy anonymous compatibility report** in the APAS detail panel.
3. The resulting report contains only parser version, structural rule-family fingerprint, program-kind counts, open requirement counts, strict/candidate/policy/unresolved route counts, transfer/in-progress counts, and warning count.
4. Never commit raw APAS HTML, course history, student names, internet IDs, cookies, SAML/Duo material, or screenshots containing personal data.
5. When a new structural shape fails, reproduce it with a sanitized synthetic fixture that preserves the DOM/rule semantics but removes identity and course-history details; fix the parser/engine, add a regression, and rerun the official 146-major / 161-program identity matrix.

## Coverage cohorts to recruit

The next real-audit validation pool should deliberately include: CSE, CLA, Carlson, CBS, CEHD, Design, Nursing, CFANS, CCAPS and interdisciplinary programs; first-year AP/IB-heavy students; transfer students; honors students; students with second majors; minor/certificate combinations; students near graduation; and students with residency/GPA/cap exceptions.

Real-audit count is reported separately from the official identity matrix. Passing 146/146 major names or 161/161 program-degree identities proves title independence and structural compatibility, **not** that 161 private real audits were observed.

## Promotion rule

A previously unseen APAS structure may become strict/executable only when the machine-readable semantics are sufficient to prove the rule. Otherwise it remains candidate-only, policy-only, or unresolved. LLM output is never an authority for promotion.
