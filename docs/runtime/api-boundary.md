# API Boundary

This document defines the candidate runtime API boundary for `forefield-product-shell`.

It is planning documentation only.
It does not create API routes, runtime code, DB schema, migrations, or auth/session implementation.

## API Boundary Principles

- API responses should return canonical product objects.
- API responses must never return decision-core internals.
- Every runtime object returned by the API must be scoped by user and workspace ownership.
- Source strategy internals, crawl logs, prompts, and debug fields are excluded from customer-facing contracts.
- `TopicWorkspaceViewState` remains a UI/read-model concern; the API should return persisted product objects or stable workspace payloads, not UI-only interaction state.
- `WorkspaceInteractionState` remains ephemeral UI state and must not be persisted as API business truth.

The following must not be exposed through customer-facing UI contracts or API contracts:

- `DecisionCoreBoundaryHandoff` in UI
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
- direct decision-core imports in UI
- product mapper imports inside UI components

## Candidate MVP Endpoints

These are candidate contracts, not final implementation commitments.

### `POST /topics`

Purpose:

- confirm a Topic definition and create a persisted Topic

Illustrative request shape:

- ownership context
- Topic definition fields derived from the current local confirmation flow

Illustrative response shape:

- created `Topic`
- initial run-start recommendation or run linkage if applicable

Notes:

- request/response examples should stay illustrative
- no decision-core internals

### `GET /topics`

Purpose:

- list Topics visible to the current user/workspace

Illustrative response shape:

- Topic list items
- current status
- last-updated metadata

### `GET /topics/:topicId`

Purpose:

- retrieve Topic metadata and high-level runtime status

Illustrative response shape:

- `Topic`
- current `MonitoringRun` status summary if relevant

### `POST /topics/:topicId/runs`

Purpose:

- start an Initial Review or future monitoring run for a Topic

Illustrative response shape:

- created `MonitoringRun`
- run status

Notes:

- MVP should expose coarse run lifecycle only
- source strategy details remain excluded

### `GET /runs/:runId`

Purpose:

- fetch run lifecycle status

Illustrative response shape:

- `MonitoringRun`
- coarse status summary

### `GET /topics/:topicId/workspace`

Purpose:

- return the persisted workspace snapshot for one Topic

Illustrative response shape:

- `InitialTopicMap`
- `SignalCluster[]`
- `CuratedEvidenceRecord[]` or stable evidence payloads grouped for workspace rendering
- optional saved/action summary data if later helpful

Notes:

- this endpoint should expose product objects, not decision-core output
- it should be the canonical runtime source for Overview workspace rendering

### `POST /topics/:topicId/actions`

Purpose:

- record a `UserAction`

Illustrative request shape:

- `workspace_id`
- `topic_id`
- `user_id`
- `action_type`
- target refs

Illustrative response shape:

- created `UserAction`
- optional derived current-state summary later, if explicitly designed

Notes:

- `View Evidence` is not part of this API in the current product definition

### `POST /topics/:topicId/saved-items`

Purpose:

- create a `SavedItem` for saved cluster or saved evidence

Illustrative request shape:

- ownership fields
- `saved_type`
- source object refs
- safe snapshot fields

Illustrative response shape:

- created `SavedItem`

### `PATCH /saved-items/:savedItemId`

Purpose:

- mark a saved item removed / unsaved

Illustrative request shape:

- `status: "removed"`

Illustrative response shape:

- updated `SavedItem`

## Deferred Endpoints

These endpoints are intentionally deferred from the first runtime iteration:

- `POST /topics/draft`
- `POST /topics/:topicId/briefs`
- Copilot session or action endpoints

Rationale:

- Topic Draft persistence is optional in the first runtime iteration
- `BaselineBrief` is not part of the MVP persistence core
- Copilot requires evidence-grounded runtime behavior and should not be added before the core persisted product loop is stable

## Payload Notes

Request and response shapes in this document are illustrative, not final schema.

Minimum ownership expectations:

- `workspace_id`
- `user_id` or authenticated equivalent
- `topic_id` where applicable
- `run_id` where applicable

Minimum object identity expectations:

- product-owned `topic_id`
- product-owned `run_id`
- product-owned `cluster_id`
- product-owned `evidence_id`
- product-owned `saved_item_id`
- product-owned `user_action_id`

Payloads must not expose:

- raw source collection logs
- query plans
- prompts
- debugging internals
- decision-core internal objects
- raw trace references

## Decision-Core Boundary

The backend adapter may consume `DecisionCoreBoundaryHandoff`.

The UI must not consume `DecisionCoreBoundaryHandoff`.

The API must expose persisted product objects only:

- `Topic`
- `MonitoringRun`
- `InitialTopicMap`
- `SignalCluster`
- `CuratedEvidenceRecord`
- `UserAction`
- `SavedItem`

The backend decision-core adapter should:

- accept safe handoff input
- map it into canonical product objects
- preserve bounded evidence lineage
- exclude internal analytical structures from API responses

## Runtime Adapter Implication

Future frontend runtime work should call runtime client or adapter modules, not raw `fetch` from UI components.

Implications:

- UI components remain presentational or orchestration-focused
- transport logic stays centralized
- runtime mode and dev fixture mode can coexist without being mixed together

Dev fixture mode should remain isolated from the production runtime path.
It can continue to support local product validation, but should not become the source of truth for persisted runtime behavior.

## MVP Boundary Summary

P7B recommends this boundary:

- backend may know about decision-core handoff input
- product APIs expose canonical product objects only
- UI consumes product objects or workspace payloads only
- no product API should expose decision-core internal fields, debug traces, or source-collection internals
