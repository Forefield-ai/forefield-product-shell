# P16-C Grouped Evidence Functional Intake

## Executive decision

P16-C adds product-shell functional intake for grouped evidence without making ReviewHandoff v0.3 the default product contract. The existing v0.2 product-shell flow remains intact.

This phase is functional intake, not final UI design. The implementation is intentionally plain: it adds a read-model, a sanitized local fixture, and a small Evidence Drawer scaffold for grouped sections.

## Contract posture

v0.2 remains the default product contract. v0.3 grouped evidence is additive and optional.

Product-shell can now carry grouped evidence in local product payloads when present, but the v0.2 mapper still preserves existing behavior and v0.3 runtime default consumption remains deferred.

## Read-model shape

`buildGroupedEvidenceViewState` accepts a signal cluster and its curated evidence records. It returns:

- `groupedEvidenceSections`
- `directEvidenceCount`
- `totalGroupedEvidenceCount`
- `hasGroupedEvidence`
- `fallbackMode`
- `evidenceCaveats`

Grouped sections are normalized into stable product-facing sections:

- Direct Support
- Counter Evidence
- Weak Support
- Trend Context
- Competitive Context
- Professional Context
- Discovery Leads

When grouped evidence is absent, the read-model can fall back to existing v0.2 flat curated evidence as direct-support-like display material. Existing drawer and workspace fixture output remains unchanged unless grouped evidence exists.

## Evidence Drawer behavior

When grouped evidence exists, the Evidence Drawer renders grouped sections instead of the old flat source list. Direct Support and Counter Evidence are expanded by default. Discovery Leads are explicitly labeled as follow-up leads, not evidence yet.

When grouped evidence is absent, the drawer keeps the current v0.2 flat evidence behavior.

## Cluster card behavior

Cluster cards remain visually and structurally unchanged except for a small functional grouped evidence preview when grouped evidence exists:

- direct evidence count
- counter evidence count
- discovery lead count
- total grouped evidence count

No final visual treatment is attempted in this phase.

## Safety rules

The grouped evidence fixture and read-model reject or omit raw/private/source-provider fields such as raw text, raw snippets, source URLs, target URLs, author/profile identifiers, private identifiers, provider responses, prompts, API keys, and chain-of-thought.

Direct evidence count stays strict:

- Direct Support may count as direct evidence.
- Weak Support does not count as direct evidence.
- Trend Context does not count as direct evidence.
- Competitive Context does not count as direct evidence.
- Professional Context does not count as direct evidence.
- Discovery Leads do not count as direct evidence.
- Counter Evidence is preserved and does not count as direct support.

## What this phase does not do

P16-C does not:

- make v0.3 the runtime default
- import decision-core runtime code
- refresh generated fixtures
- implement final visual design
- use Figma
- add API, DB, or auth
- run live providers or source fetch
- implement persistence for grouped evidence

## Future visual design

The grouped drawer needs a later design pass. That phase can refine section hierarchy, item density, saving behavior, and empty-section handling with a proper design artifact. P16-C only proves the functional path.

## Deferred work

- final visual design
- Figma-based UI implementation
- full Evidence Drawer polish
- runtime default v0.3 consumption
- generated fixture refresh
- API integration
- persistence
- source-live validation

## Technical debts

`product_shell_v03_grouped_evidence_consumption_partial`

- Reason: grouped evidence is fixture/local-payload only.
- Impact/risk: runtime v0.3 handoff is not yet product-shell default.
- Status: open.
- Revisit trigger: runtime v0.3 sidecar/default planning.

`product_shell_grouped_evidence_drawer_visual_design_not_done`

- Reason: this phase intentionally avoids visual redesign.
- Impact/risk: grouped sections are functional but not final UI.
- Status: open.
- Revisit trigger: grouped Evidence Drawer design phase.

`product_shell_v02_v03_fallback_guard_needs_more_runtime_coverage`

- Reason: fallback is covered at read-model level, not through a runtime dual-contract path.
- Impact/risk: future runtime sidecar needs broader integration coverage.
- Status: open.
- Revisit trigger: runtime dual-contract test phase.

`runtime_review_handoff_v03_default_emission_not_implemented`

- Reason: v0.3 remains shadow/additive.
- Impact/risk: product-shell cannot rely on v0.3 by default.
- Status: open.
- Revisit trigger: after product-shell grouped evidence support is designed and validated.

`generated_fixture_refresh_for_v03_not_completed`

- Reason: P16-C uses a hand-authored sanitized product fixture.
- Impact/risk: generated fixture alignment remains pending.
- Status: open.
- Revisit trigger: explicit generated artifact refresh phase.

`final_figma_design_not_started`

- Reason: Figma and visual design are out of scope.
- Impact/risk: drawer UX needs future polish before productization.
- Status: open.
- Revisit trigger: final grouped Evidence Drawer design phase.

