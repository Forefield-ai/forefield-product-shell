import React from 'react';

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildEvidenceRead(summary) {
  const directionalCount = Number(summary?.directional_count || 0);
  const exploratoryCount = Number(summary?.exploratory_count || 0);

  if (directionalCount > 0 && exploratoryCount > 0) {
    return 'Some clusters have stronger corroboration, while others still need more careful verification.';
  }

  if (directionalCount > 0) {
    return 'The current review includes at least one cluster with stronger corroborating evidence.';
  }

  if (exploratoryCount > 0) {
    return 'The current review leans exploratory, so open the drawer before drawing conclusions.';
  }

  return 'Use the cluster summaries as a starting point, then verify supporting evidence in the drawer.';
}

export default function ReviewSummaryStrip({ reviewSummary }) {
  const clusterCount = Number(reviewSummary?.signal_cluster_count || 0);
  const evidenceCount = Number(reviewSummary?.curated_evidence_record_count || 0);
  const publicSourceRefCount = Number(reviewSummary?.public_source_ref_count || 0);
  const directionalCount = Number(reviewSummary?.directional_count || 0);
  const exploratoryCount = Number(reviewSummary?.exploratory_count || 0);
  const items = [
    ['Clusters ready', clusterCount],
    ['Evidence items', evidenceCount],
    ['Source links', publicSourceRefCount],
    ['Directional', directionalCount],
    ['Exploratory', exploratoryCount],
  ];
  const summaryLine = clusterCount > 0
    ? `${pluralize(clusterCount, 'cluster is', 'clusters are')} ready to review, backed by ${pluralize(evidenceCount, 'curated evidence item', 'curated evidence items')} and ${pluralize(publicSourceRefCount, 'public source link', 'public source links')}.`
    : 'No clusters are ready to review yet in this workspace snapshot.';

  return (
    <section className="summary-strip" aria-label="Initial review summary">
      <div className="summary-strip__lead">
        <div className="summary-strip__lead-copy">
          <p className="summary-strip__eyebrow">Initial Review</p>
          <h2 className="summary-strip__title">What this review surfaced so far</h2>
          <p className="summary-strip__copy">{summaryLine}</p>
          <p className="summary-strip__copy">{buildEvidenceRead(reviewSummary)}</p>
        </div>

        <div className="summary-strip__guidance">
          <span className="summary-strip__guidance-label">Suggested next step</span>
          <p className="summary-strip__guidance-copy">
            Start with the cluster that looks most relevant to your topic, then open the Evidence
            Drawer to verify what supports it before saving, watching, or hiding anything.
          </p>
        </div>
      </div>

      <div className="summary-strip__metrics">
        {items.map(([label, value]) => (
          <div className="summary-strip__item" key={label}>
            <span className="summary-strip__label">{label}</span>
            <strong className="summary-strip__value">{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
