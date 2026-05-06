import React from 'react';

const RUNTIME_MODE_OPTIONS = [
  {
    value: 'local',
    label: 'Local Sample',
    copy: 'Uses bundled product samples.',
  },
  {
    value: 'api',
    label: 'API Backend',
    copy: 'Runs through the configured decision-core API.',
  },
];

export default function RuntimeModeSelector({
  mode = 'local',
  onChange,
  apiBaseUrl = '',
}) {
  return (
    <section className="runtime-mode-selector" aria-label="Runtime mode">
      <div className="runtime-mode-selector__inner">
        <div>
          <p className="fixture-selector__eyebrow">Runtime Mode</p>
          <h1 className="fixture-selector__title">Product flow source</h1>
          <p className="fixture-selector__copy">
            Choose whether this page runs from local samples or the backend API.
          </p>
          {mode === 'api' ? (
            <p className="runtime-mode-selector__meta">
              Backend: {apiBaseUrl || 'http://127.0.0.1:8787'}
            </p>
          ) : null}
        </div>

        <div className="runtime-mode-selector__options" role="radiogroup" aria-label="Product flow source">
          {RUNTIME_MODE_OPTIONS.map((option) => {
            const isActive = option.value === mode;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`runtime-mode-selector__option${
                  isActive ? ' runtime-mode-selector__option--active' : ''
                }`}
                onClick={() => onChange?.(option.value)}
              >
                <span>{option.label}</span>
                <small>{option.copy}</small>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
