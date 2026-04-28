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
    ? 'No signal clusters are ready for review yet'
    : 'Signal coverage is limited right now';
  const description = isEmpty
    ? 'Forefield is holding back rather than forcing a conclusion from weak or missing signals. This topic can stay open until the next review snapshot surfaces something worth checking.'
    : 'There is still reviewable material here, but the current evidence basis is thin. Open the Evidence Drawer before relying on any cluster and treat limited coverage cautiously.';
  const sectionClassName = isEmpty
    ? 'empty-state empty-state--primary'
    : 'empty-state empty-state--notice';
  const guidanceItems = isEmpty
    ? [
      'Broaden the audience or problem space if the topic feels too narrow.',
      'Add competitors or adjacent alternatives if comparison context is missing.',
      'Retry later when more public signals are likely to be available.',
    ]
    : [
      'Start with the cluster that looks closest to your topic, then verify the supporting evidence before acting on it.',
      'Use Watch for clusters worth monitoring later, Save for useful evidence, and Not relevant to trim noisy scope.',
      'If coverage stays weak, refine the topic scope or revisit the review later.',
    ];

  return (
    <section className={sectionClassName} aria-label="Workspace state notice">
      <p className="empty-state__eyebrow">
        {isEmpty ? 'Empty Workspace' : 'Limited Coverage'}
      </p>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="empty-state__guidance">
        <p className="empty-state__guidance-label">
          {isEmpty ? 'What to do next' : 'How to use this review safely'}
        </p>
        <ul className="empty-state__guidance-list">
          {guidanceItems.map((guidanceItem) => (
            <li key={guidanceItem}>{guidanceItem}</li>
          ))}
        </ul>
      </div>
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
