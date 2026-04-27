import React from 'react';

export default function SourceCoverageStrip({ sourceCoverageStrip }) {
  return (
    <section className="coverage-strip" aria-label="Source coverage">
      <div className="coverage-strip__header">
        <h2>Source Coverage</h2>
        <p className="coverage-strip__summary">
          {sourceCoverageStrip.public_source_ref_count} public refs across{' '}
          {sourceCoverageStrip.unique_public_source_ref_count} unique URLs
        </p>
      </div>
      <div className="coverage-strip__clusters">
        {sourceCoverageStrip.cluster_coverage.map((clusterCoverage, index) => (
          <article className="coverage-strip__cluster" key={clusterCoverage.cluster_id}>
            <div className="coverage-strip__cluster-header">
              <p className="coverage-strip__cluster-eyebrow">Cluster {index + 1}</p>
              <h3 className="coverage-strip__cluster-id" title={clusterCoverage.cluster_id}>
                {clusterCoverage.cluster_id}
              </h3>
            </div>
            <div className="coverage-strip__cluster-metrics">
              <div className="coverage-strip__metric">
                <span className="coverage-strip__metric-value">{clusterCoverage.evidence_count}</span>
                <span className="coverage-strip__metric-label">Evidence items</span>
              </div>
              <div className="coverage-strip__metric">
                <span className="coverage-strip__metric-value">{clusterCoverage.public_source_ref_count}</span>
                <span className="coverage-strip__metric-label">Public refs</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
