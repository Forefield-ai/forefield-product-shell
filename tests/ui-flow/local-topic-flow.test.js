const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BASELINE_BUILDING_STAGES,
  createLocalTopicRecord,
  DRAFT_GENERATION_STAGES,
  SCREEN_IDS,
  TOPIC_STATUSES,
  updateLocalTopicStatus,
} = require('../../src/ui/flow/local-topic-flow');

const SAMPLE_DRAFT = {
  original_input: 'Teams want better ways to monitor privacy complaints.',
  topic_summary: 'Local demo draft for privacy complaints monitoring.',
  topic_name: 'Privacy Complaints Monitoring',
  target_audience: 'Product, research, and operations teams',
  problem_space: 'Track recurring demand, friction, and alternatives around privacy complaints monitoring.',
  monitoring_intent: 'Use this local demo topic to monitor whether recurring public demand around privacy complaints monitoring looks strong enough for an initial review workspace.',
  signal_focus: [
    'pain_point',
    'unmet_need',
    'workaround',
    'competitor_dissatisfaction',
    'switching_signal',
    'emerging_use_case',
  ],
  competitors_alternatives: [],
};

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

test('screen constants exist', () => {
  assert.equal(SCREEN_IDS.HOME, 'home');
  assert.equal(SCREEN_IDS.TOPIC_DRAFT_GENERATION, 'topic_draft_generation');
  assert.equal(SCREEN_IDS.TOPIC_DRAFT_CONFIRMATION, 'topic_draft_confirmation');
  assert.equal(SCREEN_IDS.BASELINE_BUILDING, 'baseline_building');
  assert.equal(SCREEN_IDS.TOPIC_WORKSPACE, 'topic_workspace');
  assert.equal(SCREEN_IDS.TOPIC_LIST, 'topic_list');
});

test('baseline stages match approved high-level stages', () => {
  assert.deepEqual(BASELINE_BUILDING_STAGES, [
    'Mapping the discussion space',
    'Collecting public conversations',
    'Extracting demand signals',
    'Validating recurring patterns',
    'Preparing your Initial Topic Map',
  ]);
});

test('draft generation stages match approved stages', () => {
  assert.deepEqual(DRAFT_GENERATION_STAGES, [
    'Understanding your intent',
    'Structuring your Topic',
    'Preparing Topic Draft',
  ]);
});

test('createLocalTopicRecord creates local-owned id and stores fixtureKey', () => {
  const topic = createLocalTopicRecord({
    draft: SAMPLE_DRAFT,
    fixtureKey: 'rich',
    createdAt: '2026-04-27T12:00:00.000Z',
  });

  assert.match(topic.id, /^local_topic__/);
  assert.equal(topic.fixtureKey, 'rich');
  assert.equal(topic.status, TOPIC_STATUSES.DRAFT);
});

test('status can be updated through helper', () => {
  const topic = createLocalTopicRecord({
    draft: SAMPLE_DRAFT,
    fixtureKey: 'minimal',
    createdAt: '2026-04-27T12:00:00.000Z',
  });
  const buildingTopic = updateLocalTopicStatus(topic, TOPIC_STATUSES.BUILDING, '2026-04-27T12:05:00.000Z');
  const readyTopic = updateLocalTopicStatus(buildingTopic, TOPIC_STATUSES.READY, '2026-04-27T12:10:00.000Z');

  assert.equal(buildingTopic.status, TOPIC_STATUSES.BUILDING);
  assert.equal(readyTopic.status, TOPIC_STATUSES.READY);
  assert.equal(readyTopic.updatedAt, '2026-04-27T12:10:00.000Z');
});

test('no prohibited decision-core fields appear', () => {
  const topic = createLocalTopicRecord({
    draft: SAMPLE_DRAFT,
    fixtureKey: 'rich',
    createdAt: '2026-04-27T12:00:00.000Z',
  });
  const keys = collectKeys(topic);

  keys.forEach((key) => {
    assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
  });
});
