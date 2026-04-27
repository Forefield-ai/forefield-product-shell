import React from 'react';
import HiddenClustersPanel from './HiddenClustersPanel';
import SignalClusterCard from './SignalClusterCard';

export default function SignalClusterList({
  signalClusterSections,
  hiddenSignalClusterSections,
  selectedClusterId,
  onSelectCluster,
  onOpenEvidenceDrawer,
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
        <h2>Signal Clusters</h2>
        <p>Select a cluster to focus the workspace state. View Evidence opens the drawer.</p>
      </div>
      <div className="cluster-list__items">
        {signalClusterSections.map((signalClusterSection) => (
          <SignalClusterCard
            key={signalClusterSection.cluster_id}
            signalClusterSection={signalClusterSection}
            isSelected={selectedClusterId === signalClusterSection.cluster_id}
            isWatched={Boolean(isClusterWatched?.(signalClusterSection.cluster_id))}
            isSaved={Boolean(isClusterSaved?.(signalClusterSection.cluster_id))}
            onSelect={() => onSelectCluster(signalClusterSection.cluster_id)}
            onViewEvidence={onOpenEvidenceDrawer}
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
