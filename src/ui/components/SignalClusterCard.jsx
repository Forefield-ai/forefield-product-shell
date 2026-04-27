import React from 'react';
import ClusterActions from './ClusterActions';

export default function SignalClusterCard({
  signalClusterSection,
  isSelected,
  isWatched,
  isSaved,
  onSelect,
  onViewEvidence,
  onWatch,
  onUnwatch,
  onSave,
  onUnsave,
  onHide,
}) {
  return (
    <article
      className={`cluster-card${isSelected ? ' cluster-card--selected' : ''}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="cluster-card__header">
        <div className="cluster-card__header-copy">
          <p className="cluster-card__eyebrow">
            {signalClusterSection.confidence_display?.label || 'unlabeled'}
          </p>
          <h3>{signalClusterSection.headline}</h3>
        </div>
        <div className="cluster-card__header-side">
          <span className="cluster-card__badge">
            {signalClusterSection.evidence_count} evidence
          </span>
          {(isWatched || isSaved) ? (
            <div className="cluster-card__state-badges" aria-label="Cluster state">
              {isWatched ? <span className="cluster-card__state-badge">Watching</span> : null}
              {isSaved ? <span className="cluster-card__state-badge cluster-card__state-badge--saved">Saved</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className="cluster-card__summary">{signalClusterSection.summary}</p>
      <p className="cluster-card__confidence">
        {signalClusterSection.confidence_display?.summary}
      </p>

      {signalClusterSection.limitations?.length ? (
        <ul className="cluster-card__limitations">
          {signalClusterSection.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      ) : null}

      <div className="cluster-card__footer">
        <div className="cluster-card__footer-copy">
          <div className="cluster-card__footer-meta">
            <span className="cluster-card__stat">{signalClusterSection.source_links.length} linked sources</span>
            <span className="cluster-card__stat">
              {signalClusterSection.drawer_available ? 'Evidence drawer ready' : 'No drawer data'}
            </span>
          </div>

          <ClusterActions
            isWatched={isWatched}
            isSaved={isSaved}
            onWatch={onWatch}
            onUnwatch={onUnwatch}
            onSave={onSave}
            onUnsave={onUnsave}
            onHide={onHide}
          />
        </div>
        <button
          type="button"
          className="cluster-card__button"
          disabled={!signalClusterSection.drawer_available}
          onClick={(event) => {
            event.stopPropagation();
            onViewEvidence(signalClusterSection.cluster_id);
          }}
        >
          View Evidence
        </button>
      </div>
    </article>
  );
}
