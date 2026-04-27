# Handoff To Product Mapping

This document defines the P1 mapping direction from `DecisionCoreBoundaryHandoff` into
product-layer objects.

It does not implement runtime code.

## Input

`DecisionCoreBoundaryHandoff`

## Import Result

The first product import result is `MonitoringRun`.

That object captures:

- `handoff_version`
- source bundle identity
- source bundle status
- import timestamp
- import status

## Default P1/P2 Direction

The default direction is:

`DecisionCoreBoundaryHandoff -> MonitoringRun -> TopicDraft`

This means:

- a new handoff first creates `MonitoringRun`
- then the product shell creates `TopicDraft`
- `Topic` is created or updated after user confirmation in P2

## Product Mainline

The minimal product mainline is:

`DecisionCoreBoundaryHandoff -> MonitoringRun -> TopicDraft / Topic -> SignalCluster -> CuratedEvidenceRecord -> EvidenceDrawerState`

This is a product-shell mainline, not a renamed decision-core pipeline.

## Ranked Entry Mapping

Each `ranked_entry` becomes a candidate `SignalCluster`.

Suggested mapping:

- `ranked_entry.rank` -> bounded `source_ranked_entry_ref`
- `decision_summary.problem` -> cluster headline seed
- `decision_summary.why_it_matters` -> cluster summary seed
- `confidence_summary` -> confidence display
- `limitations` -> signal availability / caveats

## Evidence Mapping

`provenance.public_source_refs` become `CuratedEvidenceRecord` source refs.

Suggested mapping:

- one public source ref may become one product evidence record
- product evidence records should preserve public URLs and product-readable summaries
- internal source artifacts must not cross into product fixtures or product contracts

## Draft And Aggregate Direction

`TopicDraft` is the initial product object.

Why:

- it keeps new handoffs reviewable before mutating a confirmed Topic
- it avoids implying that every handoff should directly overwrite a stable Topic
- it creates a clean place to attach first-pass `SignalCluster` and `CuratedEvidenceRecord` objects

`Topic` is the target aggregate after user confirmation or future merge/update logic in P2.

## Evidence Drawer Direction

`EvidenceDrawerState` is computed from:

- one parent `TopicDraft` or `Topic`
- one `SignalCluster`
- one or more `CuratedEvidenceRecord` items

It should present:

- display summary
- evidence items
- public source links
- confidence display
- limitations or caveats

It should not expose analytical trace internals.

## Boundary Warnings

- `decision_band` is not Review Priority
- `opportunity_score` must not enter product shell
- `raw_refs` and `raw_trace_refs` must not enter product shell
- `SignalCluster` is not `OpportunityCard` renamed
- `BaselineBrief` is downstream artifact, not source of truth

## Explicit Non-Mappings

The following are not valid product-layer objects or fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `claim_candidate_id`

Product-shell may preserve bounded provenance back to the handoff, but it must not recreate
decision-core analytical object families as product contracts.
