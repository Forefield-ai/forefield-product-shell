# P19-D2 - Product-shell Manual QA Checklist

## Executive Decision

P19-D2 defines the manual browser QA gate for the hosted MVP 0.1 website path. This is a release checklist, not UI redesign work.

The product-shell browser path should be judged by whether a user can run an Initial Review through API Backend mode, enter a workspace, see a safe outcome, and inspect Evidence Drawer and Brief without raw/private/provider leakage.

## Hosted Browser Path

Target URL:

```text
https://forefield.ai
```

Expected runtime mode:

```text
API Backend
```

Expected backend:

```text
https://forefield-decision-core.onrender.com
```

## Manual QA Steps

1. Open `https://forefield.ai`.
2. Confirm the page is not blank and no blocking error is visible.
3. Confirm `API Backend` mode is active.
4. Confirm the backend URL shown on the page is the hosted decision-core API.
5. Enter topic: `AI meeting notes for product teams`.
6. Start the Initial Review run.
7. Confirm the flow progresses through loading states without getting stuck.
8. Confirm a workspace appears.
9. Confirm the review outcome pill is visible.
10. Confirm the client-safe outcome message is visible.
11. Open Evidence Drawer from a cluster.
12. Open Preview Brief.
13. Return to topics or start a new topic if needed.
14. Switch to Local Sample mode and confirm local fixture mode still works.
15. Check browser console for blocking runtime errors.
16. Scan visible UI for raw/private/provider leakage.

## Outcome Rendering Checks

The Workspace header should show one of:

- `Review status: Accepted`
- `Review status: Limited support`
- `Review status: Insufficient signal`
- `Review status: Runtime issue`

Accepted outcome message example:

```text
We found enough reliable user-side signals to prepare an initial workspace.
```

Insufficient outcome message example:

```text
We could not find enough reliable user-side signals for this topic.
```

The product should not get stuck on `workspace_not_ready` when the backend returns `workspace_ready_with_limited_support` or `insufficient_signal`.

## Hard Browser Blockers

Any of these block MVP browser release:

- `forefield.ai` is unreachable
- visible blank page
- API Backend mode cannot reach hosted backend
- topic submit fails before creating a run
- run never reaches a terminal product state
- workspace never loads
- Evidence Drawer cannot open for a valid cluster
- Preview Brief cannot open when eligible
- API mode silently falls back to local fixture data
- visible raw provider payload, raw URL, username, handle, profile ID, post ID, comment ID, API key, stack trace, prompt, or chain-of-thought

## Acceptable Caveats

These do not block P19-D2:

- visual design is not final
- source coverage can be partial
- provider rate-limit caveats can exist in backend diagnostics
- some topics can return insufficient signal
- Local Sample mode remains available for dev/manual comparison
- auth is not implemented yet

## QA Recording Template

```text
frontend_reachable:
api_backend_mode:
backend_url:
topic_submit:
workspace_rendered:
outcome_visible:
outcome_value:
outcome_message_visible:
evidence_drawer_opened:
brief_opened:
local_sample_mode_still_works:
console_blocking_errors:
raw_private_provider_leak_visible:
manual_release_status:
notes:
```

Allowed `manual_release_status` values:

- `pass`
- `pass_with_caveats`
- `blocked`

## What This Proves

P19-D2 manual QA proves:

- hosted product-shell can use hosted decision-core API mode
- product outcome states are visible
- accepted, limited, and insufficient outcomes are treated as product states
- local fixture mode remains available
- core workspace inspection surfaces remain usable

## What This Does Not Prove

P19-D2 manual QA does not prove:

- final UI polish is complete
- auth is implemented
- live providers are reliable
- source-quality filtering is final
- production monitoring exists
- queue/background jobs exist

## Recommended Next Phase

Recommended next phase:

`P19-D3 - Early-user access and launch guardrails`

That phase should add the minimal access and operational guardrails needed before giving the site to people outside the builder/operator loop.
