# Product Object Map

This document describes future mapping direction only.

It does not define runtime code or product contract code.

## Input

`DecisionCoreBoundaryHandoff`

## Future Product-Layer Objects

- `MonitoringRun`
- `Topic`
- `TopicDraft`
- `SignalCluster`
- `CuratedEvidenceRecord`
- `EvidenceDrawerState`
- `SavedItem`
- `UserAction`
- `BaselineBrief`
- `CopilotAction`

## Suggested Mapping

- one `DecisionCoreBoundaryHandoff` import -> one `MonitoringRun`
- one `MonitoringRun` -> one existing `Topic` update or one `TopicDraft` creation
- each `ranked_entry` -> candidate `SignalCluster`
- `provenance.public_source_refs` -> `CuratedEvidenceRecord` source refs
- `limitations` -> signal availability / caveats
- `confidence_summary` -> evidence confidence display
- `decision_summary.problem / why_it_matters` -> cluster summary seed

## Interpretation Notes

- `MonitoringRun` should capture import provenance, handoff version, source bundle identity, and intake status
- `Topic` should be the durable product aggregate for user workflow, not a renamed analytical object
- `TopicDraft` should hold pre-acceptance or pre-merge workspace state when a run should not immediately rewrite an existing Topic
- `SignalCluster` should group related product-visible signals derived from the handoff without mirroring decision-core internals
- `CuratedEvidenceRecord` should hold product-visible evidence plus bounded provenance pointers back to the handoff
- `EvidenceDrawerState` should be a read model for review and interpretation, not a source-of-truth analytical trace
- `SavedItem`, `UserAction`, `BaselineBrief`, and `CopilotAction` should be downstream product behaviors built on product-layer state

## Explicit Warnings

- `decision_band` is not Review Priority
- `opportunity_score` must not enter product shell
- `raw_refs` and `raw_trace_refs` must not enter product shell
- `SignalCluster` is not `OpportunityCard` renamed
- `BaselineBrief` is downstream artifact, not source of truth
