# Copilot Guided Actions

This contract defines the bounded product-layer Copilot action model for the current local prototype.

## Product Role

- `Copilot` is Topic-scoped.
- `Copilot` is evidence-grounded.
- `Copilot` is guided-actions only.
- `Copilot` is not open-ended chat.
- `Copilot` is not a generic market research assistant.
- `Copilot` may only operate on product-visible objects.

## Allowed MVP Action IDs

- `explain_cluster`
- `explain_brief_takeaway_support`
- `summarize_caveats`
- `generate_validation_questions`
- `suggest_what_to_watch_next`

## Input Types

- `signal_cluster`
- `baseline_brief_takeaway`
- `workspace_context`

## Shared Output Shape

Every deterministic mock output uses the bounded shape below:

- `status`
- `preliminary`
- `what_this_currently_supports`
- `what_remains_limited`
- `what_to_validate_next`
- optional `trace_refs`
- optional `unavailable_reason`
- optional `unavailable_message`

## Allowed Data Sources

- product-visible `Topic` fields
- product-visible `SignalCluster` fields
- product-visible `CuratedEvidence` / `EvidenceDrawer` visible fields
- saved / watched / hidden user-action state as user emphasis only
- controlled `BaselineBrief` state
- Brief trace metadata
- review summary / source coverage / caveats

## Forbidden Data Sources

- decision-core internals
- hidden scores
- raw refs / raw trace refs
- prompt logs
- crawler logs
- unprocessed source payloads
- unavailable source metadata
- other users' evidence
- private/internal company data not explicitly added in a later phase

## State Rules

- `rich`: full MVP action set may be available, but outputs remain evidence-bounded.
- `sparse`: explain / caveat / validation / watch-next actions remain available with explicit preliminary language.
- `no_evidence`: monitoring-gap explanation and evidence-collection follow-up remain available; no evidence-backed claims.
- `empty`: no market analysis; explain insufficient reviewable signal only.
- `baseline_failed` / `baseline_stuck`: no market analysis; explain that review did not complete.
- `data_unavailable` / `unknown_fixture_key` / `unexpected_topic_status` / `review_not_ready`: no market analysis; return safe prototype/local-state explanation only.

## Forbidden Claim Types

- market sizing
- demand certainty
- purchase-intent inference
- opportunity ranking
- competitor strategy claims
- trend acceleration without time metadata
- source metadata invention
- hallucinated citations
- unsupported GTM / pricing / roadmap recommendations
- rewriting Brief into stronger claims
- claiming sparse / empty / no_evidence means no demand
