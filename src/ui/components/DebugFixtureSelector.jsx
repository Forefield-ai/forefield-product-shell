import React from 'react';

const FIXTURE_OPTIONS = [
  { value: 'rich', label: 'Rich review snapshot' },
  { value: 'minimal', label: 'Minimal review snapshot' },
  { value: 'sparse', label: 'Sparse review snapshot' },
  { value: 'no_evidence', label: 'Cluster without evidence' },
  { value: 'empty', label: 'Empty review snapshot' },
];

export default function DebugFixtureSelector({ selectedFixtureKey, onSelectFixture }) {
  return (
    <section className="fixture-selector" aria-label="Development preview controls">
      <div className="fixture-selector__inner">
        <div>
          <p className="fixture-selector__eyebrow">Development Preview</p>
          <h1 className="fixture-selector__title">Sample workspace data</h1>
          <p className="fixture-selector__copy">
            Switch between sample review snapshots while testing the prototype workspace.
          </p>
        </div>

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
      </div>
    </section>
  );
}
