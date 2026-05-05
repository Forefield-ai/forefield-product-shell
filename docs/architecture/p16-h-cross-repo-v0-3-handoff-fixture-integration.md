# P16-H Cross-Repo v0.3 Handoff Fixture Integration

## Executive decision

P16-H adds a sanitized product-shell fixture path for a decision-core-style ReviewHandoff v0.3 shadow payload. The integration is additive: product-shell can map this v0.3-shaped fixture into its existing workspace, grouped Evidence Drawer, and Baseline Brief read-models without making v0.3 the default runtime contract.

This is fixture-based functional integration only. It is not source-live validation, not visual design, and not a runtime v0.3 cutover.

## Why P16-H follows P16-G

P16-G accepted the local MVP 0.1 functional demo after the grouped sample, Evidence Drawer, fallback drawer, and Baseline Brief flow were manually re-reviewed. The remaining gap was provenance: the UI had proven a product-local grouped evidence sample, but not a payload shaped like decision-core ReviewHandoff v0.3 shadow output.

P16-H closes that fixture compatibility gap while leaving the runtime default behavior unchanged.

## What this validates

- A sanitized decision-core v0.3-style handoff fixture can live in product-shell as an external sample.
- The fixture can be mapped into product-shell's workspace-compatible payload shape.
- `buildTopicWorkspaceViewState` renders grouped evidence sections from the mapped payload.
- `buildEvidenceDrawerState` exposes Direct Support, Counter Evidence, and Discovery Leads separately.
- `buildBaselineBriefViewState` generates copyable markdown from the mapped payload.
- Direct evidence counting remains strict.
- v0.2 local workspace fallback still builds.

## What this does not validate

- Runtime default ReviewHandoff v0.3 emission.
- Generated fixture refresh from decision-core.
- Source-live fetching or provider compliance.
- Auth, API, persistence, or multi-user flows.
- Final Evidence Drawer visual design.
- PDF/share export or rich report editing.

## Decision-core v0.3 shadow handoff provenance

The fixture follows the shape introduced by decision-core's v0.3 shadow emission harness:

`ClusterEvidenceBundleAssemblerOutput -> ReviewHandoff v0.3 shadow output`

The product-shell sample is sanitized and intentionally not placed under the generated fixture tree. It represents the v0.3 contract surface without claiming to be a generated artifact.

## Product-shell mapping path

The integration path is:

`ReviewHandoff v0.3 fixture -> mapDecisionCoreReviewHandoffV03ToProductMainline -> product mainline payload -> buildTopicWorkspaceViewState -> Evidence Drawer state -> Baseline Brief state`

The mapper is version-specific and does not alter the existing v0.2 mapper. It maps v0.3 grouped evidence sections into the same grouped evidence shape already consumed by the product read-models.

## v0.2 fallback behavior

v0.2 remains the default product contract. Existing v0.2 local workspace fixtures continue to build through the existing product-shell path. The v0.3 mapper is only used when explicitly invoked by tests or a fixture integration path.

## Grouped evidence semantics

The v0.3-style fixture includes:

- Direct Support
- Weak Support
- Trend Context
- Competitive Context
- Professional Context
- Counter Evidence
- Discovery Leads

Direct Support is the only section allowed to count as direct evidence. Discovery Leads are follow-up leads, not evidence yet. Trend, competitive, professional, and weak support sections remain contextual or directional. Counter Evidence is preserved separately and does not count as direct support.

## Raw/private/source safety

The fixture and mapped product state exclude raw source text, source URLs, target URLs, author/profile identifiers, private identifiers, raw provider responses, prompts, API keys, and chain-of-thought. Safe internal references may be retained as sanitized provenance, but they are not rendered as public source links.

## Known limitations

- The cross-repo v0.3 fixture is a sanitized sample, not a generated artifact.
- Source-live validation remains deferred.
- Runtime default v0.3 emission remains deferred.
- Product-shell v0.3 grouped evidence consumption remains partial and fixture-scoped.
- Auth, API, and persistence are not implemented.
- Final visual design and Figma work are not started.

## Technical debt register

- `cross_repo_v03_fixture_is_sanitized_sample_not_generated_artifact`: reason: avoids broad generated artifact refresh; impact/risk: fixture may drift from future generated output; status: open; revisit trigger: decision-core fixture export workflow is approved.
- `runtime_review_handoff_v03_default_emission_not_implemented`: reason: v0.3 is shadow/additive only; impact/risk: product-shell cannot rely on runtime v0.3 by default; status: open; revisit trigger: runtime dual-contract guard is implemented.
- `generated_fixture_refresh_for_v03_not_completed`: reason: fixture refresh is intentionally deferred; impact/risk: manual sample maintenance; status: open; revisit trigger: generated v0.3 fixture policy is defined.
- `source_live_validation_deferred`: reason: P16 is product/runtime integration, not provider work; impact/risk: real-source behavior remains unvalidated; status: open; revisit trigger: compliance-approved provider path exists.
- `product_shell_v03_grouped_evidence_consumption_partial`: reason: fixture path exists but runtime default consumption is not enabled; impact/risk: v0.3 product behavior is not complete; status: open; revisit trigger: runtime v0.3 sidecar/default plan advances.
- `final_figma_design_not_started`: reason: P16-H is functional only; impact/risk: UI remains visually rough; status: open; revisit trigger: functional MVP flow is accepted for design pass.
- `mvp_auth_api_persistence_not_implemented`: reason: MVP 0.1 local demo is fixture/local only; impact/risk: no multi-user or persistent workspace; status: open; revisit trigger: product demo requires durable state.

## Recommended next phase

P16-I should decide whether to add a small product-shell dev-only toggle for the v0.3 handoff fixture path, or move to runtime dual-contract planning for a v0.3 sidecar handoff while keeping v0.2 default.
