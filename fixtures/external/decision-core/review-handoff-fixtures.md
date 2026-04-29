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

- `45bcadf3f197665a78c09c6ba17639540a1bff40`

Source path:

- `fixtures/forefield-boundary/generated/`

Copied product-shell path:

- `fixtures/external/decision-core/generated/`

These samples are assembler-generated artifacts, not hand-authored golden fixtures. They are copied
by commit so product-shell can verify mapper compatibility with real decision-core assembler output
without importing decision-core source code.

## Cached-Source-Pipeline-Generated Samples

Source repo:

- `forefield-decision-core`

Source commit:

- `8d779f4d605863688652c5e3d4ec9aef18626c87`

Source path:

- `fixtures/forefield-boundary/generated/cached-source/`

Copied product-shell path:

- `fixtures/external/decision-core/generated/cached-source/`

These samples are generated through `buildReviewHandoffFromCachedSourceArtifacts(...)`, not
hand-authored and not assembler-only generated artifacts. They are copied by commit so
product-shell can verify mapper compatibility with the local cached-source pipeline output while
preserving repository independence.

The samples are bounded external handoff inputs. They are not product-shell contracts and they
must not be used to import decision-core source code or validation internals.
