import React from 'react';

export default function SourceCoverageStrip({ sourceCoverageStrip }) {
  return (
    <section className="coverage-strip" aria-label="Source coverage">
      <div className="coverage-strip__header">
        <h2>Source Coverage</h2>
        <p>
          {sourceCoverageStrip.public_source_ref_count} public refs across{' '}
          {sourceCoverageStrip.unique_public_source_ref_count} unique URLs
        </p>
      </div>
      <div className="coverage-strip__clusters">
        {sourceCoverageStrip.cluster_coverage.map((clusterCoverage) => (
          <article className="coverage-strip__cluster" key={clusterCoverage.cluster_id}>
            <h3>{clusterCoverage.cluster_id}</h3>
            <p>{clusterCoverage.evidence_count} evidence items</p>
            <p>{clusterCoverage.public_source_ref_count} public refs</p>
          </article>
        ))}
      </div>
    </section>
  );
}
