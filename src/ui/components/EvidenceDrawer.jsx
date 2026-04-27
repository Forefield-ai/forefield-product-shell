import React from 'react';

export default function EvidenceDrawer({ evidenceDrawer, onClose }) {
  return (
    <aside className="evidence-drawer" aria-label="Evidence drawer">
      <div className="evidence-drawer__header">
        <div>
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
              <p className="evidence-drawer__item-label">{item.label}</p>
              <p className="evidence-drawer__item-summary">{item.summary}</p>
              <a href={item.url} target="_blank" rel="noreferrer">
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
              <a href={sourceLink} target="_blank" rel="noreferrer">
                {sourceLink}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
