# Repository Boundary

## Purpose

This document defines the boundary between `forefield-product-shell` and `forefield-decision-core`.

The goal is to keep product workflow construction separate from analytical decision-core logic while allowing product-shell to consume a bounded external handoff.

## Ownership Split

`forefield-product-shell` owns product workflows and product objects, including Topic workspaces, evidence review flows, saved items, briefs, Copilot behavior, and later UI / API / DB concerns.

`forefield-decision-core` owns the analytical decision pipeline, analytical object families, scoring logic, and the bounded handoff consumed by product-shell.

## Boundary Object

`DecisionCoreBoundaryHandoff` is the boundary between the two repositories.

Product-shell should treat it as an external, versioned input rather than as an internal product contract.

## What May Cross The Boundary

The following kinds of fields may cross the boundary as handoff payload content:

- `handoff_version`
- `bundle_id`
- `bundle_status`
- `ranked_entries`
- `decision_summary`
- `evidence_summary`
- `confidence_summary`
- `public_source_refs`
- `limitations`

These fields may be mapped into product-owned objects later, but they do not become permission to import decision-core internals as product models.

## What Must Not Cross As Product-Owned Model

The following must not be introduced as product-owned model families inside product-shell:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- scoring inputs

Product-shell may preserve bounded provenance back to the handoff, but must not re-host analytical object families here.

## Product ID Rule

Product-shell should not use decision-core IDs as user-facing product IDs.

Reasons:

- decision-core IDs represent analytical lineage, not user-facing product identity
- product objects may need different lifecycle and persistence semantics
- exposing internal analytical IDs increases coupling and makes future boundary evolution harder
- user-facing Topic and workspace state should remain stable even if decision-core internals evolve

## Future Integration Direction

The intended direction is:

1. consume static `DecisionCoreBoundaryHandoff` fixtures
2. define product-layer contracts in this repository
3. implement a local handoff-to-product mapper
4. introduce API integration after the contracts and mapper stabilize
5. add live decision-core ingestion only after the earlier boundary is proven
