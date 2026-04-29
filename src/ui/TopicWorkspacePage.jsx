import React, { useEffect, useRef, useState } from 'react';
import WorkspaceHeader from './components/WorkspaceHeader';
import ReviewSummaryStrip from './components/ReviewSummaryStrip';
import SourceCoverageStrip from './components/SourceCoverageStrip';
import SignalClusterList from './components/SignalClusterList';
import EmptySparseState from './components/EmptySparseState';
import EvidenceDrawer from './components/EvidenceDrawer';
import BriefPreview from './components/BriefPreview';
import CopilotPanel from './components/CopilotPanel';
import { buildTopicWorkspaceViewState } from '../product/read-models/build-topic-workspace-view-state.browser.mjs';
import {
  initialActionState,
  isClusterHidden,
  isClusterSaved,
  isClusterWatched,
  isEvidenceSaved,
} from '../product/actions/user-action-state.browser.mjs';
import {
  closeEvidenceDrawer,
  initialWorkspaceInteractionState,
  openEvidenceDrawer,
  selectCluster,
} from '../product/workspace/workspace-interaction-state.browser.mjs';

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
  workspaceCommand,
  briefState = null,
  copilotGuidedActionsState = null,
  copilotPanelState = null,
  isBriefPreviewOpen = false,
  onOpenBriefPreview,
  onCloseBriefPreview,
  onRunCopilotAction,
  onOpenCopilotTraceRef,
  onCloseCopilotPanel,
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
  const lastHandledWorkspaceCommandId = useRef(null);
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
  const briefPreviewIsEligible = Boolean(briefState?.eligibility?.is_eligible);
  const copilotActionsById = Array.isArray(copilotGuidedActionsState?.actions)
    ? copilotGuidedActionsState.actions.reduce((accumulator, action) => {
      accumulator[action.action_id] = action;
      return accumulator;
    }, {})
    : {};
  const workspaceCopilotActions = [
    copilotActionsById.summarize_caveats,
    copilotActionsById.suggest_what_to_watch_next,
  ].filter(Boolean);
  const briefTakeawaySupportAction = copilotActionsById.explain_brief_takeaway_support || null;
  const copilotPanelIsOpen = Boolean(copilotPanelState?.output);

  const handleSelectCluster = (clusterId) => {
    setInteractionState((currentState) => selectCluster(currentState, clusterId));
  };
  const handleOpenEvidenceDrawer = (clusterId) => {
    if (isBriefPreviewOpen) {
      onCloseBriefPreview?.();
    }

    onCloseCopilotPanel?.();
    setInteractionState((currentState) => openEvidenceDrawer(currentState, clusterId));
  };
  const handleOpenBriefCluster = (clusterId) => {
    if (isBriefPreviewOpen) {
      onCloseBriefPreview?.();
    }

    setInteractionState((currentState) => selectCluster(currentState, clusterId));
  };
  const handleOpenBriefMonitoringGap = (clusterId) => {
    if (isBriefPreviewOpen) {
      onCloseBriefPreview?.();
    }

    setInteractionState((currentState) => selectCluster(currentState, clusterId));
  };
  const handleRunWorkspaceCopilotAction = (actionId) => {
    if (interactionState.drawer_state === 'open') {
      setInteractionState((currentState) => closeEvidenceDrawer(currentState));
    }

    if (isBriefPreviewOpen) {
      onCloseBriefPreview?.();
    }

    onRunCopilotAction?.({
      actionId,
      input: {},
      sourceLabel: 'Triggered from the current review workspace context.',
    });
  };
  const handleRunClusterCopilotAction = (actionId, clusterId) => {
    if (interactionState.drawer_state === 'open') {
      setInteractionState((currentState) => closeEvidenceDrawer(currentState));
    }

    if (isBriefPreviewOpen) {
      onCloseBriefPreview?.();
    }

    setInteractionState((currentState) => selectCluster(currentState, clusterId));
    onRunCopilotAction?.({
      actionId,
      input: { cluster_id: clusterId },
      sourceLabel: 'Triggered from the selected signal cluster.',
    });
  };
  const handleRunBriefTakeawaySupport = (clusterId) => {
    if (interactionState.drawer_state === 'open') {
      setInteractionState((currentState) => closeEvidenceDrawer(currentState));
    }

    if (isBriefPreviewOpen) {
      onCloseBriefPreview?.();
    }

    setInteractionState((currentState) => selectCluster(currentState, clusterId));
    onRunCopilotAction?.({
      actionId: 'explain_brief_takeaway_support',
      input: { cluster_id: clusterId },
      sourceLabel: 'Triggered from the current Baseline Brief takeaway.',
    });
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

  useEffect(() => {
    if (!briefPreviewIsEligible && isBriefPreviewOpen) {
      onCloseBriefPreview?.();
    }
  }, [briefPreviewIsEligible, isBriefPreviewOpen, onCloseBriefPreview]);

  useEffect(() => {
    if (!workspaceCommand || !workspaceCommand.commandId || !workspaceCommand.clusterId) {
      return;
    }

    if (lastHandledWorkspaceCommandId.current === workspaceCommand.commandId) {
      return;
    }

    if (isClusterHidden(actionState, workspaceCommand.clusterId)) {
      return;
    }

    if (workspaceCommand.type === 'open_evidence') {
      if (isBriefPreviewOpen) {
        onCloseBriefPreview?.();
      }

      setInteractionState((currentState) => openEvidenceDrawer(currentState, workspaceCommand.clusterId));
      lastHandledWorkspaceCommandId.current = workspaceCommand.commandId;
      return;
    }

    if (workspaceCommand.type === 'select_cluster') {
      setInteractionState((currentState) => selectCluster(currentState, workspaceCommand.clusterId));
      lastHandledWorkspaceCommandId.current = workspaceCommand.commandId;
    }
  }, [actionState, workspaceCommand]);

  return (
    <main className="workspace-shell">
      <div className="workspace-shell__inner">
        <WorkspaceHeader
          workspaceHeader={workspaceViewState.workspace_header}
          topicDraftSummary={workspaceViewState.topic_draft_summary}
          briefEligibility={briefState?.eligibility || null}
          workspaceCopilotActions={workspaceCopilotActions}
          isBriefPreviewOpen={isBriefPreviewOpen}
          onOpenBriefPreview={() => {
            if (interactionState.drawer_state === 'open') {
              setInteractionState((currentState) => closeEvidenceDrawer(currentState));
            }

            onCloseCopilotPanel?.();
            onOpenBriefPreview?.();
          }}
          onCloseBriefPreview={onCloseBriefPreview}
          onRunCopilotAction={handleRunWorkspaceCopilotAction}
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
              copilotActionsById={copilotActionsById}
              onSelectCluster={handleSelectCluster}
              onOpenEvidenceDrawer={handleOpenEvidenceDrawer}
              onRunCopilotAction={handleRunClusterCopilotAction}
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

          {!isEmptyState && isBriefPreviewOpen && briefPreviewIsEligible ? (
            <BriefPreview
              briefState={briefState}
              briefTakeawaySupportAction={briefTakeawaySupportAction}
              onClose={onCloseBriefPreview}
              onExplainTakeawaySupport={handleRunBriefTakeawaySupport}
              onOpenCluster={handleOpenBriefCluster}
              onViewSupportingEvidence={handleOpenEvidenceDrawer}
              onViewMonitoringGap={handleOpenBriefMonitoringGap}
            />
          ) : null}

          {!isEmptyState && !isBriefPreviewOpen && interactionState.drawer_state !== 'open' && copilotPanelIsOpen ? (
            <CopilotPanel
              panelState={copilotPanelState}
              onClose={onCloseCopilotPanel}
              onOpenTraceRef={onOpenCopilotTraceRef}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
