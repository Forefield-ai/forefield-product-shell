# P18-G No-redesign API-mode Visible Product Flow

## Executive decision

P18-G wires API Backend mode into the existing product-shell browser flow without redesigning the workspace. A user can use the existing Topic input, select API Backend mode, create an Initial Review run through the configured decision-core API, load the persisted workspace payload, and use the existing Topic Workspace, Evidence Drawer, and Baseline Brief read-models.

This is a visible product-flow wiring phase, not a visual design phase.

## Why P18-G follows P18-F

P18-F proved the HTTP/API path at runtime and smoke-test level:

- product-shell can call the decision-core API server
- the backend can create an InitialReviewRun
- product-shell can fetch the persisted workspace payload
- Topic Workspace, Evidence Drawer, and Baseline Brief state can be built from that payload

The remaining gap was browser visibility. P18-G exposes that path through the existing UI.

## Runtime mode distinction

Product-shell now has two visible runtime modes:

- Local Sample mode: uses bundled product fixtures and the existing local runtime adapter.
- API Backend mode: uses the product-shell API runtime adapter and the configured decision-core backend URL.

API Backend mode does not silently fall back to local fixture data. If the backend fails, the page shows a safe error state.

## Topic input API-mode flow

The existing Topic input remains the entrypoint.

API Backend mode uses this path:

1. User enters a topic.
2. Product-shell creates an editable Topic Draft.
3. User confirms the draft.
4. Product-shell calls `createInitialReviewRun` through the API runtime adapter.
5. Product-shell loads the backend workspace payload by `workspace_id`.
6. Product-shell stores the product-facing payload on the local topic snapshot.
7. Existing workspace, drawer, and brief read-models render from that payload.

P18-G uses mocked backend mode by default. Live source mode remains gated in decision-core.

## Loading and error behavior

API Backend mode exposes minimal states:

- `idle`
- `creating_run`
- `loading_workspace`
- `workspace_ready`
- `failed`

Errors are mapped to safe product-facing codes:

- `backend_unavailable`
- `invalid_topic`
- `live_gate_missing`
- `workspace_load_failed`
- `runtime_execution_failed`

Error UI does not show provider payloads, stack traces, secrets, raw URLs, usernames, handles, IDs, prompts, or chain-of-thought.

## Backend URL config

Local API-mode command:

```powershell
cd C:\Users\19747\Desktop\Forefield\forefield-decision-core
npm run dev:initial-review-api
```

Second terminal:

```powershell
cd C:\Users\19747\Desktop\Forefield\forefield-product-shell
$env:VITE_FOREFIELD_API_BASE_URL='http://127.0.0.1:8787'
$env:VITE_FOREFIELD_RUNTIME_MODE='api'
npm run dev
```

The default backend URL is `http://127.0.0.1:8787`.

## Manual QA checklist

- App opens.
- API Backend mode is active or selectable.
- Enter topic: `AI meeting notes for product teams`.
- Click the existing start/create Topic control.
- Confirm the Topic Draft.
- Loading/status appears.
- Workspace appears.
- Evidence Drawer opens.
- Baseline Brief appears.
- Local Sample mode still works after switching back.
- No console errors.
- No raw/private/provider text appears in visible UI.

## What this proves

- The visible product-shell browser path can call the backend API runtime.
- API Backend mode is separate from Local Sample mode.
- The existing Topic input can start the API runtime path.
- Product-shell renders workspace/drawer/brief state from a backend workspace payload.
- Local fixture mode and v0.2 fallback remain intact.

## What this does not prove

- Final UI design.
- Figma implementation.
- Auth.
- Production DB persistence.
- Queue/background job behavior.
- Live provider browser flow.
- Source-quality filtering.
- Production clustering.
- Runtime v0.3 as the global default.

## Deferred technical debts

- `final_visual_design_not_started`
- `api_mode_visible_flow_minimal_ui`
- `auth_not_implemented`
- `production_db_not_selected`
- `queue_background_jobs_not_implemented`
- `local_dev_store_not_production_persistence`
- `deployment_environment_not_finalized`
- `source_quality_filtering_pending`
- `live_mode_requires_provider_gates`

## Recommended next phase

P18-H should harden the API-mode website path around local backend reliability: explicit frontend API-mode startup checks, safe polling/status refresh behavior, and a deploy/runtime configuration checklist. It should still avoid UI redesign and source-quality work.
