import React from 'react';
import SavedItemCard from './SavedItemCard';

export default function SavedTab({
  savedClusters,
  savedEvidence,
  getClusterTitleById,
  canViewClusterEvidence,
  onOpenSavedCluster,
  onViewSavedClusterEvidence,
  onOpenSavedEvidence,
  onUnsaveCluster,
  onUnsaveEvidence,
  unavailableMessage,
}) {
  const hasSavedClusters = Array.isArray(savedClusters) && savedClusters.length > 0;
  const hasSavedEvidence = Array.isArray(savedEvidence) && savedEvidence.length > 0;
  const isEmpty = !hasSavedClusters && !hasSavedEvidence;

  return (
    <section className="saved-tab" aria-label="Saved items">
      <div className="saved-tab__header">
        <div>
          <p className="saved-tab__eyebrow">Topic-level Saved</p>
          <h2>Saved</h2>
          <p className="saved-tab__copy">
            Saved items stay local to this topic and this browser session.
          </p>
        </div>
      </div>

      {unavailableMessage ? (
        <div className="saved-tab__notice" role="status">
          {unavailableMessage}
        </div>
      ) : null}

      {isEmpty ? (
        <div className="saved-tab__empty">
          <h3>No saved items yet</h3>
          <p>Saved clusters and saved evidence will appear here for the current topic.</p>
        </div>
      ) : null}

      {hasSavedClusters ? (
        <section className="saved-tab__section" aria-label="Saved clusters">
          <div className="saved-tab__section-header">
            <h3>Saved Clusters</h3>
            <p>Open a saved cluster to return to its review context.</p>
          </div>

          <div className="saved-tab__items">
            {savedClusters.map((savedItem) => (
              <SavedItemCard
                key={savedItem.id}
                eyebrow="Saved Cluster"
                title={savedItem.title_snapshot || savedItem.source_object_id}
                summary={savedItem.summary_snapshot}
                savedAt={savedItem.saved_at}
                primaryActionLabel="Open Cluster"
                onPrimaryAction={() => onOpenSavedCluster?.(savedItem)}
                secondaryActionLabel={canViewClusterEvidence?.(savedItem) ? 'View Evidence' : undefined}
                onSecondaryAction={canViewClusterEvidence?.(savedItem) ? () => onViewSavedClusterEvidence?.(savedItem) : undefined}
                tertiaryActionLabel="Unsave"
                onTertiaryAction={() => onUnsaveCluster?.(savedItem)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {hasSavedEvidence ? (
        <section className="saved-tab__section" aria-label="Saved evidence">
          <div className="saved-tab__section-header">
            <h3>Saved Evidence</h3>
            <p>Open a saved evidence item to return to its cluster drawer if available.</p>
          </div>

          <div className="saved-tab__items">
            {savedEvidence.map((savedItem) => (
              <SavedItemCard
                key={savedItem.id}
                eyebrow="Saved Evidence"
                title={savedItem.title_snapshot || savedItem.source_object_id}
                summary={savedItem.summary_snapshot}
                savedAt={savedItem.saved_at}
                relatedLabel={getClusterTitleById?.(savedItem.cluster_id) || savedItem.cluster_id}
                sourceLink={Array.isArray(savedItem.source_links_snapshot) ? savedItem.source_links_snapshot[0] : ''}
                primaryActionLabel="Open Evidence"
                onPrimaryAction={() => onOpenSavedEvidence?.(savedItem)}
                tertiaryActionLabel="Unsave"
                onTertiaryAction={() => onUnsaveEvidence?.(savedItem)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="saved-tab__section saved-tab__section--deferred" aria-label="Saved briefs">
        <div className="saved-tab__section-header">
          <h3>Saved Briefs</h3>
          <p>Saved Briefs will appear here after Baseline Brief generation is added.</p>
        </div>
      </section>
    </section>
  );
}
