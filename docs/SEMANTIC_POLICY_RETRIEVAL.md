# Semantic Policy Retrieval

Smart UMN v0.9 adds a non-generative semantic retrieval layer for APAS policy language that the deterministic rule compiler cannot safely execute.

## Pipeline

```text
APAS review-only rule
  → metadata hard filter (campus / program / catalog year)
  → bounded lexical retrieval
  → lightweight MiniLM semantic rerank
  → typed internal policy-family classification
  + JEV-extracted official UMN policy evidence
  → Web review evidence
```

The retrieval layer has **no degree-decision authority**. It never mutates a `RequirementRule`, never turns a candidate route into a strict route, and never enters prerequisite evaluation, degree allocation, the schedule solver, or graduation feasibility calculations.

## JEV ingestion

`packages/community/upstream/snapshot.js` is the pinned JEV Ultra Fast DOM snapshot implementation already vendored by the project. Policy ingestion runs that exact snapshot logic over curated public UMN policy pages. `chrome-use` can be used when available; the deployable fallback is Playwright as the browser transport. The extractor remains JEV in either case.

`config/policy-sources.json` is the curated student-facing source manifest. `npm run policy:refresh` snapshots each source, hashes its visible text, and replaces the stable SQLite source key. Old versions therefore do not remain mixed into the live retrieval index.

Manual `npm run worker -- snapshot-policy ...` captures are stored under `policy-manual:*` and are deliberately excluded from the student retrieval index until the URL is reviewed and added to the curated manifest.

## Lightweight embeddings

The optional reranker uses `onnx-community/all-MiniLM-L6-v2-ONNX` with q4 ONNX weights on CPU:

- 384-dimensional embeddings
- about 53 MB cached in `var/models` on the current build
- query-time reranking is restricted to the lexical candidate set
- embeddings cannot change a document's authority or execution mode

Modes:

- `SMART_UMN_EMBEDDINGS=auto` — use the local model cache when available; otherwise fall back to bounded lexical retrieval.
- `SMART_UMN_EMBEDDINGS=download` — permit the model to download into `var/models` if absent.
- `SMART_UMN_EMBEDDINGS=off` — lexical retrieval only.

Run `npm run embeddings:warm` once to pre-download and verify the q4 model.

## Two physically separate retrieval channels

`POST /api/policy/search` returns two roles instead of mixing them:

- `classification` — searches only the internal typed rule-family registry such as `residency`, `credit-cap`, `gpa`, or `permission-standing`.
- `evidence` — searches only current JEV snapshots from curated official UMN policy sources.

Both channels are `classification-only` / `review-only`, and the response explicitly returns `decisionAuthority: "none"`.

## Privacy boundary

The policy endpoint accepts only one bounded rule text plus public planning metadata (`campus`, optional `college`, `program`, `catalogYear`). It does not accept raw APAS HTML, a complete normalized profile, course history, student identity, grades, credentials, cookies, Duo information, or SAML material.

## Failure behavior

If the embedding model is unavailable, retrieval falls back to lexical ranking. If no trustworthy evidence is found, the original deterministic `unknown` / review-only behavior remains unchanged. Smart UMN remains usable if the semantic layer is completely disabled.
