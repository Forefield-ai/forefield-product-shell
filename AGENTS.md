# AGENTS

## Repository Position

This repository is the customer-facing product shell for Forefield.

It exists to turn external `DecisionCoreBoundaryHandoff` inputs into user-facing Topic workspaces, evidence review flows, saved items, briefs, and Copilot-assisted product workflows.

This repository is not the decision-core pipeline host.

## Repository Owns

- account / workspace
- Topic
- Topic Draft
- Monitoring Run
- Signal Cluster
- Curated Evidence Record
- Evidence Drawer state
- Saved Items
- User Actions
- Baseline Brief
- Copilot product behavior
- product-facing UI / API / DB in later phases
- product-layer validation fixtures and smoke checks

## Repository Does Not Own

- decision-core pipeline
- source extraction
- EvidenceBundle assembly
- OpportunitySet generation
- OpportunityCard
- OpportunityScore
- ClaimTrace
- scoring logic
- raw_refs / raw_trace_refs
- decision-core validation logic
- decision-core fixtures except clearly marked external sample handoff fixtures

## External Boundary Rule

- `DecisionCoreBoundaryHandoff` is the only accepted decision-core input for now.
- Treat it as external, versioned input.
- Do not import or recreate decision-core internals.
- Do not use `OpportunitySet`, `OpportunityCard`, `OpportunityScore`, or `ClaimTrace` as product-shell domain models.
- Preserve provenance back to the handoff, but do not expose internal decision-core IDs as user-facing product IDs.

## Product Mainline

The intended product-layer mainline is:

`DecisionCoreBoundaryHandoff -> MonitoringRun -> Topic / TopicDraft -> SignalCluster -> CuratedEvidenceRecord -> EvidenceDrawerState -> SavedItem / UserAction / BaselineBrief -> Copilot-guided actions`

This is a product-layer mainline, not a decision-core pipeline.

## Scope Discipline

Before opening a new iteration, answer explicitly:

- which uncertainty this work reduces
- what product decision space changes after it passes
- whether it is product-shell construction, boundary integration, UI implementation, API/DB work, or Copilot behavior

If that answer is vague, do not treat it as a worthy iteration.

## Product Object Growth Rule

Do not add a new product object unless:

- it is needed for user workflow, persistence, or presentation
- it cannot be honestly represented by an existing product object
- it has a first consumer, fixture, validator, or UI/read-model use case
- it does not duplicate decision-core objects

Default preference order:

1. extend an existing product object additively
2. add a read model / view state
3. add a new product object only if required by workflow or persistence

Hard guardrails:

- no OpportunitySet / OpportunityCard / OpportunityScore product models
- no ClaimTrace product model
- no raw_refs / raw_trace_refs product fields
- no product object that directly mirrors decision-core internals
- no report-first object family before Topic / Evidence workflow is stable

## Runtime Boundary Rule

- Product-shell runtime should first consume static `DecisionCoreBoundaryHandoff` fixtures.
- Then add a local mapper.
- Then add API integration.
- Then add live decision-core handoff ingestion.
- Do not jump directly to live runtime integration.

## Copilot / LLM Governance Rule

- Copilot must be evidence-grounded and Topic-scoped.
- Copilot may read product-visible Topic, SignalCluster, CuratedEvidenceRecord, SavedItem, and Brief fields.
- Copilot must not read decision-core internals, raw_refs, raw_trace_refs, OpportunityScore, or ClaimTrace.
- External search context must be labeled as external context, not evidence.
- No freeform conclusion upgrade without evidence.

## Validation Rule

For docs-only changes:

- run the smallest relevant check
- verify repo ownership and boundary docs remain consistent

For fixture changes:

- verify JSON loads
- verify fixture is clearly external if it comes from decision-core
- do not treat external fixtures as product contracts

For future code / contract / mapper changes:

- run syntax checks
- run product-shell tests once test tooling exists
- verify `DecisionCoreBoundaryHandoff` fixture intake still works
- verify no decision-core internals were copied

## Strict Review Before Closeout

After implementation, do not close immediately.

Review from both perspectives:

engineering:

- contract integrity
- validation alignment
- unintended coupling to decision-core
- rollback risk

product:

- whether the result is easier to trust
- whether the result is easier to interpret
- whether the change introduces misuse or misunderstanding risk
- whether the user workflow remains clear

If the same-iteration review finds an in-scope issue, fix it before closeout when safe.

## Iteration Style

Prefer one bounded acceptance loop over fragmented thin steps.

Good examples:

- fixture + first mapper contract
- product object contract + first read model
- Evidence Drawer state + rendering fixture
- Copilot action + scope guard

Bad examples:

- adding product objects with no consumer
- copying decision-core objects into product-shell
- starting UI before product object contracts exist
- adding structure that does not change trust, interpretation, or workflow clarity
- continuing the same narrow thread just because more polish is possible

## Recommended Reading Order

For a new engineer or agent:

1. `README.md`
2. `docs/architecture/repo-boundary.md`
3. `docs/architecture/product-object-map.md`
4. `fixtures/external/decision-core/decision-core-boundary-handoff.sample.json`
