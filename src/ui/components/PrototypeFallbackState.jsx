import React from 'react';

export default function PrototypeFallbackState({
  eyebrow = 'Local prototype fallback',
  title,
  copy,
  detail,
  variant = 'warning',
  actions = [],
}) {
  const panelClassName = variant === 'error'
    ? 'flow-status-panel flow-status-panel--error'
    : 'flow-status-panel flow-status-panel--warning';

  return (
    <main className="flow-shell">
      <div className="flow-shell__inner">
        <section className="flow-page">
          <div className={panelClassName}>
            <p className="flow-status-panel__eyebrow">{eyebrow}</p>
            <h1 className="flow-status-panel__title">{title}</h1>
            <p className="flow-status-panel__copy">{copy}</p>
            {detail ? (
              <p className="flow-status-panel__copy">{detail}</p>
            ) : null}
          </div>

          {actions.length ? (
            <div className="flow-actions">
              {actions.map((action) => (
                <button
                  key={action.label}
                  className={`flow-button ${
                    action.variant === 'primary'
                      ? 'flow-button--primary'
                      : 'flow-button--secondary'
                  }`}
                  type="button"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
