# forefield-product-shell

`forefield-product-shell` is the Forefield customer-facing product shell.

Its purpose is to consume external `DecisionCoreBoundaryHandoff` and `DecisionCoreReviewHandoff` inputs and turn them into product-facing Topic workspaces, evidence review flows, saved items, briefs, and Copilot-assisted workflows over time.

## Repository Position

This repository is intentionally separate from `forefield-decision-core`.

- `forefield-product-shell` owns the customer-facing product layer.
- `forefield-decision-core` owns the analytical decision pipeline and the bounded handoff that this repository consumes.

## What This Repository Owns

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
- future UI / API / DB

## What This Repository Does Not Own

- decision-core pipeline
- EvidenceBundle
- OpportunitySet
- OpportunityCard
- OpportunityScore
- ClaimTrace
- scoring logic
- decision-core validation logic
- decision-core fixtures and tests, except for clearly marked external sample handoff fixtures stored here for product-shell intake planning

## External Dependency

This repository depends on external, versioned, bounded handoff artifacts from `forefield-decision-core`, including `DecisionCoreBoundaryHandoff` v0.1 and `DecisionCoreReviewHandoff` v0.2.

Product-shell must consume those handoffs without copying decision-core pipeline code or recreating decision-core internal models as product-shell domain objects.

## Current Phase

Product Shell P11D review handoff mapper implementation.

P11D is limited to:

- a dedicated `DecisionCoreReviewHandoff` v0.2 mapper
- copied external review handoff samples for ready / sparse / no_evidence / empty / blocked states
- minimal read-model compatibility for explicit review states
- mapper and read-model tests

## Non-Goals For P11D

- no UI changes
- no API implementation
- no DB implementation
- no persistence
- no live ingestion
- no LLM integration
- no copied decision-core source logic
- no recreation of `OpportunitySet`, `OpportunityCard`, `OpportunityScore`, or `ClaimTrace`

## Future Roadmap

- P0: repo boundary and sample input
- P1: product-layer object contracts
- P2: handoff-to-product mapper and local read-model builder
- P3: mock Topic Workspace state
- P4: UI/API/DB after contracts stabilize
- P11D: review handoff mapper and explicit review-state compatibility
