import React from 'react';
import HiddenClustersPanel from './HiddenClustersPanel';
import SignalClusterCard from './SignalClusterCard';

export default function SignalClusterList({
  signalClusterSections,
  hiddenSignalClusterSections,
  selectedClusterId,
  copilotActionsById,
  onSelectCluster,
  onOpenEvidenceDrawer,
  onRunCopilotAction,
  onWatchCluster,
  onUnwatchCluster,
  onSaveCluster,
  onUnsaveCluster,
  onHideCluster,
  onUndoHideCluster,
  isClusterWatched,
  isClusterSaved,
}) {
  return (
    <section className="cluster-list" aria-label="Signal clusters">
      <div className="cluster-list__header">
        <div>
          <p className="cluster-list__eyebrow">Initial review path</p>
          <h2>Signal clusters ready for review</h2>
          <p>
            Scan the clusters first, then open the Evidence Drawer for the one that looks most
            relevant. Watch keeps a cluster on your monitoring radar, Save keeps useful review
            material close, and Not relevant trims the topic boundary.
          </p>
        </div>
      </div>
      <div className="cluster-list__items">
        {signalClusterSections.map((signalClusterSection) => (
          <SignalClusterCard
            key={signalClusterSection.cluster_id}
            signalClusterSection={signalClusterSection}
            isSelected={selectedClusterId === signalClusterSection.cluster_id}
            isWatched={Boolean(isClusterWatched?.(signalClusterSection.cluster_id))}
            isSaved={Boolean(isClusterSaved?.(signalClusterSection.cluster_id))}
            explainClusterAction={copilotActionsById?.explain_cluster || null}
            validationQuestionsAction={copilotActionsById?.generate_validation_questions || null}
            onSelect={() => onSelectCluster(signalClusterSection.cluster_id)}
            onViewEvidence={onOpenEvidenceDrawer}
            onRunCopilotAction={onRunCopilotAction}
            onWatch={() => onWatchCluster?.(signalClusterSection)}
            onUnwatch={() => onUnwatchCluster?.(signalClusterSection)}
            onSave={() => onSaveCluster?.(signalClusterSection)}
            onUnsave={() => onUnsaveCluster?.(signalClusterSection)}
            onHide={() => onHideCluster?.(signalClusterSection)}
          />
        ))}
      </div>

      <HiddenClustersPanel
        hiddenSignalClusterSections={hiddenSignalClusterSections}
        isClusterWatched={isClusterWatched}
        isClusterSaved={isClusterSaved}
        onUndoHideCluster={onUndoHideCluster}
      />
    </section>
  );
}
