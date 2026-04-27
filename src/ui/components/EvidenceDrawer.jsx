import React from 'react';

function getEvidenceItemId(item) {
  if (typeof item?.curated_evidence_record_id === 'string' && item.curated_evidence_record_id.trim()) {
    return item.curated_evidence_record_id.trim();
  }

  if (typeof item?.id === 'string' && item.id.trim()) {
    return item.id.trim();
  }

  if (typeof item?.url === 'string' && item.url.trim()) {
    return item.url.trim();
  }

  return '';
}

export default function EvidenceDrawer({
  evidenceDrawer,
  isEvidenceSaved,
  onSaveEvidence,
  onUnsaveEvidence,
  onClose,
}) {
  const clusterId = evidenceDrawer?.signal_cluster_ref?.signal_cluster_id || '';

  return (
    <aside className="evidence-drawer" aria-label="Evidence drawer">
      <div className="evidence-drawer__header">
        <div className="evidence-drawer__header-copy">
          <p className="evidence-drawer__eyebrow">Evidence Drawer</p>
          <h2>{evidenceDrawer.display_summary?.headline || 'Selected cluster evidence'}</h2>
        </div>
        <button
          type="button"
          className="evidence-drawer__close"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <p className="evidence-drawer__summary">
        {evidenceDrawer.display_summary?.summary}
      </p>

      {evidenceDrawer.confidence_display ? (
        <section className="evidence-drawer__section">
          <h3>Confidence</h3>
          <p className="evidence-drawer__confidence-label">
            {evidenceDrawer.confidence_display.label}
          </p>
          <p>{evidenceDrawer.confidence_display.summary}</p>
        </section>
      ) : null}

      {evidenceDrawer.limitations?.length ? (
        <section className="evidence-drawer__section">
          <h3>Limitations</h3>
          <ul className="evidence-drawer__limitations">
            {evidenceDrawer.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="evidence-drawer__section">
        <h3>Evidence Items</h3>
        <ul className="evidence-drawer__items">
          {evidenceDrawer.evidence_items.map((item) => (
            <li className="evidence-drawer__item" key={item.id}>
              <div className="evidence-drawer__item-header">
                <div>
                  <p className="evidence-drawer__item-label">{item.label}</p>
                  {isEvidenceSaved?.(getEvidenceItemId(item)) ? (
                    <span className="evidence-drawer__item-badge">Saved</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="evidence-drawer__item-button"
                  onClick={() => {
                    const evidenceId = getEvidenceItemId(item);

                    if (!evidenceId) {
                      return;
                    }

                    if (isEvidenceSaved?.(evidenceId)) {
                      onUnsaveEvidence?.(item, clusterId);
                      return;
                    }

                    onSaveEvidence?.(item, clusterId);
                  }}
                >
                  {isEvidenceSaved?.(getEvidenceItemId(item)) ? 'Unsave' : 'Save Evidence'}
                </button>
              </div>
              <p className="evidence-drawer__item-summary">{item.summary}</p>
              <a className="evidence-drawer__item-link" href={item.url} target="_blank" rel="noreferrer">
                {item.url}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="evidence-drawer__section">
        <h3>Source Links</h3>
        <ul className="evidence-drawer__links">
          {evidenceDrawer.source_links.map((sourceLink) => (
            <li key={sourceLink}>
              <a className="evidence-drawer__source-link" href={sourceLink} target="_blank" rel="noreferrer">
                {sourceLink}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
