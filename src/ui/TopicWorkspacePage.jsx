import React, { useState } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import ReviewSummaryStrip from './components/ReviewSummaryStrip';
import SourceCoverageStrip from './components/SourceCoverageStrip';
import SignalClusterList from './components/SignalClusterList';
import EmptySparseState from './components/EmptySparseState';
import {
  initialWorkspaceInteractionState,
  selectCluster,
} from '../product/workspace/workspace-interaction-state';

export default function TopicWorkspacePage({ workspaceViewState }) {
  const [interactionState, setInteractionState] = useState(() =>
    initialWorkspaceInteractionState()
  );

  const handleSelectCluster = (clusterId) => {
    setInteractionState((currentState) => selectCluster(currentState, clusterId));
  };

  const isEmptyOrSparse = Boolean(
    workspaceViewState?.empty_or_sparse_state?.is_empty
    || workspaceViewState?.empty_or_sparse_state?.is_sparse
  );

  return (
    <main className="workspace-shell">
      <div className="workspace-shell__inner">
        <WorkspaceHeader
          workspaceHeader={workspaceViewState.workspace_header}
          topicDraftSummary={workspaceViewState.topic_draft_summary}
        />

        <ReviewSummaryStrip reviewSummary={workspaceViewState.review_summary} />
        <SourceCoverageStrip sourceCoverageStrip={workspaceViewState.source_coverage_strip} />

        {isEmptyOrSparse ? (
          <EmptySparseState emptyOrSparseState={workspaceViewState.empty_or_sparse_state} />
        ) : null}

        <SignalClusterList
          signalClusterSections={workspaceViewState.signal_cluster_sections}
          selectedClusterId={interactionState.selected_cluster_id}
          onSelectCluster={handleSelectCluster}
        />
      </div>
    </main>
  );
}
