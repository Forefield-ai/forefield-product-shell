# Runtime Object Contracts

This document defines candidate runtime object contracts for the future persisted MVP runtime of `forefield-product-shell`.

It is documentation only.
It does not add schema files, runtime code, API routes, UI code, or backend services.

## Classification Legend

- `MVP required`
- `optional / deferred`
- `backend / internal later`
- `should not exist yet`

## Shared Contract Rules

- Every persisted customer-facing object uses a product-owned `id`.
- Every persisted customer-facing object must be scoped by explicit ownership fields.
- Customer-facing runtime contracts must not expose decision-core internals.
- `SignalCluster` and `CuratedEvidenceRecord` are canonical customer-facing product objects.
- `InitialTopicMap` is a first review workspace snapshot, not a raw analytical trace.
- `UserAction` is event-like.
- `SavedItem` is a materialized product object for saved cluster and saved evidence behavior.
- `BaselineBrief` is deferred and must not become an upstream fact source.
- `Copilot` is deferred and must remain evidence-grounded later.

## Global Prohibited Fields

The following fields or object families must not appear in user-facing runtime contracts:

- `DecisionCoreBoundaryHandoff`
- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `opportunity_score`
- `claim_candidate_id`
- `internal_decision_core`
- `decision_band`
- `claim_id`
- `opportunity_id`

## User

Classification:

- `MVP required`

Purpose:

- represent the authenticated person who owns or created product state

Ownership fields:

- `id`

Minimal fields:

- `id`
- `primary_workspace_id`
- `email` or equivalent login identifier
- `display_name`
- `account_status`
- `created_at`

User-visible vs internal fields:

- user-visible:
  - `display_name`
  - basic account identity fields needed for product context
- internal:
  - auth-provider internals
  - session metadata
  - security or secret fields

References:

- `primary_workspace_id`

Prohibited fields:

- decision-core ids or scoring fields
- raw decision-core payloads

## Workspace

Classification:

- `MVP required`

Purpose:

- scope Topics, Monitoring Runs, SavedItems, and UserActions

Ownership fields:

- `id`
- `created_by_user_id`

Minimal fields:

- `id`
- `name`
- `created_by_user_id`
- `created_at`
- `workspace_status`

User-visible vs internal fields:

- user-visible:
  - `name`
- internal:
  - membership implementation details
  - role systems, if deferred

References:

- `created_by_user_id`

Prohibited fields:

- decision-core internals

## Topic

Classification:

- `MVP required`

Purpose:

- represent the durable customer-facing Topic aggregate

Ownership fields:

- `id`
- `workspace_id`
- `created_by_user_id`

Minimal fields:

- `id`
- `workspace_id`
- `created_by_user_id`
- `title`
- `summary`
- `target_audience`
- `problem_space`
- `monitoring_intent`
- `signal_focus`
- `competitors_alternatives`
- `status`
- `active_run_id` optional at creation time
- `created_at`
- `updated_at`

User-visible vs internal fields:

- user-visible:
  - Topic definition fields
  - current status
- internal:
  - backend processing metadata
  - operational scheduling metadata

References:

- `workspace_id`
- `created_by_user_id`
- `active_run_id`

Prohibited fields:

- decision-core opportunity objects
- raw trace fields
- direct decision-core scoring fields

## TopicDraft

Classification:

- `optional / deferred`

Purpose:

- hold a pre-confirmation draft before a Topic is created

Notes:

- TopicDraft may remain non-persisted in the first runtime iteration.
- The first runtime implementation may accept a Topic create payload directly without storing a durable draft record.

Minimal candidate fields if later persisted:

- `id`
- `workspace_id`
- `created_by_user_id`
- `original_input`
- draft fields mirroring Topic-definition inputs
- `status`
- `created_at`
- `updated_at`

Prohibited fields:

- decision-core internals
- raw traces

## MonitoringRun

Classification:

- `MVP required`

Purpose:

- represent one Initial Review or future monitoring run lifecycle for one Topic

Ownership fields:

- `id`
- `workspace_id`
- `topic_id`
- `created_by_user_id`

Minimal fields:

- `id`
- `workspace_id`
- `topic_id`
- `created_by_user_id`
- `run_type`
- `status`
- `started_at`
- `completed_at` optional
- `failed_at` optional
- `status_summary`

User-visible vs internal fields:

- user-visible:
  - coarse lifecycle status
  - high-level status summary
- internal:
  - execution metadata
  - orchestration metadata
  - retry / infra details
  - source strategy internals

References:

- `workspace_id`
- `topic_id`
- `created_by_user_id`

Prohibited fields:

- crawl logs
- query plans
- prompts
- raw decision-core payloads

## InitialTopicMap

Classification:

- `MVP required`

Purpose:

- persist the first review workspace snapshot that the product shell renders for a Topic

Ownership fields:

- `id`
- `workspace_id`
- `topic_id`
- `monitoring_run_id`

Minimal fields:

- `id`
- `workspace_id`
- `topic_id`
- `monitoring_run_id`
- `review_summary`
- `source_coverage_summary`
- `signal_cluster_ids`
- `empty_or_sparse_state`
- `created_at`

User-visible vs internal fields:

- user-visible:
  - review summary
  - coverage summary
  - empty or sparse state
- internal:
  - ingestion bookkeeping
  - adapter provenance beyond safe references

References:

- `workspace_id`
- `topic_id`
- `monitoring_run_id`
- `signal_cluster_ids`

Prohibited fields:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- source strategy debug output
- raw trace fields

## SignalCluster

Classification:

- `MVP required`

Purpose:

- represent a customer-facing signal grouping in the Topic workspace

Ownership fields:

- `id`
- `workspace_id`
- `topic_id`
- `monitoring_run_id`

Minimal fields:

- `id`
- `workspace_id`
- `topic_id`
- `monitoring_run_id`
- `headline`
- `summary`
- `confidence_display` optional
- `limitations` optional
- `evidence_count`
- `source_count`
- `status`
- `created_at`

User-visible vs internal fields:

- user-visible:
  - headline
  - summary
  - confidence display
  - caveats / limitations
  - counts
- internal:
  - ingestion provenance
  - adapter metadata
  - join/projection support fields

References:

- `workspace_id`
- `topic_id`
- `monitoring_run_id`

Prohibited fields:

- `OpportunityCard`
- `OpportunityScore`
- `opportunity_score`
- `claim_candidate_id`
- `claim_id`
- `opportunity_id`
- `decision_band`

## CuratedEvidenceRecord

Classification:

- `MVP required`

Purpose:

- represent a customer-visible evidence item linked to a SignalCluster

Ownership fields:

- `id`
- `workspace_id`
- `topic_id`
- `monitoring_run_id`
- `signal_cluster_id`

Minimal fields:

- `id`
- `workspace_id`
- `topic_id`
- `monitoring_run_id`
- `signal_cluster_id`
- `title`
- `summary`
- `source_platform`
- `source_url`
- `published_at` optional
- `why_included`
- `status`

User-visible vs internal fields:

- user-visible:
  - title
  - summary
  - source metadata
  - why included
- internal:
  - ingest references
  - cache keys
  - source normalization metadata

References:

- `workspace_id`
- `topic_id`
- `monitoring_run_id`
- `signal_cluster_id`

Prohibited fields:

- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- internal trace objects
- direct decision-core scoring outputs

## UserAction

Classification:

- `MVP required`

Purpose:

- record a product event such as watch, unwatch, save, unsave, hide, or undo hide

Ownership fields:

- `id`
- `workspace_id`
- `topic_id`
- `user_id`

Minimal fields:

- `id`
- `workspace_id`
- `topic_id`
- `user_id`
- `action_type`
- `target_type`
- `target_id`
- `cluster_id` optional
- `evidence_id` optional
- `created_at`
- `metadata` optional

User-visible vs internal fields:

- user-visible:
  - usually not shown directly as raw records
  - may drive derived watched / hidden state
- internal:
  - audit or event sequencing metadata

References:

- `workspace_id`
- `topic_id`
- `user_id`
- optional cluster / evidence refs

Prohibited fields:

- direct analytics payloads in MVP
- decision-core internals
- drawer interaction state disguised as action state

## SavedItem

Classification:

- `MVP required`

Purpose:

- materialize saved cluster and saved evidence state for user retrieval

Ownership fields:

- `id`
- `workspace_id`
- `topic_id`
- `user_id`

Minimal fields:

- `id`
- `workspace_id`
- `topic_id`
- `user_id`
- `saved_type`
- `source_object_id`
- `cluster_id` optional
- `saved_at`
- `title_snapshot`
- `summary_snapshot`
- `source_links_snapshot` optional
- `status`

User-visible vs internal fields:

- user-visible:
  - snapshots shown in Saved Tab
  - item type and save time
- internal:
  - projection metadata
  - reconciliation metadata

References:

- `workspace_id`
- `topic_id`
- `user_id`
- `source_object_id`
- optional `cluster_id`

Prohibited fields:

- raw trace objects
- decision-core analytical ids
- direct UI-only tab state

## BaselineBrief

Classification:

- `optional / deferred`

Purpose:

- later provide a versioned, evidence-grounded downstream brief artifact

Rules:

- must remain downstream from Topic, SignalCluster, and CuratedEvidenceRecord
- must not become upstream fact source

Minimal later fields:

- `id`
- `workspace_id`
- `topic_id`
- `version`
- `status`
- references to supporting cluster and evidence ids

## CopilotSession / CopilotAction

Classification:

- `should not exist yet`

Purpose:

- future evidence-grounded assistant interactions

Rules:

- deferred until core runtime persistence exists
- must be scoped to workspace and topic
- must use product-visible evidence grounding rather than decision-core internals

## SourceItem / ExtractedSignal

Classification:

- `backend / internal later`

Purpose:

- support ingestion, source normalization, and extraction internals behind the product boundary

Rules:

- not user-facing MVP objects
- should not be returned directly by MVP product APIs
- may support evidence lineage internally later

Prohibited fields in customer-facing contracts:

- raw pipeline traces
- decision-core internal scoring or trace models

## Objects That Should Not Exist Yet

The following product-facing runtime objects should not be introduced in the first persistence stage:

- cross-topic Saved Library objects
- full Evidence Library objects
- team permission objects exposed through product UI
- Copilot runtime objects
- BaselineBrief persistence objects used as source-of-truth facts
