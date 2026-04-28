import React from 'react';

const FIXTURE_OPTIONS = [
  { value: 'rich', label: 'Rich review snapshot' },
  { value: 'minimal', label: 'Minimal review snapshot' },
  { value: 'sparse', label: 'Sparse review snapshot' },
  { value: 'no_evidence', label: 'No-evidence cluster' },
  { value: 'empty', label: 'Empty review snapshot' },
];

const BASELINE_SCENARIO_OPTIONS = [
  { value: 'default', label: 'Standard local baseline path' },
  { value: 'baseline_failed', label: 'Failed local baseline scenario' },
  { value: 'baseline_stuck', label: 'Stuck local baseline scenario' },
];

export default function DebugFixtureSelector({
  selectedFixtureKey,
  onSelectFixture,
  selectedBaselineScenarioKey,
  onSelectBaselineScenario,
  fixtureNotice = '',
}) {
  return (
    <section className="fixture-selector" aria-label="Development preview controls">
      <div className="fixture-selector__inner">
        <div>
          <p className="fixture-selector__eyebrow">Development Preview</p>
          <h1 className="fixture-selector__title">Sample workspace data</h1>
          <p className="fixture-selector__copy">
            Switch between sample review snapshots and local-only baseline scenarios while testing
            the prototype workspace.
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
