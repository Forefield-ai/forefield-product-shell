import React, { useEffect, useState } from 'react';
import { generateLocalTopicDraftFromInput } from '../flow/generate-local-topic-draft';
import { DRAFT_GENERATION_STAGES } from '../flow/local-topic-flow';

const STAGE_DELAY_MS = 450;

export default function TopicDraftGenerationPage({ input, onComplete, onBackHome }) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (stageIndex >= DRAFT_GENERATION_STAGES.length) {
      return undefined;
    }

    const timerId = setTimeout(() => {
      if (stageIndex === DRAFT_GENERATION_STAGES.length - 1) {
        onComplete(generateLocalTopicDraftFromInput(input));
        return;
      }

      setStageIndex((currentIndex) => currentIndex + 1);
    }, STAGE_DELAY_MS);

    return () => clearTimeout(timerId);
  }, [input, onComplete, stageIndex]);

  return (
    <main className="flow-shell">
      <div className="flow-shell__inner">
        <section className="flow-page flow-page--progress">
          <p className="flow-page__eyebrow">Local Draft Generation</p>
          <h1 className="flow-page__title">Preparing your Topic Draft</h1>
          <p className="flow-page__copy">
            Local demo only. No data collection starts until the Topic is confirmed.
          </p>

          <ol className="flow-stage-list" aria-label="Topic draft generation stages">
            {DRAFT_GENERATION_STAGES.map((stage, index) => {
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

          <div className="flow-actions">
            <button className="flow-button flow-button--secondary" type="button" onClick={onBackHome}>
              Back to Home
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
