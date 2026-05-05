import React from 'react';

const FIXTURE_OPTIONS = [
  { value: 'rich', label: 'Rich review snapshot' },
  { value: 'minimal', label: 'Minimal review snapshot' },
  { value: 'sparse', label: 'Sparse review snapshot' },
  { value: 'no_evidence', label: 'No-evidence cluster' },
  { value: 'grouped_evidence', label: 'Grouped evidence review snapshot' },
  { value: 'empty', label: 'Empty review snapshot' },
];

const BASELINE_SCENARIO_OPTIONS = [
  { value: 'default', label: 'Standard baseline path' },
  { value: 'baseline_failed', label: 'Unavailable baseline sample' },
  { value: 'baseline_stuck', label: 'Delayed baseline sample' },
];

export default function DebugFixtureSelector({
  selectedFixtureKey,
  onSelectFixture,
  selectedBaselineScenarioKey,
  onSelectBaselineScenario,
  fixtureNotice = '',
}) {
  return (
    <section className="fixture-selector" aria-label="Local demo controls">
      <div className="fixture-selector__inner">
        <div>
          <p className="fixture-selector__eyebrow">Local Demo</p>
          <h1 className="fixture-selector__title">Sample workspace data</h1>
          <p className="fixture-selector__copy">
            Choose a sample review snapshot and baseline path for the local workspace walkthrough.
          </p>
        </div>

        <div className="fixture-selector__controls">
          <label className="fixture-selector__control" htmlFor="fixture-selector">
            <span>Sample</span>
            <select
              id="fixture-selector"
              value={selectedFixtureKey}
              onChange={(event) => onSelectFixture(event.target.value)}
            >
              {FIXTURE_OPTIONS.map((fixtureOption) => (
                <option key={fixtureOption.value} value={fixtureOption.value}>
                  {fixtureOption.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fixture-selector__control" htmlFor="baseline-scenario-selector">
            <span>Baseline scenario</span>
            <select
              id="baseline-scenario-selector"
              value={selectedBaselineScenarioKey}
              onChange={(event) => onSelectBaselineScenario(event.target.value)}
            >
              {BASELINE_SCENARIO_OPTIONS.map((scenarioOption) => (
                <option key={scenarioOption.value} value={scenarioOption.value}>
                  {scenarioOption.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {fixtureNotice ? (
          <p className="flow-message flow-message--warning">{fixtureNotice}</p>
        ) : null}
      </div>
    </section>
  );
}
