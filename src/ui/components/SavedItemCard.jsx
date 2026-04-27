import React from 'react';

function formatSavedAt(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Saved in this session';
  }

  return value.replace('T', ' ').replace('Z', '');
}

export default function SavedItemCard({
  eyebrow,
  title,
  summary,
  savedAt,
  relatedLabel,
  sourceLink,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  tertiaryActionLabel,
  onTertiaryAction,
}) {
  return (
    <article className="saved-item-card">
      <div className="saved-item-card__header">
        <div>
          <p className="saved-item-card__eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="saved-item-card__timestamp">{formatSavedAt(savedAt)}</span>
      </div>

      {summary ? (
        <p className="saved-item-card__summary">{summary}</p>
      ) : null}

      {relatedLabel ? (
        <p className="saved-item-card__meta">
          <strong>Related cluster:</strong> {relatedLabel}
        </p>
      ) : null}

      {sourceLink ? (
        <a className="saved-item-card__link" href={sourceLink} target="_blank" rel="noreferrer">
          {sourceLink}
        </a>
      ) : null}

      <div className="saved-item-card__actions">
        {primaryActionLabel ? (
          <button
            type="button"
            className="saved-item-card__button saved-item-card__button--primary"
            onClick={onPrimaryAction}
          >
            {primaryActionLabel}
          </button>
        ) : null}

        {secondaryActionLabel ? (
          <button
            type="button"
            className="saved-item-card__button"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </button>
        ) : null}

        {tertiaryActionLabel ? (
          <button
            type="button"
            className="saved-item-card__button saved-item-card__button--warning"
            onClick={onTertiaryAction}
          >
            {tertiaryActionLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
