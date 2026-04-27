# Project State Ledger

This ledger records the accepted project state for `forefield-product-shell` through P4D2.

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
- P3C completed
- P3C commit: `54f5d60973233118b9c6a745fe400e7917d573bb`
- `WorkspaceInteractionState` contract added
- `WorkspaceInteractionState` helper / reducer module added
- `WorkspaceInteractionState` fixture snapshots added
- `WorkspaceInteractionState` tests added
- P4B completed
- P4B commit: `1bae88af87293e68fc08adb634534b8c1a23a1c6`
- minimal static `Vite + React` Topic Workspace UI added
- UI consumes rich `TopicWorkspaceViewState` fixture only
- UI uses `WorkspaceInteractionState` helper for cluster selection
- selectCluster does not open Evidence Drawer
- EvidenceDrawer interaction deferred to P4C
- build passed
- product tests remain `58 / 58` passing
- P4C completed
- P4C commit: `b7fb5986bc822ffdabc4503e4da4df5de078d49e`
- static EvidenceDrawer interaction added
- View Evidence calls `openEvidenceDrawer(clusterId)`
- cluster card click still only calls `selectCluster`
- drawer close calls `closeEvidenceDrawer()`
- `closeEvidenceDrawer` preserves `selected_cluster_id`
- drawer content is derived through `buildTopicWorkspaceViewState(richProductMainline, { selectedClusterId })`
- UI does not manually assemble drawer evidence
- UI does not import mapper, handoff, or decision-core internals
- no product read-model / helper / mapper code changed
- no API / DB / auth / persistence added
- no dependencies added
- `npm run validate`, `npm test`, and `npm run build` passed
- P4D1 completed
- P4D1 commit: `5c98097d7ca08a03cc898d47e2eb20bce7390e1e`
- minimal / rich local fixture selector added
- default fixture remains `rich`
- UI still derives `TopicWorkspaceViewState` through `buildTopicWorkspaceViewState(...)`
- UI does not render product mainline objects directly
- switching fixture resets `WorkspaceInteractionState` by remounting `TopicWorkspacePage`
- switching fixture closes drawer and clears `selected_cluster_id` / `drawer_cluster_id`
- `EvidenceDrawer` behavior from P4C remains intact
- no `package.json` / `package-lock.json` changes
- no API / DB / auth / persistence / dependencies added
- `npm run validate`, `npm test`, and `npm run build` passed
- product tests remain `58 / 58` passing
- P4D2 completed
- P4D2 commit: `c261c2b83d3eea4100def12441132fb108f04fb9`
- `EmptySparseState` display refinement completed
- `is_empty === true` renders a primary empty state block
- `is_sparse === true && !is_empty` renders a non-blocking limited coverage notice
- reason strings are mapped to short readable display labels inside the UI component
- no product fixtures changed
- no product read-model / mapper / interaction helper changed
- fixture selector behavior remains intact
- `EvidenceDrawer` behavior remains intact
- no API / DB / auth / persistence / dependencies added
- `npm run validate`, `npm test`, and `npm run build` passed
- product tests remain `58 / 58` passing

## Current Product-Shell Capabilities

- consumes minimal and rich `DecisionCoreBoundaryHandoff` fixtures
- maps handoff into `MonitoringRun`, `TopicDraft`, `SignalCluster[]`, and `CuratedEvidenceRecord[]`
- builds `EvidenceDrawerState` per `SignalCluster`
- builds `TopicWorkspaceViewState` as a computed read model
- models `WorkspaceInteractionState` as a lightweight interaction-state layer
- ignores `internal_decision_core` by default
- keeps `decision_band` and `review_priority` out of product output
- prevents prohibited decision-core fields from entering product output
- uses zero dependencies and Node built-in tests
- current test count: 58 / 58 passing
- selected_evidence_drawer defaults to `null`
- selectedClusterId builds drawer only when explicitly provided
- selectedClusterId not found throws a clear error
- selectCluster does not open drawer
- openEvidenceDrawer opens drawer and selects cluster
- closeEvidenceDrawer preserves selected_cluster_id
- `WorkspaceInteractionState` is ephemeral / session-scoped / non-persistent
- `WorkspaceInteractionState` is not `UserAction`, `SavedItem`, analytics, or business truth
- renders a minimal static Topic Workspace UI from local product fixtures
- provides a local minimal / rich fixture selector for static UI demo flows
- uses `WorkspaceInteractionState` for UI cluster selection
- renders static EvidenceDrawer content through `buildTopicWorkspaceViewState(richProductMainline, { selectedClusterId })`
- resets `WorkspaceInteractionState` on fixture switch by remounting `TopicWorkspacePage`
- clears selection and closes drawer on fixture switch
- renders a primary empty-state block when `empty_or_sparse_state.is_empty === true`
- renders a non-blocking sparse coverage notice when `empty_or_sparse_state.is_sparse === true` and not empty
- maps machine-readable empty/sparse reasons to short readable UI labels
- does not directly consume handoff, mapper output, or decision-core internals in UI
- no mapper source changed
- no product read-model / helper / mapper source changed in P4C
- no API / DB / auth / persistence added
- no confirmed `Topic` by default

## Current Product-Shell Non-Capabilities

- no API
- no DB
- no auth / workspace runtime
- no persistence
- no confirmed `Topic` promotion
- no `SavedItem` / `UserAction` / `BaselineBrief` / `Copilot` behavior
- no live decision-core integration

## Recommended Next Step

- P4D3: layout polish

## Pre-Flight Checklist For Future Phases

- identify repo
- identify phase
- list allowed files
- list prohibited files / features
- run validation commands
- record commit hash
- confirm working tree clean
