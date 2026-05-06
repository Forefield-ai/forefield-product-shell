# P18-H API-mode Website Runtime Reliability Hardening

## Executive Decision

P18-H hardens the visible API Backend product path without changing the product design. API mode now treats backend availability, run creation, run polling, and workspace retrieval as separate explicit steps. Local Sample mode remains available, but API mode does not silently fall back to fixture data.

## Why P18-H Follows P18-G

P18-G made the backend path visible in the existing product-shell UI. The remaining risk was runtime ambiguity: the browser flow could appear to start even when the backend was unavailable, a run was still in progress, or the workspace payload was not ready. P18-H addresses that reliability boundary before adding auth, persistence, queues, source-quality filtering, or visual design.

## API-mode Runtime Flow

API Backend mode follows this sequence:

1. Validate the configured backend URL.
2. Call `GET /api/health`.
3. Call `POST /api/initial-review-runs`.
4. Poll `GET /api/initial-review-runs/:runId` until `workspace_ready` or `failed`.
5. Call `GET /api/workspaces/:workspaceId`.
6. Build the existing Topic Workspace, Evidence Drawer, and Baseline Brief read-models.

The browser state uses these functional statuses:

- `checking_backend`
- `creating_run`
- `polling_run`
- `loading_workspace`
- `workspace_ready`
- `failed`

## Backend URL Config

API mode uses:

```powershell
$env:VITE_FOREFIELD_API_BASE_URL='http://127.0.0.1:8787'
$env:VITE_FOREFIELD_RUNTIME_MODE='api'
```

The backend URL must be an HTTP or HTTPS URL. Invalid values fail with `invalid_backend_url` before the product flow attempts a run.

## Local Startup Commands

Terminal 1:

```powershell
cd C:\Users\19747\Desktop\Forefield\forefield-decision-core
npm run dev:initial-review-api
```

Terminal 2:

```powershell
cd C:\Users\19747\Desktop\Forefield\forefield-product-shell
$env:VITE_FOREFIELD_API_BASE_URL='http://127.0.0.1:8787'
$env:VITE_FOREFIELD_RUNTIME_MODE='api'
npm run dev
```

## Safe Failure Behavior

API mode uses safe product-level errors:

- `backend_unavailable`
- `invalid_backend_url`
- `invalid_topic`
- `live_gate_missing`
- `workspace_not_ready`
- `run_failed`
- `workspace_load_failed`
- `runtime_execution_failed`

The UI should not show backend stack traces, provider payloads, raw source URLs, handles, IDs, API keys, prompts, or private fields.

## No Silent Fixture Fallback

Local Sample mode and API Backend mode are separate runtime paths. If API mode fails, the product reports a safe failure state. It does not load local fixtures as a fallback.

## Deployment Readiness Boundary

P18-H improves local/deployed runtime readiness by requiring:

- configured backend base URL
- reachable backend health endpoint
- explicit run polling
- safe not-ready and failed states
- product-facing workspace payload validation

This still does not add production auth, final database persistence, queue/background jobs, or source-quality filtering.

## What This Proves

- Product-shell can detect a missing or unhealthy backend safely.
- API mode validates backend URL configuration.
- The visible topic flow uses explicit create, poll, and fetch steps.
- Workspace-not-ready and failed-run states do not crash the product path.
- Existing Workspace, Evidence Drawer, and Baseline Brief read-models still build from API payloads.
- Local Sample mode and v0.2 fallback remain intact.

## What This Does Not Prove

- Production authentication.
- Final production database behavior.
- Queue or background job durability.
- Live provider quality or source filtering.
- Final UI design.
- Production deployment topology.

## Deferred Work

- `auth_not_implemented`
- `production_db_not_selected`
- `queue_background_jobs_not_implemented`
- `deployment_environment_not_finalized`
- `source_quality_filtering_pending`
- `live_mode_requires_provider_gates`
- `runtime_v03_default_not_flipped`
- `final_visual_design_not_started`
