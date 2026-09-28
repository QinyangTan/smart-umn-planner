# APAS coverage contract

Smart UMN is scoped to **University of Minnesota Twin Cities** because the public historical-grade pillar used by the product is Twin-Cities scoped. Within Twin Cities, program support is structural rather than a major allowlist.

## Program identity

The parser accepts any non-empty APAS program title. It does not require `CS`, `CSE`, `BSCompSc`, or a curated degree-name table. A connected profile can contain one primary audit plus explicitly imported second majors, minors, and certificates. Additional-program requirement IDs are namespaced by exact program title before they enter matching/allocation.

## Strict course routes

A remaining APAS node can authorize a course only when its course-choice semantics are structurally proven. Current strict forms include:

- exact selectable courses;
- APAS level wildcards such as `5XXX`;
- unions of explicit selectable courses/ranges;
- explicit structured exclusions (`notcourses`), including labels that say `except` when the excluded course list is machine-readable;
- structurally proven required course counts;
- structurally proven required credit totals;
- requirement GPA wrappers when a course pool is also proven;
- deterministic subject-level labels such as `4xxx/5xxx-level <SUBJECT> coursework`;
- standalone designator-credit rules such as `11 credits must have a JOUR designator`; designator constraints explicitly scoped to credits required by another requirement stay policy/review-only unless that parent scope is machine-readable;
- exact official Twin Cities Liberal Education categories from current Schedule Builder metadata.

These forms are department-agnostic. Regression fixtures cover examples from psychology, statistics, history, biology, marketing, graphic design, nursing, food science, educational psychology, and computer science.

## Candidate routes

When APAS exposes an explicit course pool but the quantitative policy is not fully modeled, Smart UMN keeps the pool as a **candidate route**. Candidate routes may personalize Explore, but they do not certify degree completion and do not become strict solver allocation targets. Examples include:

- `up to` / `no more than` caps;
- prose-only or otherwise unstructured compound exceptions;
- qualified Liberal Education labels where an additional lab/field condition remains;
- other explicit pools whose count/credit semantics are not proven.

## Policy/accounting constraints

Requirements such as total degree credits, institutional GPA, institutional/final-credit residency, total major credits, upper-division-major totals, scoped subject-designator accounting, qualified official categories, and degree-application scope are represented by typed non-authorizing Policy Rule IR when their prose matches a proven generic shape. Policy rules are structured for explanation and coverage accounting but never independently authorize a course, enter degree allocation, or become solver inputs. A policy shape that is not yet recognized remains visibly unclassified rather than being guessed.

## Local coverage analyzer

Development and diagnostics use `analyzeRequirementRouteCoverage(profile)` entirely in the browser/local runtime. It never sends the APAS tree, labels, grades, or program history to the public-data API.

For the combined profile and for each imported program separately, the analyzer reports mutually exclusive support buckets, so `strict + candidate + aggregate-container + policy + unresolved = total`:

- total active remaining requirements;
- strict-supported requirements;
- candidate-route-supported requirements;
- non-authorizing aggregate parent containers whose semantics live in child nodes;
- policy/accounting constraints, split into typed Policy Rule IR and still-unclassified constraints;
- unknown/unrouted requirements;
- strict coverage percentage;
- useful-route coverage percentage (strict + candidate);
- a deterministic rule-shape breakdown for exact course, subject range, official attribute, credits, count, GPA, exclusions, nested `anyOf/allOf`, candidate-only, and unknown;
- an unsupported-reason histogram gathered from unresolved rule branches.

A nested rule counts as strict-supported only when it can actually authorize at least one course under three-valued semantics. For example, an `anyOf` with one proven course branch and one unknown branch remains useful because the proven branch can still produce `yes`; an `allOf` with an unresolved branch is not counted as strict-supported. Candidate routes remain separate and never become proven completion claims.

When no active remaining requirements exist, the denominator-free strict/useful coverage values are reported as 100%, while the active requirement count remains zero.

## AP / IB / transfer credit

Smart UMN does not maintain a separate per-major AP-equivalency table. Instead, it trusts the student's browser-authenticated APAS course history after UMN has already articulated the external credit to a UMN-equivalent course.

An AP, IB, test-credit, or other transfer row can satisfy prerequisites and prevent duplicate enrollment when APAS provides a mapped UMN course, a positive awarded credit amount, and an explicit transfer source. A blank letter-grade field does not invalidate that already-awarded transfer credit. Zero-credit rows or blank-grade rows without an explicit source remain non-passing.

This keeps AP/IB handling program-agnostic across Twin Cities majors and avoids predicting credit that UMN has not actually posted. Smart UMN does not infer future AP awards from an exam name or score alone; APAS remains the authority for whether and how the credit applies.

## Explore personalization

Explore loads the complete current Twin Cities Schedule Builder subject directory. For a selected subject, it preserves the official course result set and only changes ordering:

1. strict APAS matches;
2. candidate/review routes;
3. unrelated or currently unproven courses.

Nothing is hidden merely because the parser cannot prove a fit. This allows the same Explore UI to personalize itself for any imported Twin Cities APAS without creating a per-major frontend.

## Verification language

`Supports all Twin Cities majors` means the import/discovery architecture has no program-name or college allowlist and uses generic APAS/Schedule Builder semantics. Two official inventories are checked: CAPE Major Profiles currently contributes 146 major names, and Twin Cities Sample Plans contributes 161 program-degree identities across 13 colleges/schools. All 146/146 major names and all 161/161 program-degree identities pass the same nineteen-shape synthetic APAS structural matrix with zero failures: seven strict course-authorizing forms, one candidate-only capped pool, nine typed non-authorizing policy families, one deliberately still-unclassified synthetic policy/accounting shape, and one deliberately unsupported fail-closed route. See `TWIN_CITIES_PROGRAM_COVERAGE.md`.

Those 146/146 and 161/161 results are **architecture/structural verification**, not a claim that a real APAS from every major has been collected. Real audits are tracked separately through the strict anonymous compatibility corpus described in `REAL_APAS_VALIDATION.md` and summarized in `APAS_COMPATIBILITY_COVERAGE.md`. The current corpus has only one real structural fingerprint; missing cohorts stay explicitly missing. Therefore this project does **not** claim that every institutional policy in every program has been observed or reduced to an automated graduation-audit rule. Unsupported policy semantics remain visible and review-only.
