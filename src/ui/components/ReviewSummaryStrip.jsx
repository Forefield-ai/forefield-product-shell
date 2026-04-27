import React from 'react';

export default function ReviewSummaryStrip({ reviewSummary }) {
  const items = [
    ['Clusters', reviewSummary.signal_cluster_count],
    ['Evidence', reviewSummary.curated_evidence_record_count],
    ['Public Sources', reviewSummary.public_source_ref_count],
    ['Directional', reviewSummary.directional_count],
    ['Exploratory', reviewSummary.exploratory_count],
  ];

  return (
    <section className="summary-strip" aria-label="Review summary">
      {items.map(([label, value]) => (
        <div className="summary-strip__item" key={label}>
          <span className="summary-strip__label">{label}</span>
          <strong className="summary-strip__value">{value}</strong>
        </div>
      ))}
    </section>
  );
}
