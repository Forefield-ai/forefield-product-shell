import React from 'react';

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function describeCoverage(sourceCoverageStrip) {
  const uniqueUrlCount = Number(sourceCoverageStrip?.unique_public_source_ref_count || 0);
  const publicSourceRefCount = Number(sourceCoverageStrip?.public_source_ref_count || 0);
  const clusterCoverage = Array.isArray(sourceCoverageStrip?.cluster_coverage)
    ? sourceCoverageStrip.cluster_coverage
    : [];
  const evidenceCount = clusterCoverage.reduce((sum, cluster) =>
    sum + Number(cluster?.display_evidence_count ?? cluster?.evidence_count ?? 0), 0);
  const thinClusters = clusterCoverage.filter((cluster) => Number(
    cluster?.display_evidence_count ?? cluster?.evidence_count ?? 0
  ) <= 1).length;

  if (evidenceCount > 0 && publicSourceRefCount === 0) {
    return `${pluralize(evidenceCount, 'evidence summary is', 'evidence summaries are')} available across clusters. Public source links are not exposed in this snapshot, so treat the summaries as review material rather than source-level verification.`;
  }

  let summary = `${pluralize(publicSourceRefCount, 'public source link is', 'public source links are')} available across ${pluralize(uniqueUrlCount, 'unique URL', 'unique URLs')}.`;

  if (thinClusters > 0) {
    summary += ` ${pluralize(thinClusters, 'cluster has', 'clusters have')} a thinner evidence basis, so review those drawers carefully before drawing conclusions.`;
  } else if (clusterCoverage.length > 0) {
    summary += ' Each cluster has at least some evidence available for source verification.';
  }

  return summary;
}

function describeClusterStrength(clusterCoverage) {
  const evidenceCount = Number(clusterCoverage?.display_evidence_count ?? clusterCoverage?.evidence_count ?? 0);
  const publicSourceRefCount = Number(clusterCoverage?.public_source_ref_count || 0);

  if (evidenceCount === 0) {
    return 'Limited coverage';
  }

  if (publicSourceRefCount === 0) {
    return 'Evidence available';
  }

  if (evidenceCount === 1 || publicSourceRefCount === 1) {
    return 'Thin evidence basis';
  }

  return 'Evidence basis available';
}

function describeClusterGuidance(clusterCoverage) {
  const evidenceCount = Number(clusterCoverage?.display_evidence_count ?? clusterCoverage?.evidence_count ?? 0);
  const publicSourceRefCount = Number(clusterCoverage?.public_source_ref_count || 0);

  if (evidenceCount === 0) {
    return 'Open the drawer carefully if evidence becomes available; the current basis is very limited.';
  }

  if (publicSourceRefCount === 0) {
    return 'Evidence is available in the drawer, but public source links are not exposed in this local snapshot.';
  }

  if (evidenceCount === 1 || publicSourceRefCount === 1) {
    return 'This cluster is reviewable, but the current evidence basis is thin and should be treated cautiously.';
  }

  return 'This cluster has multiple supporting links available for review in the drawer.';
}

export default function SourceCoverageStrip({ sourceCoverageStrip }) {
  const clusterCoverage = Array.isArray(sourceCoverageStrip?.cluster_coverage)
    ? sourceCoverageStrip.cluster_coverage
    : [];

  return (
    <section className="coverage-strip" aria-label="Source coverage">
      <div className="coverage-strip__header">
        <div>
          <p className="coverage-strip__eyebrow">Signal availability</p>
          <h2>Evidence basis across clusters</h2>
          <p className="coverage-strip__summary">{describeCoverage(sourceCoverageStrip)}</p>
        </div>

        <div className="coverage-strip__guidance">
          <span className="coverage-strip__guidance-label">Review note</span>
          <p className="coverage-strip__guidance-copy">
            Evidence coverage helps you judge how much support each cluster has. Open Evidence Drawer
            before relying on clusters with thinner or link-limited coverage.
          </p>
        </div>
      </div>
      <div className="coverage-strip__clusters">
        {clusterCoverage.map((clusterCoverageEntry, index) => (
          <article className="coverage-strip__cluster" key={clusterCoverageEntry.cluster_id}>
            <div className="coverage-strip__cluster-header">
              <p className="coverage-strip__cluster-eyebrow">Signal Cluster {index + 1}</p>
              <h3 className="coverage-strip__cluster-title">
                {describeClusterStrength(clusterCoverageEntry)}
              </h3>
              <p className="coverage-strip__cluster-copy">
                {describeClusterGuidance(clusterCoverageEntry)}
              </p>
            </div>
            <div className="coverage-strip__cluster-metrics">
              <div className="coverage-strip__metric">
                <span className="coverage-strip__metric-value">
                  {clusterCoverageEntry.display_evidence_count ?? clusterCoverageEntry.evidence_count}
                </span>
                <span className="coverage-strip__metric-label">
                  {clusterCoverageEntry.display_evidence_metric_label || 'Evidence items'}
                </span>
              </div>
              <div className="coverage-strip__metric">
                <span className="coverage-strip__metric-value">{clusterCoverageEntry.public_source_ref_count}</span>
                <span className="coverage-strip__metric-label">Public links</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
