# Project State Ledger

This ledger records the accepted project state for `forefield-product-shell` through P3B.

## Repository Split

- `forefield-decision-core` owns `DecisionCoreBoundaryHandoff`, the decision-core pipeline, scoring, and boundary validation.
- `forefield-product-shell` owns product objects, the handoff-to-product mapper, the future Topic Workspace, Evidence Drawer, Copilot product behavior, and UI / API / DB in later phases.

## Accepted Decision-Core Milestones

- boundary handoff contract completed
- boundary assembler completed
- boundary validation integration completed
- rich validated boundary fixture completed
- rich fixture commit: `9372b578720f31d6e8f2155d26bd64c8ff0fe6a1`

## Accepted Product-Shell Milestones

- P0 boundary docs and `AGENTS.md` completed
- P1 product contracts and fixtures completed
- P2B handoff-to-product mapper completed
- P2C-shell rich handoff robustness tests completed
- P2C-shell commit: `894ac191700c2337fa23e5a0067d84c0777c71ca`
- P2D-shell completed
- P2D-shell commit: `8295aad5dc7830e7296e43a11397309e85132eb9`
- rich product golden fixtures added
- rich evidence drawer states golden fixture added
- rich golden fixture tests added
- P3B completed
- P3B commit: `05f571ab047bef64477131db31f7baf2b69ff815`
- `TopicWorkspaceViewState` read-model builder added
- minimal and rich workspace golden fixtures added
- workspace-level tests added

## Current Product-Shell Capabilities

- consumes minimal and rich `DecisionCoreBoundaryHandoff` fixtures
- maps handoff into `MonitoringRun`, `TopicDraft`, `SignalCluster[]`, and `CuratedEvidenceRecord[]`
- builds `EvidenceDrawerState` per `SignalCluster`
- builds `TopicWorkspaceViewState` as a computed read model
- ignores `internal_decision_core` by default
- keeps `decision_band` and `review_priority` out of product output
- prevents prohibited decision-core fields from entering product output
- uses zero dependencies and Node built-in tests
- current test count: 38 / 38 passing
- selected_evidence_drawer defaults to `null`
- selectedClusterId builds drawer only when explicitly provided
- selectedClusterId not found throws a clear error
- no mapper source changed
- no UI / API / DB / persistence added
- no confirmed `Topic` by default

## Current Product-Shell Non-Capabilities

- no UI
- no API
- no DB
- no auth / workspace runtime
- no persistence
- no confirmed `Topic` promotion
- no `SavedItem` / `UserAction` / `BaselineBrief` / `Copilot` behavior
- no live decision-core integration

## Recommended Next Step

- P3C: Workspace interaction state planning

## Pre-Flight Checklist For Future Phases

- identify repo
- identify phase
- list allowed files
- list prohibited files / features
- run validation commands
- record commit hash
- confirm working tree clean
