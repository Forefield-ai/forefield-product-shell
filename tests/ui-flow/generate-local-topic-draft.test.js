const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_LOCAL_DEMO_TOPIC_NAME,
  DEFAULT_SIGNAL_FOCUS,
  generateLocalTopicDraftFromInput,
} = require('../../src/ui/flow/generate-local-topic-draft');

const PROHIBITED_KEYS = new Set([
  'DecisionCoreBoundaryHandoff',
  'OpportunitySet',
  'OpportunityCard',
  'OpportunityScore',
  'ClaimTrace',
  'opportunity_score',
  'raw_refs',
  'raw_trace_refs',
  'claim_candidate_id',
  'internal_decision_core',
  'decision_band',
  'claim_id',
  'opportunity_id',
  'review_priority',
]);

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, keys));
    return keys;
  }

  if (!value || typeof value !== 'object') {
    return keys;
  }

  Object.keys(value).forEach((key) => {
    keys.push(key);
    collectKeys(value[key], keys);
  });

  return keys;
}

test('empty input throws', () => {
  assert.throws(
    () => generateLocalTopicDraftFromInput('   '),
    /non-empty input string/i
  );
});

test('non-empty input returns required fields', () => {
  const draft = generateLocalTopicDraftFromInput('Teams want clearer privacy controls.');

  assert.equal(typeof draft.original_input, 'string');
  assert.equal(typeof draft.topic_summary, 'string');
  assert.equal(typeof draft.topic_name, 'string');
  assert.equal(typeof draft.target_audience, 'string');
  assert.equal(typeof draft.problem_space, 'string');
  assert.equal(typeof draft.monitoring_intent, 'string');
  assert.equal(Array.isArray(draft.signal_focus), true);
  assert.equal(Array.isArray(draft.competitors_alternatives), true);
});

test('topic_name is non-empty', () => {
  const draft = generateLocalTopicDraftFromInput('Developers want cleaner error triage flows.');
  assert.equal(draft.topic_name.length > 0, true);
});

test('low-information numeric input falls back to stable demo topic copy', () => {
  const draft = generateLocalTopicDraftFromInput('1');
  const visibleCopy = [
    draft.topic_name,
    draft.topic_summary,
    draft.target_audience,
    draft.problem_space,
    draft.monitoring_intent,
  ].join(' ');

  assert.equal(draft.original_input, '1');
  assert.equal(draft.topic_name, DEFAULT_LOCAL_DEMO_TOPIC_NAME);
  assert.doesNotMatch(visibleCopy, /(^|\s)1(\s|$)/);
});

test('signal_focus includes expected canonical signal types', () => {
  const draft = generateLocalTopicDraftFromInput('Customer support teams need better escalation tracking.');
  assert.deepEqual(draft.signal_focus, DEFAULT_SIGNAL_FOCUS);
});

test('output is deterministic for same input', () => {
  const input = 'Smaller teams still struggle with manual workflow handoffs.';
  const firstDraft = generateLocalTopicDraftFromInput(input);
  const secondDraft = generateLocalTopicDraftFromInput(input);

  assert.deepEqual(firstDraft, secondDraft);
});

test('no prohibited decision-core fields appear', () => {
  const draft = generateLocalTopicDraftFromInput('Marketers want more clarity around campaign feedback loops.');
  const keys = collectKeys(draft);

  keys.forEach((key) => {
    assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
  });
});
