import React from 'react';
import TopicWorkspacePage from '../TopicWorkspacePage';
import {
  hideCluster,
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
          </section>
        </div>
      </section>

      <TopicWorkspacePage
        key={topic.id}
        productMainline={productMainline}
        actionState={topicActionState}
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
  );
}
