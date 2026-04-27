import React, { useMemo, useState } from 'react';
import SavedTab from '../components/SavedTab';
import TopicWorkspacePage from '../TopicWorkspacePage';
import { buildTopicWorkspaceViewState } from '../../product/read-models/build-topic-workspace-view-state';
import {
  getSavedClusters,
  getSavedEvidence,
  hideCluster,
  initialActionState,
  isClusterHidden,
  saveCluster,
  saveEvidence,
  undoHideCluster,
  unsaveCluster,
  unsaveEvidence,
  unwatchCluster,
  watchCluster,
} from '../../product/actions/user-action-state';

export default function TopicWorkspaceShellPage({
  topic,
  topicActionState,
  productMainline,
  onUpdateTopicActionState,
  onOpenTopicList,
  onCreateNewTopic,
}) {
  if (!topic) {
    return null;
  }

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview');
  const [workspaceCommand, setWorkspaceCommand] = useState(null);
  const [savedTabNotice, setSavedTabNotice] = useState('');
  const currentActionState = topicActionState || initialActionState();
  const workspaceViewState = useMemo(
    () => buildTopicWorkspaceViewState(productMainline),
    [productMainline]
  );
  const signalClusterSections = Array.isArray(workspaceViewState?.signal_cluster_sections)
    ? workspaceViewState.signal_cluster_sections
    : [];
  const clusterSectionById = signalClusterSections.reduce((accumulator, signalClusterSection) => {
    accumulator[signalClusterSection.cluster_id] = signalClusterSection;
    return accumulator;
  }, {});
  const savedClusters = getSavedClusters(currentActionState);
  const savedEvidence = getSavedEvidence(currentActionState);

  const applyTopicActionUpdate = (updater) => {
    if (typeof onUpdateTopicActionState !== 'function') {
      return;
    }

    onUpdateTopicActionState(topic.id, updater);
  };

  const handleWatchCluster = ({ clusterId, metadata }) => {
    applyTopicActionUpdate((currentState) => watchCluster(currentState, {
      localTopicId: topic.id,
      clusterId,
      metadata,
    }));
  };

  const handleUnwatchCluster = ({ clusterId, metadata }) => {
    applyTopicActionUpdate((currentState) => unwatchCluster(currentState, {
      localTopicId: topic.id,
      clusterId,
      metadata,
    }));
  };

  const handleSaveCluster = ({
    clusterId,
    titleSnapshot,
    summarySnapshot,
    sourceLinksSnapshot,
    metadata,
  }) => {
    applyTopicActionUpdate((currentState) => saveCluster(currentState, {
      localTopicId: topic.id,
      clusterId,
      titleSnapshot,
      summarySnapshot,
      sourceLinksSnapshot,
      metadata,
    }));
  };

  const handleUnsaveCluster = ({ clusterId, metadata }) => {
    applyTopicActionUpdate((currentState) => unsaveCluster(currentState, {
      localTopicId: topic.id,
      clusterId,
      metadata,
    }));
  };

  const handleHideCluster = ({ clusterId, metadata }) => {
    applyTopicActionUpdate((currentState) => hideCluster(currentState, {
      localTopicId: topic.id,
      clusterId,
      metadata,
    }));
  };

  const handleUndoHideCluster = ({ clusterId, metadata }) => {
    applyTopicActionUpdate((currentState) => undoHideCluster(currentState, {
      localTopicId: topic.id,
      clusterId,
      metadata,
    }));
  };

  const handleSaveEvidence = ({
    clusterId,
    evidenceId,
    titleSnapshot,
    summarySnapshot,
    sourceLinksSnapshot,
    metadata,
  }) => {
    applyTopicActionUpdate((currentState) => saveEvidence(currentState, {
      localTopicId: topic.id,
      clusterId,
      evidenceId,
      titleSnapshot,
      summarySnapshot,
      sourceLinksSnapshot,
      metadata,
    }));
  };

  const handleUnsaveEvidence = ({
    clusterId,
    evidenceId,
    metadata,
  }) => {
    applyTopicActionUpdate((currentState) => unsaveEvidence(currentState, {
      localTopicId: topic.id,
      clusterId,
      evidenceId,
      metadata,
    }));
  };

  const handleOpenOverviewCluster = (clusterId) => {
    setActiveWorkspaceTab('overview');
    setSavedTabNotice('');
    setWorkspaceCommand({
      commandId: `workspace_command__select_cluster__${clusterId}__${Date.now()}`,
      type: 'select_cluster',
      clusterId,
    });
  };

  const handleOpenOverviewEvidence = (clusterId) => {
    setActiveWorkspaceTab('overview');
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

  return (
    <div className="workspace-shell-page">
      <section className="flow-shell">
        <div className="flow-shell__inner">
          <section className="flow-page flow-page--workspace-shell">
            <div className="flow-page__header">
              <div>
                <p className="flow-page__eyebrow">Local Topic Shell</p>
                <h1 className="flow-page__title">{topic.draft?.topic_name || 'Local topic'}</h1>
                <p className="flow-page__copy">
                  Confirmed local Topic Draft metadata stays in this shell layer. The Topic
                  Workspace below still runs on fixture-driven product view state.
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
                <span>Status</span>
                <strong>{topic.status}</strong>
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
                onClick={() => setActiveWorkspaceTab('saved')}
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
