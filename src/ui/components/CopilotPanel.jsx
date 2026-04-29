import React from 'react';

function getTraceRefHeading(traceRef) {
  if (!traceRef || typeof traceRef !== 'object') {
    return 'Trace reference';
  }

  if (traceRef.ref_kind === 'evidence_support') {
    return 'Supporting evidence';
  }

  if (traceRef.trace_kind === 'monitoring_gap') {
    return traceRef.headline || 'Monitoring gap';
  }

  return traceRef.headline || 'Supporting cluster';
}

function getTraceRefSummary(traceRef) {
  if (!traceRef || typeof traceRef !== 'object') {
    return '';
  }

  if (traceRef.ref_kind === 'evidence_support') {
    if (Number(traceRef.source_link_count || 0) > 0) {
      return `Trace to ${traceRef.evidence_count} evidence record${traceRef.evidence_count === 1 ? '' : 's'} across ${traceRef.source_link_count} public source link${traceRef.source_link_count === 1 ? '' : 's'}.`;
    }

    return `Trace to ${traceRef.evidence_count} evidence record${traceRef.evidence_count === 1 ? '' : 's'}; public source links are unavailable in the current snapshot.`;
  }

  if (traceRef.trace_kind === 'monitoring_gap') {
    return 'Return to this cluster as a monitoring gap. Product-visible evidence is unavailable in the current snapshot.';
  }

  return 'Return to the supporting cluster and open the current evidence context.';
}

function getTraceRefButtonLabel(traceRef) {
  if (!traceRef || typeof traceRef !== 'object') {
    return 'Open trace';
  }

  if (traceRef.ref_kind === 'evidence_support') {
    return 'View supporting evidence';
  }

  if (traceRef.trace_kind === 'monitoring_gap') {
    return 'View monitoring gap';
  }

  return 'View supporting evidence';
}

function renderList(items) {
  if (!Array.isArray(items) || !items.length) {
    return null;
  }

  return items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

export default function CopilotPanel({
  panelState,
  onClose,
  onOpenTraceRef,
}) {
  if (!panelState?.output) {
    return null;
  }

  const output = panelState.output;
  const validateNextItems = renderList(output.what_to_validate_next);
  const traceRefs = Array.isArray(output.trace_refs) ? output.trace_refs : [];
  const isUnavailable = output.status === 'unavailable';

  return (
    <aside className="copilot-panel" aria-label="Copilot guided action panel">
      <div className="copilot-panel__header">
        <div className="copilot-panel__header-copy">
          <p className="copilot-panel__eyebrow">Copilot guided action</p>
          <h2>{panelState.actionDisplayName || 'Copilot action'}</h2>
          <div className="copilot-panel__pills">
            <span className="copilot-panel__pill">Read-only output</span>
            <span className="copilot-panel__pill">Evidence-grounded</span>
            {output.preliminary ? (
              <span className="copilot-panel__pill copilot-panel__pill--warning">
                Preliminary / Limited evidence
              </span>
            ) : null}
            {isUnavailable ? (
              <span className="copilot-panel__pill copilot-panel__pill--warning">
                Unavailable
              </span>
            ) : null}
          </div>
        </div>
        <button className="copilot-panel__close" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      {panelState.sourceLabel ? (
        <p className="copilot-panel__source-note">{panelState.sourceLabel}</p>
      ) : null}

      <section className="copilot-panel__section">
        <p className="copilot-panel__section-label">What this currently supports</p>
        {output.what_this_currently_supports ? (
          <p className="copilot-panel__copy">{output.what_this_currently_supports}</p>
        ) : (
          <p className="copilot-panel__empty-note">
            This action is unavailable for the current review state.
          </p>
        )}
      </section>

      <section className="copilot-panel__section">
        <p className="copilot-panel__section-label">What remains limited</p>
        <p className="copilot-panel__callout">
          {output.unavailable_message || output.what_remains_limited || 'No limitation summary is available.'}
        </p>
      </section>

      <section className="copilot-panel__section">
        <p className="copilot-panel__section-label">What to validate next</p>
        {validateNextItems?.length ? (
          <ul className="copilot-panel__list">
            {validateNextItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="copilot-panel__empty-note">
            No follow-up validation steps are available for this action.
          </p>
        )}
      </section>

      {traceRefs.length ? (
        <section className="copilot-panel__section">
          <p className="copilot-panel__section-label">Trace references</p>
          <div className="copilot-panel__trace-items">
            {traceRefs.map((traceRef, index) => {
              const traceKey = (
                traceRef.ref_kind === 'evidence_support'
                  ? `evidence_support__${traceRef.supporting_cluster_id || 'unknown'}__${index}`
                  : `${traceRef.trace_kind || 'cluster'}__${traceRef.cluster_id || 'unknown'}__${index}`
              );

              return (
                <article key={traceKey} className="copilot-panel__trace-item">
                  <h3>{getTraceRefHeading(traceRef)}</h3>
                  <p className="copilot-panel__trace-summary">{getTraceRefSummary(traceRef)}</p>
                  <button
                    className="copilot-panel__trace-button"
                    type="button"
                    onClick={() => onOpenTraceRef?.(traceRef)}
                  >
                    {getTraceRefButtonLabel(traceRef)}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
