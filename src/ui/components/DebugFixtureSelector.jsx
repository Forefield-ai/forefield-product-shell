import React from 'react';

export default function DebugFixtureSelector({ selectedFixtureKey, onSelectFixture }) {
  return (
    <section className="fixture-selector" aria-label="Local fixture selector">
      <div className="fixture-selector__inner">
        <div>
          <p className="fixture-selector__eyebrow">Local Demo</p>
          <h1 className="fixture-selector__title">Workspace Fixture Selector</h1>
          <p className="fixture-selector__copy">
            Switch between local product mainline fixtures. The UI still renders only
            TopicWorkspaceViewState-derived data.
          </p>
        </div>

        <label className="fixture-selector__control" htmlFor="fixture-selector">
          <span>Fixture</span>
          <select
            id="fixture-selector"
            value={selectedFixtureKey}
            onChange={(event) => onSelectFixture(event.target.value)}
          >
            <option value="minimal">minimal</option>
            <option value="rich">rich</option>
          </select>
        </label>
      </div>
    </section>
  );
}
