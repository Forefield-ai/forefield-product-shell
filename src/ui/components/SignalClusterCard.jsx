import React from 'react';

export default function SignalClusterCard({ signalClusterSection, isSelected, onSelect }) {
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
        <div>
          <p className="cluster-card__eyebrow">
            {signalClusterSection.confidence_display?.label || 'unlabeled'}
          </p>
          <h3>{signalClusterSection.headline}</h3>
        </div>
        <span className="cluster-card__badge">
          {signalClusterSection.evidence_count} evidence
        </span>
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
        <span>{signalClusterSection.source_links.length} linked sources</span>
        {/* P4C will wire this button to openEvidenceDrawer. */}
        <button
          type="button"
          className="cluster-card__button"
          disabled
          onClick={(event) => event.stopPropagation()}
        >
          View Evidence (P4C)
        </button>
      </div>
    </article>
  );
}
