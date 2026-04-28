import React, { useEffect, useState } from 'react';
import {
  BASELINE_BUILDING_STAGES,
  getLocalBaselineScenario,
  resolveNextBaselineStageIndex,
  shouldAutoCompleteBaselineBuild,
} from '../flow/local-topic-flow.browser.mjs';

const STAGE_DELAY_MS = 420;

export default function BaselineBuildingPage({
  topic,
  onComplete,
  onBackHome,
  onOpenTopicList,
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const baselineScenario = getLocalBaselineScenario(
    topic?.baselineScenarioKey || topic?.fixtureKey
  );
  const terminalStageIndex = Math.max(
    Math.min(
      baselineScenario.terminal_stage_index,
      BASELINE_BUILDING_STAGES.length - 1
    ),
    0
  );
  const isTerminalNonSuccessState = !baselineScenario.auto_complete && stageIndex >= terminalStageIndex;
  const isFailedState = isTerminalNonSuccessState && baselineScenario.outcome === 'failed';
  const isStuckState = isTerminalNonSuccessState && baselineScenario.outcome === 'stuck';

  const pageEyebrow = isFailedState
    ? 'Local Baseline Failed'
    : isStuckState
      ? 'Local Baseline Delayed'
      : 'Local Baseline Building';
  const pageTitle = isFailedState
    ? 'Initial Review could not be completed'
    : isStuckState
      ? 'Initial Review stopped advancing'
      : 'Preparing your Initial Topic Map';
  const pageCopy = isFailedState
    ? `${topic?.draft?.topic_name || 'Current topic'} did not complete the local prototype review run. This is a build failure in the prototype flow, not a conclusion about demand or signal strength.`
    : isStuckState
      ? `${topic?.draft?.topic_name || 'Current topic'} did not finish advancing through the local prototype review flow. This delayed state is separate from sparse signal or limited evidence.`
      : `${topic?.draft?.topic_name || 'Current topic'} is moving through a local demo build flow. No real source collection is running.`;
  const statusPanelTitle = isFailedState
    ? 'Prototype review run failed before the Initial Topic Map was ready.'
    : 'Prototype review run stopped before the Initial Topic Map was ready.';
  const statusPanelCopy = isFailedState
    ? 'You can return to Home to start again or open Recent Topics to inspect the local topic record. The current review snapshot was not completed.'
    : 'You can return to Home to start again or open Recent Topics to revisit this local topic later. The review run did not finish, so no workspace output was produced.';
  const footerNote = isFailedState
    ? 'Local prototype failure. This state is not the same as sparse signal, empty results, or no evidence.'
    : isStuckState
      ? 'Local prototype delay. This state is not the same as sparse signal, empty results, or no evidence.'
      : 'Local demo progress. No real source collection is running.';

  useEffect(() => {
    if (shouldAutoCompleteBaselineBuild({
      currentStageIndex: stageIndex,
      fixtureKey: topic?.baselineScenarioKey || topic?.fixtureKey,
    })) {
      onComplete();
      return undefined;
    }

    const nextStageIndex = resolveNextBaselineStageIndex({
      currentStageIndex: stageIndex,
      fixtureKey: topic?.baselineScenarioKey || topic?.fixtureKey,
    });

    if (nextStageIndex === stageIndex) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      setStageIndex(nextStageIndex);
    }, STAGE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [onComplete, stageIndex, topic?.baselineScenarioKey, topic?.fixtureKey]);

  return (
    <main className="flow-shell">
      <div className="flow-shell__inner">
        <section className="flow-page flow-page--progress">
          <p className="flow-page__eyebrow">{pageEyebrow}</p>
          <h1 className="flow-page__title">{pageTitle}</h1>
          <p className="flow-page__copy">{pageCopy}</p>

          {isTerminalNonSuccessState ? (
            <section
              className={`flow-status-panel${isFailedState ? ' flow-status-panel--error' : ' flow-status-panel--warning'}`}
              aria-label={isFailedState ? 'Baseline failed fallback' : 'Baseline delayed fallback'}
            >
              <p className="flow-status-panel__eyebrow">
                {isFailedState ? 'Prototype failure state' : 'Prototype delayed state'}
              </p>
              <h2 className="flow-status-panel__title">{statusPanelTitle}</h2>
              <p className="flow-status-panel__copy">{statusPanelCopy}</p>
            </section>
          ) : null}

          <ol className="flow-stage-list" aria-label="Baseline building stages">
            {BASELINE_BUILDING_STAGES.map((stage, index) => {
              const isCurrent = index === stageIndex;
              const isComplete = index < stageIndex;
              const isTerminalCurrent = isCurrent && isTerminalNonSuccessState;
              const statusLabel = isComplete
                ? 'Complete'
                : isTerminalCurrent
                  ? isFailedState
                    ? 'Stopped'
                    : 'Delayed'
                  : isCurrent
                    ? 'In progress'
                    : 'Queued';

              return (
                <li
                  className={`flow-stage-list__item${isCurrent ? ' flow-stage-list__item--current' : ''}${isComplete ? ' flow-stage-list__item--complete' : ''}`}
                  key={stage}
                >
                  <span className="flow-stage-list__index">{index + 1}</span>
                  <div>
                    <p className="flow-stage-list__label">{stage}</p>
                    <p className="flow-stage-list__status">{statusLabel}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="flow-note">{footerNote}</p>

          <div className="flow-actions">
            <button className="flow-button flow-button--secondary" type="button" onClick={onBackHome}>
              Back to Home
            </button>
            <button className="flow-button flow-button--secondary" type="button" onClick={onOpenTopicList}>
              View Recent Topics
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
