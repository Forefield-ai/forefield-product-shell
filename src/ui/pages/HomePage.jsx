import React, { useState } from 'react';

export default function HomePage({
  inputValue,
  onInputChange,
  onSubmit,
  onOpenTopicList,
  topicsCount,
  selectedFixtureKey,
  runtimeMode = 'local',
}) {
  const [showValidation, setShowValidation] = useState(false);
  const trimmedInput = typeof inputValue === 'string' ? inputValue.trim() : '';
  const isShortInput = trimmedInput.length > 0 && trimmedInput.length < 18;
  const runtimeModeIsApi = runtimeMode === 'api';

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!trimmedInput) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);
    onSubmit(trimmedInput);
  };

  return (
    <main className="flow-shell">
      <div className="flow-shell__inner">
        <section className="flow-page flow-page--home">
          <p className="flow-page__eyebrow">
            {runtimeModeIsApi ? 'API Backend Flow' : 'Local MVP Flow'}
          </p>
          <h1 className="flow-page__title">Start a new Topic from natural language</h1>
          <p className="flow-page__copy">
            Describe the demand area you want to monitor. The app will create a Topic Draft and
            route it through the selected product flow.
          </p>

          <form className="flow-form" onSubmit={handleSubmit}>
            <label className="flow-field">
              <span>Topic intent</span>
              <textarea
                value={inputValue}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder="Example: Teams want better ways to monitor privacy complaints across public forums."
                rows={6}
              />
            </label>

            {showValidation && !trimmedInput ? (
              <p className="flow-message flow-message--error">
                Enter a topic intent before creating a Topic Draft.
              </p>
            ) : null}

            {isShortInput ? (
              <p className="flow-message flow-message--warning">
                Short input is allowed, but a little more context will make the local draft feel
                more useful.
              </p>
            ) : null}

            <p className="flow-note">
              {runtimeModeIsApi
                ? 'API Backend mode creates a backend Initial Review run and loads the persisted workspace payload.'
                : 'Local Sample mode uses the selected bundled workspace sample.'}
              {!runtimeModeIsApi ? (
                <>
                  {' '}
                  New topics currently use the
                  <strong> {selectedFixtureKey}</strong> workspace fixture.
                </>
              ) : null}
            </p>

            <div className="flow-actions">
              <button className="flow-button flow-button--primary" type="submit">
                {runtimeModeIsApi ? 'Create Topic Draft for API Run' : 'Create Topic Draft'}
              </button>
              <button
                className="flow-button flow-button--secondary"
                type="button"
                onClick={onOpenTopicList}
                disabled={topicsCount === 0}
              >
                View Recent Topics
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
