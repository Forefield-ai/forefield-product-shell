import React, { useEffect, useState } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import ReviewSummaryStrip from './components/ReviewSummaryStrip';
import SourceCoverageStrip from './components/SourceCoverageStrip';
import SignalClusterList from './components/SignalClusterList';
import EmptySparseState from './components/EmptySparseState';
import EvidenceDrawer from './components/EvidenceDrawer';
import { buildTopicWorkspaceViewState } from '../product/read-models/build-topic-workspace-view-state';
import {
  initialActionState,
  isClusterHidden,
  isClusterSaved,
  isClusterWatched,
  isEvidenceSaved,
} from '../product/actions/user-action-state';
import {
  closeEvidenceDrawer,
  initialWorkspaceInteractionState,
  openEvidenceDrawer,
  selectCluster,
} from '../product/workspace/workspace-interaction-state';

function getClusterTitleSnapshot(clusterSection) {
  return (
    clusterSection?.headline
    || clusterSection?.title
    || clusterSection?.name
    || ''
  );
}

function getClusterSummarySnapshot(clusterSection) {
  return typeof clusterSection?.summary === 'string' ? clusterSection.summary : '';
}

function getClusterSourceLinksSnapshot(clusterSection) {
  return Array.isArray(clusterSection?.source_links)
    ? clusterSection.source_links.filter((link) => typeof link === 'string' && link.trim()).map((link) => link.trim())
    : [];
}

function getEvidenceItemId(item) {
  if (typeof item?.curated_evidence_record_id === 'string' && item.curated_evidence_record_id.trim()) {
    return item.curated_evidence_record_id.trim();
  }

  if (typeof item?.id === 'string' && item.id.trim()) {
    return item.id.trim();
  }

  if (typeof item?.url === 'string' && item.url.trim()) {
    return item.url.trim();
  }

  return '';
}

function getEvidenceTitleSnapshot(item) {
  return (
    (typeof item?.label === 'string' && item.label.trim())
    || (typeof item?.title === 'string' && item.title.trim())
    || (typeof item?.url === 'string' && item.url.trim())
    || ''
  );
}

function getEvidenceSummarySnapshot(item) {
  return (
    (typeof item?.summary === 'string' && item.summary.trim())
    || (typeof item?.excerpt === 'string' && item.excerpt.trim())
    || ''
  );
}

function getEvidenceSourceLinksSnapshot(item) {
  return typeof item?.url === 'string' && item.url.trim() ? [item.url.trim()] : [];
}

export default function TopicWorkspacePage({
  productMainline,
  actionState = initialActionState(),
  onWatchCluster,
  onUnwatchCluster,
  onSaveCluster,
  onUnsaveCluster,
  onHideCluster,
  onUndoHideCluster,
  onSaveEvidence,
  onUnsaveEvidence,
}) {
  const [interactionState, setInteractionState] = useState(() =>
    initialWorkspaceInteractionState()
  );
  const workspaceViewState = buildTopicWorkspaceViewState(productMainline);
  const allSignalClusterSections = Array.isArray(workspaceViewState?.signal_cluster_sections)
    ? workspaceViewState.signal_cluster_sections
    : [];
  const visibleSignalClusterSections = allSignalClusterSections.filter((signalClusterSection) => (
    !isClusterHidden(actionState, signalClusterSection.cluster_id)
  ));
  const hiddenSignalClusterSections = allSignalClusterSections.filter((signalClusterSection) => (
    isClusterHidden(actionState, signalClusterSection.cluster_id)
  ));
  const isDrawerClusterHidden = Boolean(
    interactionState.drawer_state === 'open'
    && interactionState.drawer_cluster_id
    && isClusterHidden(actionState, interactionState.drawer_cluster_id)
  );
  const drawerWorkspaceViewState = (
    interactionState.drawer_state === 'open'
    && interactionState.drawer_cluster_id
    && !isDrawerClusterHidden
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
  const handleWatchCluster = (signalClusterSection) => {
    onWatchCluster?.({
      clusterId: signalClusterSection.cluster_id,
    });
  };
  const handleUnwatchCluster = (signalClusterSection) => {
    onUnwatchCluster?.({
      clusterId: signalClusterSection.cluster_id,
    });
  };
  const handleSaveCluster = (signalClusterSection) => {
    onSaveCluster?.({
      clusterId: signalClusterSection.cluster_id,
      titleSnapshot: getClusterTitleSnapshot(signalClusterSection),
      summarySnapshot: getClusterSummarySnapshot(signalClusterSection),
      sourceLinksSnapshot: getClusterSourceLinksSnapshot(signalClusterSection),
    });
  };
  const handleUnsaveCluster = (signalClusterSection) => {
    onUnsaveCluster?.({
      clusterId: signalClusterSection.cluster_id,
    });
  };
  const handleHideCluster = (signalClusterSection) => {
    if (interactionState.drawer_state === 'open' && interactionState.drawer_cluster_id === signalClusterSection.cluster_id) {
      setInteractionState((currentState) => closeEvidenceDrawer(currentState));
    }

    onHideCluster?.({
      clusterId: signalClusterSection.cluster_id,
    });
  };
  const handleUndoHideCluster = (signalClusterSection) => {
    onUndoHideCluster?.({
      clusterId: signalClusterSection.cluster_id,
    });
  };
  const handleSaveEvidence = (item, clusterId) => {
    const evidenceId = getEvidenceItemId(item);

    if (!evidenceId) {
      return;
    }

    onSaveEvidence?.({
      clusterId,
      evidenceId,
      titleSnapshot: getEvidenceTitleSnapshot(item),
      summarySnapshot: getEvidenceSummarySnapshot(item),
      sourceLinksSnapshot: getEvidenceSourceLinksSnapshot(item),
    });
  };
  const handleUnsaveEvidence = (item, clusterId) => {
    const evidenceId = getEvidenceItemId(item);

    if (!evidenceId) {
      return;
    }

    onUnsaveEvidence?.({
      clusterId,
      evidenceId,
    });
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

  useEffect(() => {
    if (!isDrawerClusterHidden) {
      return;
    }

    setInteractionState((currentState) => closeEvidenceDrawer(currentState));
  }, [isDrawerClusterHidden]);

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
              signalClusterSections={visibleSignalClusterSections}
              hiddenSignalClusterSections={hiddenSignalClusterSections}
              selectedClusterId={interactionState.selected_cluster_id}
              onSelectCluster={handleSelectCluster}
              onOpenEvidenceDrawer={handleOpenEvidenceDrawer}
              onWatchCluster={handleWatchCluster}
              onUnwatchCluster={handleUnwatchCluster}
              onSaveCluster={handleSaveCluster}
              onUnsaveCluster={handleUnsaveCluster}
              onHideCluster={handleHideCluster}
              onUndoHideCluster={handleUndoHideCluster}
              isClusterWatched={(clusterId) => isClusterWatched(actionState, clusterId)}
              isClusterSaved={(clusterId) => isClusterSaved(actionState, clusterId)}
            />
          )}

          {!isEmptyState && interactionState.drawer_state === 'open' && selectedEvidenceDrawer ? (
            <EvidenceDrawer
              evidenceDrawer={selectedEvidenceDrawer}
              isEvidenceSaved={(evidenceId) => isEvidenceSaved(actionState, evidenceId)}
              onSaveEvidence={handleSaveEvidence}
              onUnsaveEvidence={handleUnsaveEvidence}
              onClose={handleCloseEvidenceDrawer}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
