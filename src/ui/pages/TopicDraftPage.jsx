import React from 'react';
import { generateLocalTopicDraftFromInput } from '../flow/generate-local-topic-draft.browser.mjs';

function listToText(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function textToList(value) {
  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function TopicDraftPage({
  draft,
  onDraftChange,
  onConfirm,
  onBackHome,
  onOpenTopicList,
}) {
  if (!draft) {
    return null;
  }

  const updateDraft = (field, value) => {
    onDraftChange({
      ...draft,
      [field]: value,
    });
  };

  const handleRegenerate = () => {
    onDraftChange(generateLocalTopicDraftFromInput(draft.original_input));
  };

  return (
    <main className="flow-shell">
      <div className="flow-shell__inner">
        <section className="flow-page flow-page--draft">
          <p className="flow-page__eyebrow">Topic Draft Confirmation</p>
          <h1 className="flow-page__title">Review and edit your local Topic Draft</h1>
          <p className="flow-page__copy">
            This draft is local-only and editable. Confirming it starts a mock baseline-building
            flow and then opens the existing Topic Workspace.
          </p>

          <div className="flow-form flow-form--grid">
            <label className="flow-field flow-field--full">
              <span>Original Input</span>
              <textarea
                rows={4}
                value={draft.original_input}
                onChange={(event) => updateDraft('original_input', event.target.value)}
              />
            </label>

            <label className="flow-field flow-field--full">
              <span>Topic Summary</span>
              <textarea
                rows={4}
                value={draft.topic_summary}
                onChange={(event) => updateDraft('topic_summary', event.target.value)}
              />
            </label>

            <label className="flow-field">
              <span>Topic Name</span>
              <input
                type="text"
                value={draft.topic_name}
                onChange={(event) => updateDraft('topic_name', event.target.value)}
              />
            </label>

            <label className="flow-field">
              <span>Target Audience</span>
              <input
                type="text"
                value={draft.target_audience}
                onChange={(event) => updateDraft('target_audience', event.target.value)}
              />
            </label>

            <label className="flow-field flow-field--full">
              <span>Problem Space</span>
              <textarea
                rows={3}
                value={draft.problem_space}
                onChange={(event) => updateDraft('problem_space', event.target.value)}
              />
            </label>

            <label className="flow-field flow-field--full">
              <span>Monitoring Intent</span>
              <textarea
                rows={3}
                value={draft.monitoring_intent}
                onChange={(event) => updateDraft('monitoring_intent', event.target.value)}
              />
            </label>

            <label className="flow-field">
              <span>Signal Focus</span>
              <textarea
                rows={6}
                value={listToText(draft.signal_focus)}
                onChange={(event) => updateDraft('signal_focus', textToList(event.target.value))}
              />
            </label>

            <label className="flow-field">
              <span>Competitors / Alternatives</span>
              <textarea
                rows={6}
                value={listToText(draft.competitors_alternatives)}
                onChange={(event) => updateDraft('competitors_alternatives', textToList(event.target.value))}
              />
            </label>
          </div>

          <p className="flow-note">
            Local mock draft only. Confirming the Topic starts simulated progress, not real source
            collection.
          </p>

          <div className="flow-actions">
            <button className="flow-button flow-button--primary" type="button" onClick={() => onConfirm(draft)}>
              Confirm Topic &amp; Start Initial Review
            </button>
            <button className="flow-button flow-button--secondary" type="button" onClick={handleRegenerate}>
              Regenerate Draft
            </button>
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
