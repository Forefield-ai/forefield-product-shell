import React from 'react';
import ClusterActions from './ClusterActions';

function formatConfidenceLabel(label) {
  if (typeof label !== 'string' || !label.trim()) {
    return 'Review needed';
  }

  const normalizedLabel = label.trim().toLowerCase();

  if (normalizedLabel === 'directional') {
    return 'Stronger current signal';
  }

  if (normalizedLabel === 'exploratory') {
    return 'Emerging signal';
  }

  return normalizedLabel
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getEvidenceBasisSummary(signalClusterSection) {
  const evidenceCount = Number(signalClusterSection?.evidence_count || 0);
  const sourceLinkCount = Array.isArray(signalClusterSection?.source_links)
    ? signalClusterSection.source_links.length
    : 0;

  return `${pluralize(evidenceCount, 'evidence item', 'evidence items')} and ${pluralize(sourceLinkCount, 'source link', 'source links')} available for review.`;
}

function getClusterReviewGuidance(signalClusterSection) {
  const normalizedLabel = typeof signalClusterSection?.confidence_display?.label === 'string'
    ? signalClusterSection.confidence_display.label.trim().toLowerCase()
    : '';

  if (normalizedLabel === 'directional') {
    return 'This cluster has stronger current support and is a good place to start your review.';
  }

  if (normalizedLabel === 'exploratory') {
    return 'This cluster is worth checking, but the current evidence basis looks more exploratory.';
  }

  return 'Use the Evidence Drawer to verify what currently supports this cluster.';
}

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
            {formatConfidenceLabel(signalClusterSection.confidence_display?.label)}
          </p>
          <h3>{signalClusterSection.headline}</h3>
        </div>
        <div className="cluster-card__header-side">
          <span className="cluster-card__badge">
            {pluralize(Number(signalClusterSection.evidence_count || 0), 'evidence item', 'evidence items')}
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
      <div className="cluster-card__detail-block">
        <span className="cluster-card__detail-label">Why review this</span>
        <p className="cluster-card__confidence">
          {getClusterReviewGuidance(signalClusterSection)}
        </p>
        {signalClusterSection.confidence_display?.summary ? (
          <p className="cluster-card__confidence-subcopy">
            {signalClusterSection.confidence_display.summary}
          </p>
        ) : null}
      </div>

      {signalClusterSection.limitations?.length ? (
        <div className="cluster-card__detail-block cluster-card__detail-block--warning">
          <span className="cluster-card__detail-label">Review carefully</span>
          <ul className="cluster-card__limitations">
            {signalClusterSection.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="cluster-card__footer">
        <div className="cluster-card__footer-copy">
          <div className="cluster-card__footer-meta">
            <span className="cluster-card__stat">{getEvidenceBasisSummary(signalClusterSection)}</span>
            <span className="cluster-card__stat">
              {signalClusterSection.drawer_available
                ? 'Open the drawer to verify supporting sources'
                : 'No evidence drawer data available yet'}
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
          <p className="cluster-card__actions-note">
            Watch keeps this cluster on your radar, Save keeps it available in this topic, and Not
            relevant removes it from the active review without deleting the evidence basis.
          </p>
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
