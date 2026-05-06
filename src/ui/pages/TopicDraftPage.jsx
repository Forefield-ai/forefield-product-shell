import React from 'react';
import { generateLocalTopicDraftFromInput } from '../flow/generate-local-topic-draft.browser.mjs';

const SIGNAL_FOCUS_LABELS = {
  pain_point: 'Pain Points',
  unmet_need: 'Unmet Needs',
  workaround: 'Workarounds',
  competitor_dissatisfaction: 'Competitor Dissatisfaction',
  switching_signal: 'Switching Signals',
  emerging_use_case: 'Emerging Use Cases',
};

function normalizeSignalFocusLabel(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const SIGNAL_FOCUS_VALUE_BY_LABEL = Object.keys(SIGNAL_FOCUS_LABELS).reduce((accumulator, value) => {
  accumulator[normalizeSignalFocusLabel(value)] = value;
  accumulator[normalizeSignalFocusLabel(SIGNAL_FOCUS_LABELS[value])] = value;
  return accumulator;
}, {});

function listToText(values) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function signalFocusListToText(values) {
  return Array.isArray(values)
    ? values.map((value) => SIGNAL_FOCUS_LABELS[value] || value).join('\n')
    : '';
}

function textToList(value) {
  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function textToSignalFocusList(value) {
  return textToList(value).map((entry) => (
    SIGNAL_FOCUS_VALUE_BY_LABEL[normalizeSignalFocusLabel(entry)] || entry
  ));
}

export default function TopicDraftPage({
  draft,
  onDraftChange,
  onConfirm,
  onBackHome,
  onOpenTopicList,
  runtimeMode = 'local',
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
  const runtimeModeIsApi = runtimeMode === 'api';

  return (
    <main className="flow-shell">
      <div className="flow-shell__inner">
        <section className="flow-page flow-page--draft">
          <p className="flow-page__eyebrow">Topic Draft Confirmation</p>
          <h1 className="flow-page__title">Review and edit your Topic Draft</h1>
          <p className="flow-page__copy">
            This draft is editable before it starts the selected Initial Review path.
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
                value={signalFocusListToText(draft.signal_focus)}
                onChange={(event) => updateDraft('signal_focus', textToSignalFocusList(event.target.value))}
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
            {runtimeModeIsApi
              ? 'API Backend mode creates a backend run and loads the returned workspace payload. It does not use local sample data as a fallback.'
              : 'Local Sample mode starts simulated progress and opens the selected sample workspace.'}
          </p>

          <div className="flow-actions">
            <button className="flow-button flow-button--primary" type="button" onClick={() => onConfirm(draft)}>
              {runtimeModeIsApi
                ? 'Confirm Topic & Start API Review'
                : 'Confirm Topic & Start Initial Review'}
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
