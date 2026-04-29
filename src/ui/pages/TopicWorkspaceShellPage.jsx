import React, { useEffect, useMemo, useState } from 'react';
import PrototypeFallbackState from '../components/PrototypeFallbackState';
import SavedTab from '../components/SavedTab';
import TopicWorkspacePage from '../TopicWorkspacePage';
import { buildBaselineBriefState } from '../../product/read-models/build-baseline-brief-state.browser.mjs';
import { buildTopicWorkspaceViewState } from '../../product/read-models/build-topic-workspace-view-state.browser.mjs';
import {
  buildCopilotGuidedActionsState,
  buildCopilotGuidedActionMockOutput,
} from '../../product/copilot/build-copilot-guided-actions-state.browser.mjs';
import {
  getSavedClusters,
  getSavedEvidence,
  initialActionState,
  isClusterHidden,
} from '../../product/actions/user-action-state.browser.mjs';
import { TOPIC_STATUSES } from '../flow/local-topic-flow.browser.mjs';

const TOPIC_STATUS_LABELS = {
  draft: 'Topic Definition Draft',
  building: 'Initial Review Building',
  ready: 'Review Ready',
};

function formatTopicStatus(status) {
  if (typeof status !== 'string' || !status.trim()) {
    return 'Local status unavailable';
  }

  return TOPIC_STATUS_LABELS[status] || 'Local status unavailable';
}

export default function TopicWorkspaceShellPage({
  topic,
  topicActionState,
  productMainline,
  onWatchCluster,
  onUnwatchCluster,
  onSaveCluster,
  onUnsaveCluster,
  onHideCluster,
  onUndoHideCluster,
  onSaveEvidence,
  onUnsaveEvidence,
  onOpenTopicList,
  onCreateNewTopic,
}) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview');
  const [isBriefPreviewOpen, setIsBriefPreviewOpen] = useState(false);
  const [copilotPanelState, setCopilotPanelState] = useState(null);
  const [workspaceCommand, setWorkspaceCommand] = useState(null);
  const [savedTabNotice, setSavedTabNotice] = useState('');
  const currentActionState = topicActionState || initialActionState();
  const topicScope = useMemo(() => ({
    topic_id: topic?.id || '',
    topic_status: topic?.status || '',
    topic_name: topic?.draft?.topic_name || '',
    topic_summary: topic?.draft?.topic_summary || '',
    target_audience: topic?.draft?.target_audience || '',
    problem_space: topic?.draft?.problem_space || '',
    monitoring_intent: topic?.draft?.monitoring_intent || '',
    monitoring_run_id: topic?.runId || '',
  }), [topic]);
  const workspaceViewStateResult = useMemo(() => {
    if (!productMainline || typeof productMainline !== 'object' || Array.isArray(productMainline)) {
      return {
        ok: false,
      };
    }

    try {
      return {
        ok: true,
        value: buildTopicWorkspaceViewState(productMainline),
      };
    } catch (error) {
      return {
        ok: false,
      };
    }
  }, [productMainline]);
  const topicStatusIsKnown = Object.values(TOPIC_STATUSES).includes(topic?.status);
  const workspaceViewState = workspaceViewStateResult.ok ? workspaceViewStateResult.value : null;
  const briefState = useMemo(() => buildBaselineBriefState({
    topicScope,
    productMainline,
    actionState: currentActionState,
  }), [currentActionState, productMainline, topicScope]);
  const copilotGuidedActionsState = useMemo(() => buildCopilotGuidedActionsState({
    topicScope,
    productMainline,
    actionState: currentActionState,
    briefState,
  }), [briefState, currentActionState, productMainline, topicScope]);
  const briefPreviewIsEligible = Boolean(briefState?.eligibility?.is_eligible);

  useEffect(() => {
    setIsBriefPreviewOpen(false);
    setCopilotPanelState(null);
  }, [topic?.id]);

  useEffect(() => {
    if (activeWorkspaceTab !== 'overview') {
      if (isBriefPreviewOpen) {
        setIsBriefPreviewOpen(false);
      }

      if (copilotPanelState) {
        setCopilotPanelState(null);
      }
    }
  }, [activeWorkspaceTab, copilotPanelState, isBriefPreviewOpen]);

  useEffect(() => {
    if (!briefPreviewIsEligible && isBriefPreviewOpen) {
      setIsBriefPreviewOpen(false);
    }
  }, [briefPreviewIsEligible, isBriefPreviewOpen]);

  if (!topic) {
    return (
      <PrototypeFallbackState
        eyebrow="Local prototype route unavailable"
        title="This topic workspace preview is unavailable"
        copy="The local prototype could not find the topic linked to this workspace route. This is a prototype routing issue, not a market signal conclusion."
        detail="Return to Topics or start a new topic from Home to continue safely."
        variant="warning"
        actions={[
          { label: 'Back to Topics', onClick: onOpenTopicList, variant: 'secondary' },
          { label: 'New Topic', onClick: onCreateNewTopic, variant: 'primary' },
        ]}
      />
    );
  }

  if (!topicStatusIsKnown) {
    return (
      <PrototypeFallbackState
        eyebrow="Local status unavailable"
        title="This topic is in an unsupported prototype state"
        copy="The current local topic status is not recognized safely by this prototype shell. This is a lifecycle/status issue, not a market signal conclusion."
        detail="Return to Topics or start a new topic instead of treating this as a completed review, sparse signal, or failed baseline state."
        variant="warning"
        actions={[
          { label: 'Back to Topics', onClick: onOpenTopicList, variant: 'secondary' },
          { label: 'New Topic', onClick: onCreateNewTopic, variant: 'primary' },
        ]}
      />
    );
  }

  if (topic.status !== TOPIC_STATUSES.READY) {
    return (
      <PrototypeFallbackState
        eyebrow="Review not ready"
        title="This topic is not ready for the workspace yet"
        copy="The normal Topic Workspace only opens after the local prototype marks the review ready. This route is unavailable for draft or building states."
        detail="Return to Topics to reopen the draft or building flow instead of treating this as sparse signal, empty demand, or a finished review."
        variant="warning"
        actions={[
          { label: 'Back to Topics', onClick: onOpenTopicList, variant: 'secondary' },
          { label: 'New Topic', onClick: onCreateNewTopic, variant: 'primary' },
        ]}
      />
    );
  }

  if (!workspaceViewState) {
    return (
      <PrototypeFallbackState
        eyebrow="Prototype data unavailable"
        title="This review snapshot could not be rendered safely"
        copy="The local prototype could not build a safe workspace view for this topic. This is a prototype data issue, not a market signal conclusion."
        detail="Return to Topics or start a new topic instead of interpreting this as sparse signal, empty demand, or a normal no-evidence review state."
        variant="error"
        actions={[
          { label: 'Back to Topics', onClick: onOpenTopicList, variant: 'secondary' },
          { label: 'New Topic', onClick: onCreateNewTopic, variant: 'primary' },
        ]}
      />
    );
  }

  const signalClusterSections = Array.isArray(workspaceViewState?.signal_cluster_sections)
    ? workspaceViewState.signal_cluster_sections
    : [];
  const clusterSectionById = signalClusterSections.reduce((accumulator, signalClusterSection) => {
    accumulator[signalClusterSection.cluster_id] = signalClusterSection;
    return accumulator;
  }, {});
  const savedClusters = getSavedClusters(currentActionState);
  const savedEvidence = getSavedEvidence(currentActionState);

  const handleWatchCluster = ({ clusterId, metadata }) => {
    onWatchCluster?.({
      clusterId,
      metadata,
    });
  };

  const handleUnwatchCluster = ({ clusterId, metadata }) => {
    onUnwatchCluster?.({
      clusterId,
      metadata,
    });
  };

  const handleSaveCluster = ({
    clusterId,
    titleSnapshot,
    summarySnapshot,
    sourceLinksSnapshot,
    metadata,
  }) => {
    onSaveCluster?.({
      clusterId,
      titleSnapshot,
      summarySnapshot,
      sourceLinksSnapshot,
      metadata,
    });
  };

  const handleUnsaveCluster = ({ clusterId, metadata }) => {
    onUnsaveCluster?.({
      clusterId,
      metadata,
    });
  };

  const handleHideCluster = ({ clusterId, metadata }) => {
    onHideCluster?.({
      clusterId,
      metadata,
    });
  };

  const handleUndoHideCluster = ({ clusterId, metadata }) => {
    onUndoHideCluster?.({
      clusterId,
      metadata,
    });
  };

  const handleSaveEvidence = ({
    clusterId,
    evidenceId,
    titleSnapshot,
    summarySnapshot,
    sourceLinksSnapshot,
    metadata,
  }) => {
    onSaveEvidence?.({
      clusterId,
      evidenceId,
      titleSnapshot,
      summarySnapshot,
      sourceLinksSnapshot,
      metadata,
    });
  };

  const handleUnsaveEvidence = ({
    clusterId,
    evidenceId,
    metadata,
  }) => {
    onUnsaveEvidence?.({
      clusterId,
      evidenceId,
      metadata,
    });
  };

  const handleOpenOverviewCluster = (clusterId) => {
    setActiveWorkspaceTab('overview');
    setIsBriefPreviewOpen(false);
    setCopilotPanelState(null);
    setSavedTabNotice('');
    setWorkspaceCommand({
      commandId: `workspace_command__select_cluster__${clusterId}__${Date.now()}`,
      type: 'select_cluster',
      clusterId,
    });
  };

  const handleOpenOverviewEvidence = (clusterId) => {
    setActiveWorkspaceTab('overview');
    setIsBriefPreviewOpen(false);
    setCopilotPanelState(null);
    setSavedTabNotice('');
    setWorkspaceCommand({
      commandId: `workspace_command__open_evidence__${clusterId}__${Date.now()}`,
      type: 'open_evidence',
      clusterId,
    });
  };

  const ensureClusterVisible = (clusterId) => {
    if (!clusterId || !isClusterHidden(currentActionState, clusterId)) {
      return;
    }

    handleUndoHideCluster({
      clusterId,
      metadata: {
        source: 'saved_tab',
      },
    });
  };

  const handleOpenSavedCluster = (savedItem) => {
    const clusterId = savedItem?.cluster_id || savedItem?.source_object_id || '';
    const clusterSection = clusterSectionById[clusterId];

    if (!clusterSection) {
      setSavedTabNotice('This saved cluster is not available in the current workspace fixture.');
      return;
    }

    ensureClusterVisible(clusterId);
    handleOpenOverviewCluster(clusterId);
  };

  const handleViewSavedClusterEvidence = (savedItem) => {
    const clusterId = savedItem?.cluster_id || savedItem?.source_object_id || '';
    const clusterSection = clusterSectionById[clusterId];

    if (!clusterSection) {
      setSavedTabNotice('This saved cluster is not available in the current workspace fixture.');
      return;
    }

    if (!clusterSection.drawer_available) {
      setSavedTabNotice('Evidence drawer is not available for this saved cluster in the current workspace fixture.');
      handleOpenOverviewCluster(clusterId);
      return;
    }

    ensureClusterVisible(clusterId);
    handleOpenOverviewEvidence(clusterId);
  };

  const handleOpenSavedEvidence = (savedItem) => {
    const clusterId = savedItem?.cluster_id || '';
    const clusterSection = clusterSectionById[clusterId];

    if (!clusterSection) {
      setSavedTabNotice('This saved evidence item is no longer available in the current workspace fixture.');
      return;
    }

    ensureClusterVisible(clusterId);

    if (clusterSection.drawer_available) {
      handleOpenOverviewEvidence(clusterId);
      return;
    }

    setSavedTabNotice('Live drawer context is unavailable for this saved evidence item, but the saved snapshot remains here.');
    handleOpenOverviewCluster(clusterId);
  };

  const handleUnsaveSavedCluster = (savedItem) => {
    const clusterId = savedItem?.cluster_id || savedItem?.source_object_id || '';

    if (!clusterId) {
      return;
    }

    handleUnsaveCluster({
      clusterId,
      metadata: {
        source: 'saved_tab',
      },
    });
  };

  const handleUnsaveSavedEvidence = (savedItem) => {
    const clusterId = savedItem?.cluster_id || '';
    const evidenceId = savedItem?.source_object_id || '';

    if (!clusterId || !evidenceId) {
      return;
    }

    handleUnsaveEvidence({
      clusterId,
      evidenceId,
      metadata: {
        source: 'saved_tab',
      },
    });
  };

  const handleOpenBriefPreview = () => {
    if (!briefPreviewIsEligible) {
      return;
    }

    setCopilotPanelState(null);
    setIsBriefPreviewOpen(true);
  };

  const handleCloseBriefPreview = () => {
    setIsBriefPreviewOpen(false);
  };

  const handleOpenCopilotAction = ({ actionId, input = {}, sourceLabel = '' }) => {
    const actionDescriptor = Array.isArray(copilotGuidedActionsState?.actions)
      ? copilotGuidedActionsState.actions.find((action) => action.action_id === actionId)
      : null;

    if (!actionDescriptor) {
      return;
    }

    const output = buildCopilotGuidedActionMockOutput({
      topicScope,
      productMainline,
      actionState: currentActionState,
      briefState,
      actionId,
      input,
    });

    setActiveWorkspaceTab('overview');
    setSavedTabNotice('');
    setIsBriefPreviewOpen(false);
    setCopilotPanelState({
      actionId,
      actionDisplayName: actionDescriptor.display_name,
      input,
      output,
      sourceLabel,
    });
  };

  const handleCloseCopilotPanel = () => {
    setCopilotPanelState(null);
  };

  const handleOpenCopilotTraceRef = (traceRef) => {
    if (!traceRef || typeof traceRef !== 'object') {
      return;
    }

    setCopilotPanelState(null);
    setIsBriefPreviewOpen(false);
    setSavedTabNotice('');
    setActiveWorkspaceTab('overview');

    if (traceRef.ref_kind === 'evidence_support' && traceRef.supporting_cluster_id) {
      ensureClusterVisible(traceRef.supporting_cluster_id);
      handleOpenOverviewEvidence(traceRef.supporting_cluster_id);
      return;
    }

    if (traceRef.trace_kind === 'monitoring_gap' && traceRef.cluster_id) {
      ensureClusterVisible(traceRef.cluster_id);
      handleOpenOverviewCluster(traceRef.cluster_id);
      return;
    }

    if (traceRef.cluster_id) {
      ensureClusterVisible(traceRef.cluster_id);
      handleOpenOverviewEvidence(traceRef.cluster_id);
    }
  };

  return (
    <div className="workspace-shell-page">
      <section className="flow-shell">
        <div className="flow-shell__inner">
          <section className="flow-page flow-page--workspace-shell">
            <div className="flow-page__header">
              <div>
                <p className="flow-page__eyebrow">Topic Workspace Preview</p>
                <h1 className="flow-page__title">{topic.draft?.topic_name || 'Local topic'}</h1>
                <p className="flow-page__copy">
                  This prototype uses sample review data while preserving the topic flow. Review
                  the generated topic context below.
                </p>
              </div>
              <div className="flow-actions flow-actions--compact">
                <button className="flow-button flow-button--secondary" type="button" onClick={onOpenTopicList}>
                  Back to Topics
                </button>
                <button className="flow-button flow-button--primary" type="button" onClick={onCreateNewTopic}>
                  New Topic
                </button>
              </div>
            </div>

            <div className="flow-topic-shell-meta">
              <article className="flow-topic-shell-meta__card">
                <span>Review Status</span>
                <strong>{formatTopicStatus(topic.status)}</strong>
              </article>
              <article className="flow-topic-shell-meta__card">
                <span>Target Audience</span>
                <strong>{topic.draft?.target_audience || 'Not set'}</strong>
              </article>
              <article className="flow-topic-shell-meta__card">
                <span>Problem Space</span>
                <strong>{topic.draft?.problem_space || 'Not set'}</strong>
              </article>
              <article className="flow-topic-shell-meta__card">
                <span>Monitoring Intent</span>
                <strong>{topic.draft?.monitoring_intent || 'Not set'}</strong>
              </article>
            </div>

            <div className="workspace-shell-tabs" role="tablist" aria-label="Topic workspace views">
              <button
                type="button"
                role="tab"
                aria-selected={activeWorkspaceTab === 'overview'}
                className={`workspace-shell-tabs__button${activeWorkspaceTab === 'overview' ? ' workspace-shell-tabs__button--active' : ''}`}
                onClick={() => {
                  setActiveWorkspaceTab('overview');
                  setIsBriefPreviewOpen(false);
                  setCopilotPanelState(null);
                  setSavedTabNotice('');
                }}
              >
                Overview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeWorkspaceTab === 'saved'}
                className={`workspace-shell-tabs__button${activeWorkspaceTab === 'saved' ? ' workspace-shell-tabs__button--active' : ''}`}
                onClick={() => {
                  setIsBriefPreviewOpen(false);
                  setCopilotPanelState(null);
                  setActiveWorkspaceTab('saved');
                }}
              >
                Saved
              </button>
            </div>
          </section>
        </div>
      </section>

      <div hidden={activeWorkspaceTab !== 'overview'}>
        <TopicWorkspacePage
          key={topic.id}
          productMainline={productMainline}
          actionState={currentActionState}
          workspaceCommand={workspaceCommand}
          briefState={briefState}
          copilotGuidedActionsState={copilotGuidedActionsState}
          copilotPanelState={copilotPanelState}
          isBriefPreviewOpen={isBriefPreviewOpen}
          onOpenBriefPreview={handleOpenBriefPreview}
          onCloseBriefPreview={handleCloseBriefPreview}
          onRunCopilotAction={handleOpenCopilotAction}
          onOpenCopilotTraceRef={handleOpenCopilotTraceRef}
          onCloseCopilotPanel={handleCloseCopilotPanel}
          onWatchCluster={handleWatchCluster}
          onUnwatchCluster={handleUnwatchCluster}
          onSaveCluster={handleSaveCluster}
          onUnsaveCluster={handleUnsaveCluster}
          onHideCluster={handleHideCluster}
          onUndoHideCluster={handleUndoHideCluster}
          onSaveEvidence={handleSaveEvidence}
          onUnsaveEvidence={handleUnsaveEvidence}
        />
      </div>

      <div hidden={activeWorkspaceTab !== 'saved'}>
        <section className="flow-shell">
          <div className="flow-shell__inner">
            <SavedTab
              savedClusters={savedClusters}
              savedEvidence={savedEvidence}
              getClusterTitleById={(clusterId) => clusterSectionById[clusterId]?.headline || ''}
              canViewClusterEvidence={(savedItem) => {
                const clusterId = savedItem?.cluster_id || savedItem?.source_object_id || '';
                return Boolean(clusterSectionById[clusterId]?.drawer_available);
              }}
              onOpenSavedCluster={handleOpenSavedCluster}
              onViewSavedClusterEvidence={handleViewSavedClusterEvidence}
              onOpenSavedEvidence={handleOpenSavedEvidence}
              onUnsaveCluster={handleUnsaveSavedCluster}
              onUnsaveEvidence={handleUnsaveSavedEvidence}
              unavailableMessage={savedTabNotice}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
