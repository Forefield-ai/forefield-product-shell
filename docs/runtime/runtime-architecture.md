# Runtime Architecture

This document defines the P7B runtime architecture direction for `forefield-product-shell`.

It is documentation only.
It does not add runtime code, API routes, DB schema, auth, persistence, browser storage, or backend services.

## Why Runtime Planning Is Needed Now

The current product loop is already demonstrated locally:

- Home / Natural-language Topic Input
- Topic Draft Generation
- Topic Draft Confirmation
- Baseline Building Progress
- Topic Workspace
- Evidence Drawer
- Watch / Save / Hide actions
- Topic-level Saved Tab

That loop is useful for product validation, but it is still session-only.
It cannot yet:

- persist Topics
- persist Monitoring Runs
- persist UserActions
- persist SavedItems
- restore a prior workspace
- enforce explicit user / workspace ownership
- consume future runtime data through a stable API boundary

P7B exists to reduce risk before any DB or API work begins.
It defines how the current local shell should evolve into a persisted MVP runtime without leaking decision-core internals into customer-facing product state.

## Architecture Principles

- `forefield-product-shell` owns customer-facing product state.
- `forefield-decision-core` remains a separate analytical system.
- UI must not consume decision-core internals.
- Runtime should persist canonical product objects, not legacy or decision-core internal objects.
- `workspace_id` and `user_id` ownership must be explicit.
- `UserAction` and `SavedItem` are first-class product objects.
- Evidence traceability must be preserved across runs, clusters, and saved states.
- `BaselineBrief` and `Copilot` remain deferred.
- MVP 0.1 should not force full continuous monitoring.
- Runtime should avoid overbuilding teams, roles, billing, analytics, or connector marketplace behavior before the core product loop is persisted.

## Runtime Layers

### UI Layer

The UI layer owns customer-facing interaction surfaces:

- local flow pages
- Topic Workspace
- Evidence Drawer
- User Actions UI
- Saved Tab

The UI layer should remain presentational and orchestration-aware, but should not directly own transport, persistence, or decision-core adaptation.

The UI layer must not:

- import `DecisionCoreBoundaryHandoff`
- import decision-core source
- import product mapper code inside UI components
- expose `OpportunitySet`, `OpportunityCard`, `OpportunityScore`, `ClaimTrace`, `raw_refs`, `raw_trace_refs`, `opportunity_score`, `claim_candidate_id`, `internal_decision_core`, `decision_band`, `claim_id`, or `opportunity_id`

### Shell / Orchestration Layer

The shell/orchestration layer owns product flow sequencing:

- Topic Draft creation flow
- Initial Review start / progress orchestration
- Topic-level shell metadata
- active tab selection for Overview / Saved
- local session boundaries during MVP prototyping

Today this orchestration is local and in-memory.
In runtime mode, it should call a runtime adapter instead of directly owning all product state.

### Future Runtime Adapter / Client Layer

The future runtime adapter/client layer should sit between the UI/shell and backend API.

Its job is to:

- fetch canonical product objects
- translate API responses into UI-ready runtime objects
- centralize request / response handling
- isolate dev fixture mode from production runtime mode

It should prevent raw `fetch` calls from being scattered across UI components.

### Future Backend API Layer

The backend API layer should expose product-owned runtime contracts:

- Topic creation and retrieval
- Monitoring Run lifecycle
- workspace snapshot retrieval
- UserAction recording
- SavedItem create / remove

The backend API should return product objects only.
It must not expose decision-core internal structures or source-collection internals.

### Future Persistence Layer

The persistence layer should store canonical product objects such as:

- User
- Workspace
- Topic
- MonitoringRun
- InitialTopicMap
- SignalCluster
- CuratedEvidenceRecord
- UserAction
- SavedItem

It should not persist UI-only session state such as `WorkspaceInteractionState`.

### Decision-Core Adapter / Ingestion Boundary

The decision-core adapter / ingestion boundary is the only place where runtime infrastructure may consume `DecisionCoreBoundaryHandoff`.

That boundary should:

- accept handoff input
- validate intake assumptions
- map handoff output into canonical persisted product objects
- preserve evidence traceability
- exclude analytical internals from customer-facing contracts

The UI must never consume `DecisionCoreBoundaryHandoff` directly.

## Local-To-Runtime Migration

The current local MVP state should migrate in these directions:

- `localTopics[]` -> persisted `Topic`
- `currentTopicDraft` -> Topic create payload, or optional persisted `TopicDraft`
- local baseline building simulation -> `MonitoringRun` lifecycle
- product fixtures -> `InitialTopicMap`, `SignalCluster`, and `CuratedEvidenceRecord`
- `topicActionStateById.userActions` -> persisted `UserAction` records
- `topicActionStateById.savedItems` -> persisted `SavedItem` records
- `watchedClustersById` / `hiddenClustersById` -> event log plus materialized projection
- local Saved Tab -> runtime-sourced saved items for the current Topic
- local fixture selector -> dev-only mode

Migration notes:

- deterministic local Topic Draft generation is a temporary shell behavior
- local baseline progress stages are a temporary stand-in for run lifecycle
- local fixture-driven workspace data should eventually be replaced by persisted workspace snapshot data
- dev fixture mode can remain useful, but must stay isolated from production runtime paths

## Auth And Workspace Assumptions

P7B assumes a backend-ready ownership model, even before real auth is implemented.

Recommended MVP direction:

- backend contracts should require `user_id` and `workspace_id` ownership
- frontend may temporarily run with a stubbed single-user / single-workspace context
- no teams, roles, permissions, or collaboration surfaces are required in MVP 0.1

This lets runtime persistence planning move forward without overbuilding account management before the core product loop is proven.

## MVP 0.1 Runtime Shape

The intended MVP runtime shape is:

1. User confirms a Topic.
2. Product-shell creates a persisted Topic and a Monitoring Run.
3. The runtime stores or retrieves a first review workspace snapshot.
4. The user reviews clusters and evidence through canonical product objects.
5. The runtime records UserActions and SavedItems with explicit user / workspace ownership.

The runtime does not yet require:

- continuous monitoring automation
- Baseline Brief generation
- Copilot sessions
- cross-topic libraries
- team workspace behavior

## Explicit Non-Goals For P7B

- no API implementation
- no DB schema or migrations
- no auth implementation
- no persistence implementation
- no browser storage
- no backend service code
- no direct decision-core imports in UI
- no product mapper imports inside UI components
