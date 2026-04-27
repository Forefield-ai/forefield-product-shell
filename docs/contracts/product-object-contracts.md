# Product Object Contracts

This document defines the P1 product-layer object contract plan for `forefield-product-shell`.

It is documentation only.
It does not add runtime code, mapper code, UI, API, or DB schema.

## Scope

P1 defines the minimum product-layer contract surface needed to consume `DecisionCoreBoundaryHandoff`
and prepare for a future Topic Workspace.

P1 object scope:

- `MonitoringRun`
- `TopicDraft`
- `Topic`
- `SignalCluster`
- `CuratedEvidenceRecord`
- `EvidenceDrawerState`

## Shared Contract Rules

- Every product object uses a product-owned `id`.
- Decision-core identifiers may be retained only as bounded source metadata or provenance.
- `DecisionCoreBoundaryHandoff` remains an external input, not a product contract.
- `TopicDraft` is the default first landing object for a new handoff.
- `Topic` is the future confirmed aggregate created or updated after user confirmation in P2.
- `EvidenceDrawerState` is a computed read model, not a source-of-truth analytical object.

## Global Prohibited Decision-Core Fields

The following must not appear as product-layer fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `opportunity_score`
- `claim_candidate_id`

`decision_band` may exist only as opaque source metadata if absolutely necessary.
It must not become product `review_priority`, queue priority, or a user-facing workflow label.

## MonitoringRun

Purpose:

- Record one product-shell import of one `DecisionCoreBoundaryHandoff`.
- Anchor handoff versioning, bundle provenance, and intake status.

Kind:

- persisted imported record

Required fields:

- `id`
- `handoff_version`
- `source_bundle_id`
- `source_bundle_status`
- `ingest_status`
- `imported_at`

Optional fields:

- `workspace_id`
- `source_handoff_locator`
- `ranked_entry_count`
- `notes`

Lifecycle state:

- `received`
- `imported`
- `blocked`
- `superseded`

Relation to `DecisionCoreBoundaryHandoff`:

- one handoff import creates one `MonitoringRun`
- `handoff_version`, `bundle_id`, `bundle_status`, and ranked entry count map here first

Provenance rules:

- preserve `handoff_version`
- preserve `bundle_id` as `source_bundle_id`
- preserve only bundle-level import metadata and handoff locator data
- do not retain internal decision-core ids as product-facing ids

Prohibited decision-core fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `opportunity_score`
- `claim_candidate_id`

## TopicDraft

Purpose:

- Hold the first product-side workspace candidate created from a new handoff before user confirmation.
- Provide a stable place to gather clusters and curated evidence without prematurely mutating a confirmed `Topic`.

Kind:

- persisted draft state

Required fields:

- `id`
- `monitoring_run_id`
- `lifecycle_state`
- `title`
- `summary`

Optional fields:

- `workspace_id`
- `limitations_summary`
- `seed_signal_cluster_ids`
- `proposed_topic_slug`
- `provenance`

Lifecycle state:

- `draft`
- `accepted`
- `rejected`
- `superseded`

Relation to `DecisionCoreBoundaryHandoff`:

- default P1/P2 direction is `DecisionCoreBoundaryHandoff -> MonitoringRun -> TopicDraft`
- one `MonitoringRun` may seed one draft for user review

Provenance rules:

- retain only product-side links back through `monitoring_run_id`
- any handoff-derived summary should be copied as product text, not decision-core identity
- do not surface bundle ids or ranked entry ranks as draft ids

Prohibited decision-core fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `opportunity_score`
- `claim_candidate_id`

## Topic

Purpose:

- Represent the durable product aggregate for a confirmed or updated Topic Workspace.
- Own the user-facing product identity that persists beyond any one handoff import.

Kind:

- persisted aggregate

Required fields:

- `id`
- `lifecycle_state`
- `title`
- `summary`
- `active_monitoring_run_id`

Optional fields:

- `workspace_id`
- `source_topic_draft_id`
- `latest_limitations_summary`

Lifecycle state:

- `active`
- `paused`
- `archived`

Relation to `DecisionCoreBoundaryHandoff`:

- `Topic` is not required in the first P1 fixture
- `Topic` is the target aggregate created or updated after user confirmation in P2
- it should not be created directly from decision-core without a product-side confirmation path

Provenance rules:

- preserve lineage via `active_monitoring_run_id` and optional `source_topic_draft_id`
- do not use bundle ids, claim ids, or opportunity ids as Topic ids

Prohibited decision-core fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `opportunity_score`
- `claim_candidate_id`

## SignalCluster

Purpose:

- Represent one product-visible signal grouping derived from one ranked handoff entry.
- Provide the core unit for future evidence review and Topic interpretation.

Kind:

- persisted product record

Required fields:

- `id`
- `parent_topic_ref`
- `monitoring_run_id`
- `source_ranked_entry_ref`
- `headline`
- `summary`

Optional fields:

- `confidence_display`
- `limitations`
- `curated_evidence_ids`
- `provenance`

Lifecycle state:

- `draft`
- `active`
- `archived`

Relation to `DecisionCoreBoundaryHandoff`:

- each `ranked_entry` becomes a candidate `SignalCluster`
- `decision_summary.problem` and `decision_summary.why_it_matters` seed cluster text
- `confidence_summary` and `limitations` may seed cluster display fields

Provenance rules:

- `source_ranked_entry_ref` should remain bounded, such as `rank`
- preserve links through `monitoring_run_id`
- do not copy `claim_candidate_id`, `claim_id`, or `opportunity_id`
- do not reinterpret `decision_band` as review priority

Prohibited decision-core fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `opportunity_score`
- `claim_candidate_id`

## CuratedEvidenceRecord

Purpose:

- Represent a product-visible, curated evidence record attached to one `SignalCluster`.
- Preserve only public source references and product-readable summaries.

Kind:

- persisted product record

Required fields:

- `id`
- `signal_cluster_id`
- `monitoring_run_id`
- `summary`
- `public_source_refs`

Optional fields:

- `confidence_display`
- `limitations`
- `source_ranked_entry_ref`
- `quote_excerpt`
- `provenance`

Lifecycle state:

- not required in P1 beyond normal record persistence

Relation to `DecisionCoreBoundaryHandoff`:

- `provenance.public_source_refs` map into `public_source_refs`
- evidence and confidence summaries may be restated in product-readable form

Provenance rules:

- only public `http://` or `https://` source refs may be retained
- keep lineage through `signal_cluster_id`, `monitoring_run_id`, and optional source rank reference
- do not store internal artifact refs or raw trace refs

Prohibited decision-core fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `opportunity_score`
- `claim_candidate_id`

## EvidenceDrawerState

Purpose:

- Represent computed read-model state for one `SignalCluster` inside a future Evidence Drawer.
- Assemble evidence items, display summary, source links, and confidence or caveat display.

Kind:

- computed read model

Required fields:

- `topic_ref`
- `signal_cluster_ref`
- `display_summary`
- `evidence_items`

Optional fields:

- `confidence_display`
- `limitations`
- `source_links`

Lifecycle state:

- not applicable; computed on demand from product records

Relation to `DecisionCoreBoundaryHandoff`:

- not imported directly from handoff
- computed from `SignalCluster` and `CuratedEvidenceRecord` data that originally came from the handoff

Provenance rules:

- use product refs and public source links only
- never expose analytical trace objects or raw evidence internals in the drawer state

Prohibited decision-core fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `opportunity_score`
- `claim_candidate_id`
