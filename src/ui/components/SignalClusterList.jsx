import React from 'react';
import SignalClusterCard from './SignalClusterCard';

export default function SignalClusterList({
  signalClusterSections,
  selectedClusterId,
  onSelectCluster,
  onOpenEvidenceDrawer,
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
            onSelect={() => onSelectCluster(signalClusterSection.cluster_id)}
            onViewEvidence={onOpenEvidenceDrawer}
          />
        ))}
      </div>
    </section>
  );
}
