# Workspace Interaction State

`WorkspaceInteractionState` is a lightweight, ephemeral session-state layer for the future
Topic Workspace UI.

It is not persisted.
It is not `TopicWorkspaceViewState`.
It is not `UserAction`.
It is not `SavedItem`.
It is not analytics or event tracking.

Its purpose is to represent temporary viewing and navigation state such as selected cluster,
drawer open/closed state, and expanded cluster sections.

## Scope

`WorkspaceInteractionState` is intentionally narrow.

It may contain:

- `selected_cluster_id`
- `drawer_state`
- `drawer_cluster_id`
- `active_section`
- `expanded_cluster_ids`

It must not contain:

- decision-core internals
- raw refs
- product business truth
- persisted action state
- watch / save / not relevant state

## Session-Only Rules

- This state is ephemeral and client/session scoped.
- It must not be stored as product business truth in P3C.
- It must not create or imply persistence, API routes, or DB schema.
- It must not create `SavedItem`, `UserAction`, or analytics records.

## Interaction Rules

- `selectCluster(clusterId)` selects a cluster but does not open the drawer.
- `openEvidenceDrawer(clusterId)` opens the drawer and selects that cluster.
- `closeEvidenceDrawer()` closes the drawer but preserves `selected_cluster_id`.
- `toggleClusterExpanded(clusterId)` toggles whether a cluster is expanded.
- `setActiveSection(sectionId)` switches among approved workspace sections.

## Explicit Out Of Scope

The following remain out of scope in P3C:

- UI components
- styling
- API routes
- DB schema
- persistence
- `SavedItem`
- `UserAction`
- Watch / Save / Not relevant behavior
- `BaselineBrief`
- `Copilot`
- analytics / event tracking
- confirmed Topic promotion

## Decision-Core Boundary Rule

`WorkspaceInteractionState` must not contain:

- `OpportunitySet`
- `OpportunityCard`
- `OpportunityScore`
- `ClaimTrace`
- `raw_refs`
- `raw_trace_refs`
- `claim_candidate_id`
- `internal_decision_core`
- `decision_band`
- `claim_id`
- `opportunity_id`
- scoring internals

This layer sits above `TopicWorkspaceViewState`, but must remain fully separate from
decision-core internals.
