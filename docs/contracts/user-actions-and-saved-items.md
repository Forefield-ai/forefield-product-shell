# User Actions And Saved Items

## Scope

P6B defines local/session-only product action semantics for `forefield-product-shell`.

- `UserAction` is not backend persistence yet.
- `SavedItem` is local-only in P6B.
- No API, DB, auth, browser storage, analytics, Copilot, or `BaselineBrief` behavior is introduced here.

## Action Semantics

### View Evidence

`View Evidence` remains a trust-verification interaction.

- It is not recorded in the P6B `UserAction` reducer.
- It is not feedback action state.
- Future analytics or trust metrics may record it as a separate interaction event, but not in this reducer.

### Watch Cluster

`Watch` means the user wants to keep tracking a cluster.

- `Watch` is not `Save`.
- `watch_cluster` and `unwatch_cluster` append `UserAction` events.
- Watching updates local `watchedClustersById`.
- Watching does not create a `SavedItem`.
- Watching does not delete or modify evidence.

### Save Cluster

`Save Cluster` means the user wants to find this cluster again later.

- `save_cluster` and `unsave_cluster` append `UserAction` events.
- Cluster saves create or update `SavedItem` entries with `saved_type: "cluster"`.
- Saving a cluster does not modify evidence.

### Save Evidence

`Save Evidence` means the user wants to keep a specific evidence asset.

- `save_evidence` and `unsave_evidence` append `UserAction` events.
- Evidence saves create or update `SavedItem` entries with `saved_type: "evidence"`.
- Saved evidence preserves its `cluster_id`.
- Saving evidence does not modify evidence.

### Not Relevant / Hide Cluster

`Not relevant / Hide` means the user does not want to focus on a cluster for the current topic right now.

- `hide_cluster` and `undo_hide_cluster` append `UserAction` events.
- Hiding updates local `hiddenClustersById`.
- Hiding does not delete underlying evidence.
- Hide supports undo.
- Hidden clusters keep any existing saved or watched state.
- P6B does not manipulate drawer state. P6C UI wiring should close the drawer if the hidden cluster is currently open.

## Local State Shape

P6B action state starts as:

```js
{
  userActions: [],
  savedItems: [],
  watchedClustersById: {},
  hiddenClustersById: {}
}
```

### UserAction

`UserAction` events use:

- `id`
- `action_type`
- `target_type`
- `target_id`
- `local_topic_id`
- `cluster_id` optional
- `evidence_id` optional
- `created_at`
- `metadata` optional

### SavedItem

`SavedItem` entries use:

- `id`
- `saved_type: "cluster" | "evidence"`
- `source_object_id`
- `local_topic_id`
- `cluster_id` optional
- `saved_at`
- `title_snapshot`
- `summary_snapshot`
- `source_links_snapshot` optional
- `status: "active" | "removed"`

`Save Cluster` and `Save Evidence` share the same `SavedItem` family, but use different `saved_type` values.

### WatchedClusterState

- `cluster_id`
- `watched_at`
- `status: "active" | "removed"`

### HiddenClusterState

- `cluster_id`
- `hidden_at`
- `status: "hidden" | "visible"`

## Boundary Rules

- `UserAction` and `SavedItem` must not be mixed into `TopicWorkspaceViewState`.
- `UserAction` and `SavedItem` must not be mixed into `WorkspaceInteractionState`.
- These objects are future persistence candidates, but remain local/session-only in P6B.

## Exclusions

P6B excludes:

- API routes
- DB schema
- auth
- browser storage
- backend persistence
- analytics
- Copilot
- `BaselineBrief`
