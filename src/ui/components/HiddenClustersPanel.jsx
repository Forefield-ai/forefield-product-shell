import React from 'react';

export default function HiddenClustersPanel({
  hiddenSignalClusterSections,
  isClusterWatched,
  isClusterSaved,
  onUndoHideCluster,
}) {
  if (!Array.isArray(hiddenSignalClusterSections) || hiddenSignalClusterSections.length === 0) {
    return null;
  }

  return (
    <section className="hidden-clusters-panel" aria-label="Hidden clusters">
      <div className="hidden-clusters-panel__header">
        <h3>Hidden clusters</h3>
        <p>Use Undo to restore a hidden cluster to the main review list.</p>
      </div>

      <div className="hidden-clusters-panel__items">
        {hiddenSignalClusterSections.map((signalClusterSection) => {
          const clusterId = signalClusterSection.cluster_id;
          const watched = isClusterWatched?.(clusterId);
          const saved = isClusterSaved?.(clusterId);

          return (
            <article className="hidden-clusters-panel__item" key={clusterId}>
              <div className="hidden-clusters-panel__copy">
                <p className="hidden-clusters-panel__eyebrow">Hidden</p>
                <h4>{signalClusterSection.headline}</h4>
                <div className="hidden-clusters-panel__badges">
                  {watched ? <span className="hidden-clusters-panel__badge">Watching</span> : null}
                  {saved ? <span className="hidden-clusters-panel__badge hidden-clusters-panel__badge--saved">Saved</span> : null}
                </div>
              </div>
              <button
                type="button"
                className="hidden-clusters-panel__button"
                onClick={() => onUndoHideCluster?.(signalClusterSection)}
              >
                Undo
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
