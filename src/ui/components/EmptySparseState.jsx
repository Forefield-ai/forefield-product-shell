import React from 'react';

const REASON_LABELS = {
  no_signal_clusters: 'No signal clusters',
  no_curated_evidence_records: 'No curated evidence',
  no_public_source_refs: 'No public source refs',
};

function formatReason(reason) {
  if (REASON_LABELS[reason]) {
    return REASON_LABELS[reason];
  }

  if (typeof reason !== 'string') {
    return 'Unknown limitation';
  }

  return reason
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function EmptySparseState({ emptyOrSparseState }) {
  if (!emptyOrSparseState?.is_empty && !emptyOrSparseState?.is_sparse) {
    return null;
  }

  const isEmpty = Boolean(emptyOrSparseState.is_empty);
  const reasons = Array.isArray(emptyOrSparseState.reasons)
    ? emptyOrSparseState.reasons
    : [];
  const reasonLabels = reasons.map((reason) => ({
    id: reason,
    label: formatReason(reason),
  }));
  const title = isEmpty
    ? 'No signal clusters to review yet'
    : 'Workspace coverage is currently limited';
  const description = isEmpty
    ? 'This workspace does not currently include any signal clusters. Product review can stay paused until the next bounded input produces displayable signals.'
    : 'Current workspace data is sparse, but the existing review content remains usable and Evidence Drawer interaction stays available.';
  const sectionClassName = isEmpty
    ? 'empty-state empty-state--primary'
    : 'empty-state empty-state--notice';

  return (
    <section className={sectionClassName} aria-label="Workspace state notice">
      <p className="empty-state__eyebrow">
        {isEmpty ? 'Empty Workspace' : 'Limited Coverage'}
      </p>
      <h2>{title}</h2>
      <p>{description}</p>
      {reasonLabels.length ? (
        <ul className="empty-state__reasons" aria-label="Workspace state reasons">
          {reasonLabels.map((reason) => (
            <li className="empty-state__reason" key={reason.id}>
              {reason.label}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
