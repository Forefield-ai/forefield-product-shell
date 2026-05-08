# P19-D1 - Product-shell Outcome Rendering Hardening

## Executive Decision

P19-D1 hardens the visible API Backend product path so product-shell can consume and display the Initial Review outcome decision produced by decision-core. This is a minimal wiring change, not a UI redesign.

Product-shell now treats these backend run statuses as terminal product states:

- `workspace_ready`
- `workspace_ready_with_limited_support`
- `insufficient_signal`

Only `failed` remains a runtime failure terminal state.

## Why P19-D1 Follows P19-D0

P19-D0 added the backend MVP release readiness policy and outcome decision fields. Product-shell needed to understand those fields without silently falling back to fixtures or treating `insufficient_signal` as `workspace_not_ready`.

## Minimal Scope

Changed behavior:

- API-mode polling accepts limited and insufficient outcomes as completed product states.
- Topic Workspace read-model preserves a safe `outcome_summary` when the runtime payload provides one.
- Existing header and summary components display the safe client outcome message and status label.

Unchanged behavior:

- No UI redesign.
- No Figma.
- No local fixture removal.
- No v0.2 fallback removal.
- No live provider calls from product-shell.
- No decision-core internals imported into product-shell UI.

## Product Outcome Display

The existing workspace header maps release readiness status to simple labels:

- `accepted` -> Accepted
- `accepted_limited` -> Limited support
- `insufficient_signal` -> Insufficient signal
- `runtime_failure` -> Runtime issue

The summary strip uses the backend-provided `client_safe_outcome_message` when available.

## API-mode Boundary

API Backend mode still does not silently fall back to local fixture data. If the backend returns a valid `insufficient_signal` workspace, product-shell renders that workspace. If the backend fails before a workspace payload exists, product-shell shows the existing safe error state.

## What This Proves

P19-D1 proves:

- product-shell can load accepted, limited, and insufficient runtime outcomes
- insufficient signal is no longer treated as a not-ready polling state
- safe outcome messages can be shown without raw provider details
- local fixture mode and v0.2 fallback remain intact

## What This Does Not Prove

P19-D1 does not prove:

- final UI design is complete
- provider reliability is solved
- live source quality is final
- auth or production access control exists
- queue/background jobs are implemented

## Recommended Next Phase

Recommended next phase:

`P19-D2 - Hosted MVP manual QA and release checklist`

That phase should verify the hosted `forefield.ai` browser path against the deployed backend using mocked mode first, then use C4 live acceptance as an operator smoke.

## Technical Debts

- `api_mode_visible_flow_minimal_ui`: outcome display is intentionally minimal.
- `final_visual_design_not_started`: no redesign was performed.
- `source_reliability_not_solved`: provider limits remain backend-side.
- `auth_not_implemented`: public access is not ready.
- `queue_background_jobs_not_implemented`: runtime remains request-oriented.
