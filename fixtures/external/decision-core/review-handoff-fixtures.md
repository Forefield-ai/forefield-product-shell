# Decision-Core Review Handoff Samples

These external samples were copied from `forefield-decision-core` for product-shell mapper tests.

## Hand-Authored Semantic Samples

Source repo:

- `forefield-decision-core`

Source commit:

- `78666dd30082116cde4ff3f86497ec8a064ff5dd`

Source path:

- `fixtures/forefield-boundary/review-handoff-*.json`

These samples are hand-authored golden fixtures that exercise the `DecisionCoreReviewHandoff`
v0.2 state semantics.

## Assembler-Generated Samples

Source repo:

- `forefield-decision-core`

Source commit:

- `b7799d596353ea11ff1ee078f25b36733e8c1d75`

Source path:

- `fixtures/forefield-boundary/generated/`

Copied product-shell path:

- `fixtures/external/decision-core/generated/`

These samples are assembler-generated artifacts, not hand-authored golden fixtures. They are copied
by commit so product-shell can verify mapper compatibility with real decision-core assembler output
without importing decision-core source code.

P13C-C refreshed these copied artifacts from the P13C-B hardened decision-core output. The refresh
keeps legacy opportunity / score / rank / LLM patch metadata out of product-shell samples and
captures the `quote_excerpt` hardening where ready/sparse evidence now prefers safe source-like text
over derived outcome templates.

## Cached-Source-Pipeline-Generated Samples

Source repo:

- `forefield-decision-core`

Source commit:

- `b7799d596353ea11ff1ee078f25b36733e8c1d75`

Source path:

- `fixtures/forefield-boundary/generated/cached-source/`

Copied product-shell path:

- `fixtures/external/decision-core/generated/cached-source/`

These samples are generated through `buildReviewHandoffFromCachedSourceArtifacts(...)`, not
hand-authored and not assembler-only generated artifacts. They are copied by commit so
product-shell can verify mapper compatibility with the local cached-source pipeline output while
preserving repository independence.

P13C-C refreshed these copied cached-source artifacts from the P13C-B hardened decision-core output.
The main compatibility change is that ready/sparse `quote_excerpt` values now retain safe
source-like evidence text. The copied files remain static external test samples and do not create a
runtime dependency on decision-core.

The samples are bounded external handoff inputs. They are not product-shell contracts and they
must not be used to import decision-core source code or validation internals.
