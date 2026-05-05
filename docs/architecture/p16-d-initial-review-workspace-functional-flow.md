# P16-D Initial Review Workspace Functional Flow

## Executive decision

P16-D validates the Initial Review Workspace functional flow for grouped evidence. This is not a final visual design phase.

The workspace can now exercise a local grouped evidence scenario end to end through local runtime payloads, product read-models, cluster preview state, drawer state, and browser build. v0.2 fallback remains intact.

## What P16-C already added

P16-C added:

- grouped evidence product fixture support
- `buildGroupedEvidenceViewState`
- browser mirror for grouped evidence read-models
- grouped evidence support in `buildEvidenceDrawerState`
- grouped evidence support in `buildTopicWorkspaceViewState`
- Evidence Drawer grouped section rendering
- SignalClusterCard grouped evidence preview fields
- v0.2 fallback preservation

## What P16-D validates

P16-D hardens the functional workspace path:

- local workspace payload can carry grouped evidence
- TopicWorkspace view state exposes grouped evidence for grouped clusters
- non-grouped clusters retain flat v0.2 evidence fallback behavior
- Evidence Drawer state includes grouped sections for selected grouped clusters
- Evidence Drawer state falls back to flat evidence when grouped evidence is absent
- interaction state can open grouped and fallback drawer targets
- SignalClusterCard preview fields expose direct, counter, discovery, and total grouped counts
- browser build still passes

## v0.2 fallback behavior

v0.2 remains supported and unchanged. Existing flat `curated_evidence_records` still power fallback drawer behavior when grouped evidence is absent.

The grouped fixture includes one grouped cluster and one fallback cluster so both paths are exercised in the same local workspace scenario.

## Grouped evidence workspace flow

The functional flow is:

`local product fixture`
-> `buildLocalTopicWorkspaceData`
-> `buildProductMainlineCompatibilityPayload`
-> `buildTopicWorkspaceViewState`
-> `SignalClusterCard grouped_evidence_preview`
-> `EvidenceDrawer grouped_evidence_sections`

No decision-core code is imported into product-shell. No API, database, auth, live provider, or live source fetch path is involved.

## Evidence Drawer behavior

For grouped clusters, the drawer shows:

- Direct Support
- Counter Evidence
- Weak Support
- Trend Context
- Competitive Context
- Professional Context
- Discovery Leads

Direct Support and Counter Evidence are functionally separated. Discovery Leads are labeled as follow-up leads, not evidence yet.

For fallback clusters, the drawer keeps the existing flat evidence behavior.

## SignalClusterCard preview behavior

When grouped evidence exists, the cluster section includes a preview with:

- direct evidence count
- counter evidence count
- discovery lead count
- total grouped evidence count

When grouped evidence is absent, no grouped preview is added.

## Raw/private field safety

Workspace and drawer state tests cover the grouped scenario for absence of raw/private/provider keys and source URL values. The fixture uses sanitized summaries only and avoids raw source text, source URLs, author/profile IDs, private IDs, provider payloads, prompts, API keys, and chain-of-thought.

Direct evidence count remains strict:

- Direct Support can count.
- Trend Context does not count.
- Competitive Context does not count.
- Professional Context does not count.
- Weak Support does not count.
- Discovery Leads do not count.
- Counter Evidence is preserved but does not count as direct support.

## Deferred work

- final visual design
- Figma implementation
- full Evidence Drawer polish
- runtime default v0.3 consumption
- generated fixture refresh
- API integration
- persistence
- auth
- source-live validation

## Technical debts

`final_figma_design_not_started`

- Reason: this phase intentionally avoids Figma and visual design.
- Impact/risk: grouped drawer UI is functional, not final.
- Status: open.
- Revisit trigger: final grouped Evidence Drawer design phase.

`product_shell_grouped_evidence_drawer_visual_design_not_done`

- Reason: drawer sections are minimally rendered for functional clarity.
- Impact/risk: final hierarchy, density, and interaction polish remain pending.
- Status: open.
- Revisit trigger: product-shell visual design phase.

`product_shell_v03_grouped_evidence_consumption_partial`

- Reason: grouped evidence is local fixture/read-model backed, not runtime default.
- Impact/risk: production v0.3 handoff consumption remains incomplete.
- Status: open.
- Revisit trigger: runtime v0.3 consumption implementation.

`runtime_review_handoff_v03_default_emission_not_implemented`

- Reason: decision-core still treats v0.3 as shadow/additive.
- Impact/risk: product-shell cannot assume v0.3 by default.
- Status: open.
- Revisit trigger: runtime default contract decision.

`generated_fixture_refresh_for_v03_not_completed`

- Reason: this phase uses sanitized product fixtures and does not refresh generated artifacts.
- Impact/risk: generated fixture parity remains pending.
- Status: open.
- Revisit trigger: explicit generated fixture refresh phase.

`product_shell_v02_v03_fallback_guard_needs_more_runtime_coverage`

- Reason: tests cover local fixture and read-model flow, not a true dual-contract runtime stream.
- Impact/risk: future runtime sidecar/default integration still needs broader guards.
- Status: open.
- Revisit trigger: runtime dual-contract integration phase.

`source_live_validation_deferred`

- Reason: no live source fetch or provider call is run in product-shell.
- Impact/risk: real-source behavior remains outside MVP functional intake.
- Status: open.
- Revisit trigger: compliance-approved source-live validation.

