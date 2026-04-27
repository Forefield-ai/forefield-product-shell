# Project State Ledger

This ledger records the accepted project state for `forefield-product-shell` through P2C-shell.

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

## Current Product-Shell Capabilities

- consumes minimal and rich `DecisionCoreBoundaryHandoff` fixtures
- maps handoff into `MonitoringRun`, `TopicDraft`, `SignalCluster[]`, and `CuratedEvidenceRecord[]`
- builds `EvidenceDrawerState` per `SignalCluster`
- ignores `internal_decision_core` by default
- prevents prohibited decision-core fields from entering product output
- uses zero dependencies and Node built-in tests

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

- P2D-shell: rich product golden fixtures
- After P2D, P3: Topic Workspace View State

## Pre-Flight Checklist For Future Phases

- identify repo
- identify phase
- list allowed files
- list prohibited files / features
- run validation commands
- record commit hash
- confirm working tree clean
