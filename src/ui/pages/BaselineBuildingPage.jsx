import React, { useEffect, useState } from 'react';
import {
  BASELINE_BUILDING_STAGES,
  resolveNextBaselineStageIndex,
  shouldAutoCompleteBaselineBuild,
} from '../flow/local-topic-flow.browser.mjs';

const STAGE_DELAY_MS = 420;

export default function BaselineBuildingPage({ topic, onComplete, onOpenTopicList }) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (shouldAutoCompleteBaselineBuild({
      currentStageIndex: stageIndex,
      fixtureKey: topic?.fixtureKey,
    })) {
      onComplete();
      return undefined;
    }

    const nextStageIndex = resolveNextBaselineStageIndex({
      currentStageIndex: stageIndex,
      fixtureKey: topic?.fixtureKey,
    });

    if (nextStageIndex === stageIndex) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      setStageIndex(nextStageIndex);
    }, STAGE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [onComplete, stageIndex, topic?.fixtureKey]);

  return (
    <main className="flow-shell">
      <div className="flow-shell__inner">
        <section className="flow-page flow-page--progress">
          <p className="flow-page__eyebrow">Local Baseline Building</p>
          <h1 className="flow-page__title">Preparing your Initial Topic Map</h1>
          <p className="flow-page__copy">
            {topic?.draft?.topic_name || 'Current topic'} is moving through a local demo build
            flow. No real source collection is running.
          </p>

          <ol className="flow-stage-list" aria-label="Baseline building stages">
            {BASELINE_BUILDING_STAGES.map((stage, index) => {
              const isCurrent = index === stageIndex;
              const isComplete = index < stageIndex;

              return (
                <li
                  className={`flow-stage-list__item${isCurrent ? ' flow-stage-list__item--current' : ''}${isComplete ? ' flow-stage-list__item--complete' : ''}`}
                  key={stage}
                >
                  <span className="flow-stage-list__index">{index + 1}</span>
                  <div>
                    <p className="flow-stage-list__label">{stage}</p>
                    <p className="flow-stage-list__status">
                      {isComplete ? 'Complete' : isCurrent ? 'In progress' : 'Queued'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="flow-note">
            Local demo progress. No real source collection is running.
          </p>

          <div className="flow-actions">
            <button className="flow-button flow-button--secondary" type="button" onClick={onOpenTopicList}>
              View Recent Topics
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
