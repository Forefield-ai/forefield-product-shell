import React from 'react';

function renderList(items) {
  if (!Array.isArray(items) || !items.length) {
    return null;
  }

  return items.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function renderMetaRows(rows) {
  return rows.filter((row) => typeof row.value === 'string' && row.value.trim());
}

export default function BriefPreview({
  briefState,
  onClose,
}) {
  const topicContext = briefState?.sections?.topic_context || null;
  const reviewSnapshot = briefState?.sections?.review_snapshot || null;
  const keySignalClusters = Array.isArray(briefState?.sections?.key_signal_clusters)
    ? briefState.sections.key_signal_clusters
    : [];
  const evidenceBackedTakeaways = Array.isArray(briefState?.sections?.evidence_backed_takeaways)
    ? briefState.sections.evidence_backed_takeaways
    : [];
  const caveatsAndLimitations = briefState?.sections?.caveats_and_limitations || null;
  const suggestedNextReviewActions = renderList(
    briefState?.sections?.suggested_next_review_actions
  );
  const isPreliminary = briefState?.eligibility?.brief_mode === 'preliminary';
  const topicContextRows = renderMetaRows([
    { label: 'Target audience', value: topicContext?.target_audience || '' },
    { label: 'Problem space', value: topicContext?.problem_space || '' },
    { label: 'Monitoring intent', value: topicContext?.monitoring_intent || '' },
  ]);
  const workspaceLimitations = renderList(caveatsAndLimitations?.workspace_limitations);

  return (
    <aside className="brief-preview" aria-label="Baseline brief preview">
      <div className="brief-preview__header">
        <div className="brief-preview__header-copy">
          <p className="brief-preview__eyebrow">Baseline Brief Preview</p>
          <h2>Baseline Brief</h2>
          <div className="brief-preview__pills">
            <span className="brief-preview__pill">
              {isPreliminary ? 'Preliminary brief' : 'Standard brief'}
            </span>
            <span className="brief-preview__pill">Read-only preview</span>
            <span className="brief-preview__pill">Evidence-grounded</span>
          </div>
        </div>
        <button className="brief-preview__close" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <section className="brief-preview__section">
        <p className="brief-preview__section-label">Topic Context</p>
        <h3>{topicContext?.topic_name || 'Current topic'}</h3>
        {topicContext?.topic_summary ? (
          <p className="brief-preview__copy">{topicContext.topic_summary}</p>
        ) : null}
        {topicContextRows.length ? (
          <dl className="brief-preview__meta">
            {topicContextRows.map((row) => (
              <div key={row.label} className="brief-preview__meta-item">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <section className="brief-preview__section">
        <p className="brief-preview__section-label">Review Snapshot</p>
        <h3>{isPreliminary ? 'Preliminary review state' : 'Current review state'}</h3>
        {reviewSnapshot?.summary ? (
          <p className="brief-preview__copy">{reviewSnapshot.summary}</p>
        ) : null}
        {reviewSnapshot?.preliminary_caveat ? (
          <p className="brief-preview__callout">{reviewSnapshot.preliminary_caveat}</p>
        ) : null}
        <dl className="brief-preview__meta">
          <div className="brief-preview__meta-item">
            <dt>Reviewable clusters</dt>
            <dd>{reviewSnapshot?.visible_cluster_count ?? 0}</dd>
          </div>
          <div className="brief-preview__meta-item">
            <dt>Evidence records</dt>
            <dd>{reviewSnapshot?.curated_evidence_record_count ?? 0}</dd>
          </div>
          <div className="brief-preview__meta-item">
            <dt>Source links</dt>
            <dd>{reviewSnapshot?.public_source_ref_count ?? 0}</dd>
          </div>
          <div className="brief-preview__meta-item">
            <dt>Saved items</dt>
            <dd>{(reviewSnapshot?.saved_cluster_count ?? 0) + (reviewSnapshot?.saved_evidence_count ?? 0)}</dd>
          </div>
        </dl>
      </section>

      <section className="brief-preview__section">
        <p className="brief-preview__section-label">Key Signal Clusters</p>
        <div className="brief-preview__cards">
          {keySignalClusters.map((cluster) => (
            <article key={cluster.cluster_id} className="brief-preview__card">
              <div className="brief-preview__card-header">
                <h3>{cluster.headline}</h3>
                {cluster.confidence_label ? (
                  <span className="brief-preview__badge">{cluster.confidence_label}</span>
                ) : null}
              </div>
              {cluster.summary ? (
                <p className="brief-preview__copy">{cluster.summary}</p>
              ) : null}
              {(cluster.is_saved || cluster.is_watched) ? (
                <div className="brief-preview__badges">
                  {cluster.is_saved ? <span className="brief-preview__badge">Saved</span> : null}
                  {cluster.is_watched ? <span className="brief-preview__badge">Watched</span> : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="brief-preview__section">
        <p className="brief-preview__section-label">Evidence-Backed Takeaways</p>
        {evidenceBackedTakeaways.length ? (
          <div className="brief-preview__cards">
            {evidenceBackedTakeaways.map((takeaway) => (
              <article key={takeaway.cluster_id} className="brief-preview__card">
                <div className="brief-preview__card-header">
                  <h3>{takeaway.headline}</h3>
                  {takeaway.confidence_label ? (
                    <span className="brief-preview__badge">{takeaway.confidence_label}</span>
                  ) : null}
                </div>
                {takeaway.takeaway_summary ? (
                  <p className="brief-preview__copy">{takeaway.takeaway_summary}</p>
                ) : null}
                {Array.isArray(takeaway.supporting_evidence) && takeaway.supporting_evidence.length ? (
                  <ul className="brief-preview__supporting-evidence">
                    {takeaway.supporting_evidence.map((evidence) => (
                      <li key={evidence.evidence_id}>
                        <p className="brief-preview__supporting-evidence-label">
                          {evidence.label || 'Supporting evidence'}
                        </p>
                        {evidence.summary ? (
                          <p className="brief-preview__supporting-evidence-summary">
                            {evidence.summary}
                          </p>
                        ) : null}
                        {evidence.source_url ? (
                          <a href={evidence.source_url} target="_blank" rel="noreferrer">
                            {evidence.source_url}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="brief-preview__empty-note">
            No evidence-backed takeaways are available in this preview.
          </p>
        )}
      </section>

      <section className="brief-preview__section">
        <p className="brief-preview__section-label">Caveats / Limitations</p>
        {workspaceLimitations?.length ? (
          <ul className="brief-preview__list">
            {workspaceLimitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        ) : null}
        {caveatsAndLimitations?.preliminary_caveat ? (
          <p className="brief-preview__callout">{caveatsAndLimitations.preliminary_caveat}</p>
        ) : null}
      </section>

      <section className="brief-preview__section">
        <p className="brief-preview__section-label">Suggested Next Review Actions</p>
        {suggestedNextReviewActions?.length ? (
          <ul className="brief-preview__list">
            {suggestedNextReviewActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        ) : (
          <p className="brief-preview__empty-note">
            No next-step suggestions are available in this preview.
          </p>
        )}
      </section>
    </aside>
  );
}
