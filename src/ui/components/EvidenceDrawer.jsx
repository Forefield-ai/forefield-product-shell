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

function getSourceHostLabel(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return '';
  }

  try {
    return new URL(url).host.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

function formatConfidenceLabel(label) {
  if (typeof label !== 'string' || !label.trim()) {
    return '';
  }

  return label
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildWhyIncludedCopy(item, clusterHeadline) {
  if (typeof item?.summary === 'string' && item.summary.trim()) {
    if (typeof clusterHeadline === 'string' && clusterHeadline.trim()) {
      return `Included to help verify the cluster "${clusterHeadline}" against a public source.`;
    }

    return 'Included to help verify the selected cluster against a public source.';
  }

  return 'Included as part of the current public-source evidence set for this cluster.';
}

function getVisibleGroupedSections(evidenceDrawer) {
  if (!evidenceDrawer?.grouped_evidence_summary?.has_grouped_evidence) {
    return [];
  }

  return Array.isArray(evidenceDrawer.grouped_evidence_sections)
    ? evidenceDrawer.grouped_evidence_sections.filter((section) => Number(section?.count || 0) > 0)
    : [];
}

export default function EvidenceDrawer({
  evidenceDrawer,
  isEvidenceSaved,
  onSaveEvidence,
  onUnsaveEvidence,
  onClose,
}) {
  const clusterId = evidenceDrawer?.signal_cluster_ref?.signal_cluster_id || '';
  const clusterHeadline = evidenceDrawer?.display_summary?.headline || '';
  const groupedSections = getVisibleGroupedSections(evidenceDrawer);
  const hasGroupedEvidence = groupedSections.length > 0;

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

      <p className="evidence-drawer__review-note">
        Use these sources to verify what supports this cluster before deciding what to save,
        watch, or trim from scope.
      </p>

      {evidenceDrawer.confidence_display ? (
        <section className="evidence-drawer__section">
          <h3>Review confidence</h3>
          <p className="evidence-drawer__confidence-label">
            {formatConfidenceLabel(evidenceDrawer.confidence_display.label)}
          </p>
          <p>{evidenceDrawer.confidence_display.summary}</p>
        </section>
      ) : null}

      {evidenceDrawer.limitations?.length ? (
        <section className="evidence-drawer__section">
          <h3>Caveats to keep in mind</h3>
          <ul className="evidence-drawer__limitations">
            {evidenceDrawer.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasGroupedEvidence ? (
        <section className="evidence-drawer__section">
          <h3>Grouped evidence</h3>
          <div className="evidence-drawer__grouped-sections">
            {groupedSections.map((section) => (
              <details
                className="evidence-drawer__grouped-section"
                key={section.section_id}
                open={section.default_expanded}
              >
                <summary className="evidence-drawer__grouped-summary">
                  <span>{section.title}</span>
                  <span>{section.count}</span>
                </summary>
                <p className="evidence-drawer__grouped-description">
                  {section.role_description}
                </p>
                {section.caveat_label ? (
                  <p className="evidence-drawer__grouped-caveat">{section.caveat_label}</p>
                ) : null}
                <ul className="evidence-drawer__items">
                  {section.items.map((item) => (
                    <li className="evidence-drawer__item" key={`${section.section_id}__${item.id}`}>
                      <div className="evidence-drawer__item-body">
                        <div className="evidence-drawer__item-block">
                          <p className="evidence-drawer__item-block-label">{item.label}</p>
                          <p className="evidence-drawer__item-summary">
                            {item.summary || 'No summary is available for this grouped evidence item yet.'}
                          </p>
                        </div>
                        <div className="evidence-drawer__item-block">
                          <p className="evidence-drawer__item-block-label">Evidence role</p>
                          <p className="evidence-drawer__item-note">
                            {section.is_direct_evidence && item.counts_toward_direct_evidence
                              ? 'Direct support'
                              : section.caveat_label}
                          </p>
                        </div>
                        {item.caveats?.length ? (
                          <div className="evidence-drawer__item-block">
                            <p className="evidence-drawer__item-block-label">Caveats</p>
                            <ul className="evidence-drawer__item-caveats">
                              {item.caveats.map((caveat) => (
                                <li key={`${item.id}__${caveat}`}>{caveat}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>
      ) : (
        <section className="evidence-drawer__section">
          <h3>Evidence to verify</h3>
          <ul className="evidence-drawer__items">
            {evidenceDrawer.evidence_items.map((item) => (
              <li className="evidence-drawer__item" key={item.id}>
                <div className="evidence-drawer__item-header">
                  <div>
                    <p className="evidence-drawer__item-label">{item.label}</p>
                    {getSourceHostLabel(item.url) ? (
                      <p className="evidence-drawer__item-source">
                        Source: {getSourceHostLabel(item.url)}
                      </p>
                    ) : null}
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
                <div className="evidence-drawer__item-body">
                  <div className="evidence-drawer__item-block">
                    <p className="evidence-drawer__item-block-label">Evidence summary</p>
                    <p className="evidence-drawer__item-summary">{item.summary || 'No summary is available for this source yet.'}</p>
                  </div>
                  <div className="evidence-drawer__item-block">
                    <p className="evidence-drawer__item-block-label">Why this is included</p>
                    <p className="evidence-drawer__item-why">
                      {buildWhyIncludedCopy(item, clusterHeadline)}
                    </p>
                  </div>
                  {evidenceDrawer.confidence_display || evidenceDrawer.limitations?.length ? (
                    <div className="evidence-drawer__item-block">
                      <p className="evidence-drawer__item-block-label">Review note</p>
                      {evidenceDrawer.confidence_display ? (
                        <p className="evidence-drawer__item-note">
                          {formatConfidenceLabel(evidenceDrawer.confidence_display.label)} confidence. Verify alongside the current cluster caveats.
                        </p>
                      ) : null}
                      {evidenceDrawer.limitations?.length ? (
                        <ul className="evidence-drawer__item-caveats">
                          {evidenceDrawer.limitations.map((limitation) => (
                            <li key={`${item.id}__${limitation}`}>{limitation}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  {item.url ? (
                    <div className="evidence-drawer__item-block">
                      <p className="evidence-drawer__item-block-label">Open source link</p>
                      <a className="evidence-drawer__item-link" href={item.url} target="_blank" rel="noreferrer">
                        {item.url}
                      </a>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
