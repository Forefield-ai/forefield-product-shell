import React, { useState } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import ReviewSummaryStrip from './components/ReviewSummaryStrip';
import SourceCoverageStrip from './components/SourceCoverageStrip';
import SignalClusterList from './components/SignalClusterList';
import EmptySparseState from './components/EmptySparseState';
import EvidenceDrawer from './components/EvidenceDrawer';
import { buildTopicWorkspaceViewState } from '../product/read-models/build-topic-workspace-view-state';
import {
  closeEvidenceDrawer,
  initialWorkspaceInteractionState,
  openEvidenceDrawer,
  selectCluster,
} from '../product/workspace/workspace-interaction-state';

export default function TopicWorkspacePage({ productMainline }) {
  const [interactionState, setInteractionState] = useState(() =>
    initialWorkspaceInteractionState()
  );
  const workspaceViewState = buildTopicWorkspaceViewState(productMainline);
  const drawerWorkspaceViewState = (
    interactionState.drawer_state === 'open'
    && interactionState.drawer_cluster_id
  )
    ? buildTopicWorkspaceViewState(productMainline, {
      selectedClusterId: interactionState.drawer_cluster_id,
    })
    : null;
  const selectedEvidenceDrawer = drawerWorkspaceViewState?.selected_evidence_drawer || null;

  const handleSelectCluster = (clusterId) => {
    setInteractionState((currentState) => selectCluster(currentState, clusterId));
  };
  const handleOpenEvidenceDrawer = (clusterId) => {
    setInteractionState((currentState) => openEvidenceDrawer(currentState, clusterId));
  };
  const handleCloseEvidenceDrawer = () => {
    setInteractionState((currentState) => closeEvidenceDrawer(currentState));
  };

  const isEmptyOrSparse = Boolean(
    workspaceViewState?.empty_or_sparse_state?.is_empty
    || workspaceViewState?.empty_or_sparse_state?.is_sparse
  );
  const isEmptyState = Boolean(workspaceViewState?.empty_or_sparse_state?.is_empty);
  const isSparseOnlyState = Boolean(
    workspaceViewState?.empty_or_sparse_state?.is_sparse
    && !workspaceViewState?.empty_or_sparse_state?.is_empty
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

        {isSparseOnlyState ? (
          <EmptySparseState emptyOrSparseState={workspaceViewState.empty_or_sparse_state} />
        ) : null}

        <div className={`workspace-shell__content${isEmptyState ? ' workspace-shell__content--empty' : ''}`}>
          {isEmptyState ? (
            <EmptySparseState emptyOrSparseState={workspaceViewState.empty_or_sparse_state} />
          ) : (
            <SignalClusterList
              signalClusterSections={workspaceViewState.signal_cluster_sections}
              selectedClusterId={interactionState.selected_cluster_id}
              onSelectCluster={handleSelectCluster}
              onOpenEvidenceDrawer={handleOpenEvidenceDrawer}
            />
          )}

          {!isEmptyState && interactionState.drawer_state === 'open' && selectedEvidenceDrawer ? (
            <EvidenceDrawer
              evidenceDrawer={selectedEvidenceDrawer}
              onClose={handleCloseEvidenceDrawer}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
