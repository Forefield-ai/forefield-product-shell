const test = require('node:test');
const assert = require('node:assert/strict');

const { createLocalRuntimeAdapter } = require('../../src/runtime/adapters/local-runtime-adapter');
const {
  DEFAULT_DEMO_USER_ID,
  DEFAULT_DEMO_WORKSPACE_ID,
} = require('../../src/runtime/session/current-user-context');
const { PROHIBITED_RUNTIME_FIELDS } = require('../../src/runtime/contracts/runtime-adapter-contract');
const richProductMainline = require('../../fixtures/product/rich-product-mainline.sample.json');

const FIXED_NOW = '2026-04-27T20:15:00.000Z';

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

function assertNoProhibitedFields(payload) {
  const prohibitedKeys = new Set(PROHIBITED_RUNTIME_FIELDS);
  const keys = collectKeys(payload);

  keys.forEach((key) => {
    assert.equal(prohibitedKeys.has(key), false, `Unexpected prohibited key found: ${key}`);
  });
}

function createConfirmedTopic(adapter) {
  const draft = adapter.topics.createTopicDraft('Teams want better ways to monitor privacy complaints.');
  const topic = adapter.topics.confirmTopicDraft(draft, { now: FIXED_NOW });

  return { draft, topic };
}

test('creates demo context by default', () => {
  const adapter = createLocalRuntimeAdapter();
  const context = adapter.session.getCurrentContext();

  assert.equal(context.user_id, DEFAULT_DEMO_USER_ID);
  assert.equal(context.workspace_id, DEFAULT_DEMO_WORKSPACE_ID);
  assert.equal(context.mode, 'demo');
});

test('createTopicDraft returns product-facing draft', () => {
  const adapter = createLocalRuntimeAdapter();
  const draft = adapter.topics.createTopicDraft('Track demand for privacy complaint monitoring');

  assert.equal(draft.topic_name.length > 0, true);
  assert.equal(Array.isArray(draft.signal_focus), true);
  assert.equal(Array.isArray(draft.competitors_alternatives), true);
  assertNoProhibitedFields(draft);
});

test('confirmTopicDraft creates topic with workspace_id and created_by from context', () => {
  const adapter = createLocalRuntimeAdapter();
  const { draft } = createConfirmedTopic(adapter);
  const topic = adapter.topics.confirmTopicDraft(draft, { now: '2026-04-27T20:16:00.000Z' });

  assert.match(topic.id, /^topic_rt__/);
  assert.equal(topic.workspace_id, DEFAULT_DEMO_WORKSPACE_ID);
  assert.equal(topic.created_by, DEFAULT_DEMO_USER_ID);
  assert.equal(topic.status, 'draft');
  assertNoProhibitedFields(topic);
});

test('listTopics returns created topics', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);
  const topics = adapter.topics.listTopics();

  assert.equal(topics.length, 1);
  assert.equal(topics[0].id, topic.id);
});

test('startInitialReview creates run scoped to topic and workspace', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);
  const run = adapter.runs.startInitialReview(topic.id, { now: FIXED_NOW });

  assert.match(run.id, /^monitoring_run_rt__/);
  assert.equal(run.topic_id, topic.id);
  assert.equal(run.workspace_id, topic.workspace_id);
  assert.equal(run.status, 'building');
  assertNoProhibitedFields(run);
});

test('getRunStatus returns coarse status only', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);
  const run = adapter.runs.startInitialReview(topic.id, { now: FIXED_NOW });
  const runStatus = adapter.runs.getRunStatus(run.id);

  assert.deepEqual(Object.keys(runStatus).sort(), [
    'created_at',
    'id',
    'stage_label',
    'status',
    'topic_id',
    'updated_at',
    'workspace_id',
  ]);
});

test('getTopicWorkspace returns non-placeholder workspace data for known topics', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);
  const run = adapter.runs.startInitialReview(topic.id, { now: FIXED_NOW });
  const workspaceData = adapter.workspace.getTopicWorkspace(topic.id);

  assert.equal(workspaceData.workspace_id, DEFAULT_DEMO_WORKSPACE_ID);
  assert.equal(workspaceData.topic_id, topic.id);
  assert.equal(workspaceData.monitoring_run_id, run.id);
  assert.deepEqual(Object.keys(workspaceData).sort(), [
    'curated_evidence_records',
    'initial_topic_map',
    'monitoring_run',
    'monitoring_run_id',
    'signal_clusters',
    'topic',
    'topic_id',
    'workspace_id',
  ]);
  assert.equal(Array.isArray(workspaceData.signal_clusters), true);
  assert.equal(Array.isArray(workspaceData.curated_evidence_records), true);
  assert.equal(workspaceData.signal_clusters.length > 0, true);
  assert.equal(workspaceData.curated_evidence_records.length > 0, true);
  assert.equal('action_summary' in workspaceData, false);
  assert.equal('saved_cluster_ids' in workspaceData, false);
  assert.equal('hidden_cluster_ids' in workspaceData, false);
  assert.equal('watched_cluster_ids' in workspaceData, false);
  assert.equal('saved_evidence_ids' in workspaceData, false);
  assert.equal(workspaceData.signal_clusters[0].monitoring_run_id, run.id);
  assert.equal(workspaceData.curated_evidence_records[0].monitoring_run_id, run.id);
  assert.equal(
    workspaceData.curated_evidence_records[0].id,
    richProductMainline.curated_evidence_records[0].id
  );
  assertNoProhibitedFields(workspaceData);
});

test('getTopicWorkspace throws clearly for unknown topic ids', () => {
  const adapter = createLocalRuntimeAdapter();

  assert.throws(
    () => adapter.workspace.getTopicWorkspace('missing_topic_rt__404'),
    /Unknown topicId/i
  );
});

test('watchCluster marks watched and does not create SavedItem', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);
  const state = adapter.actions.watchCluster(topic.id, 'signal_cluster_rt__privacy', { now: FIXED_NOW });

  assert.equal(state.watchedClustersById['signal_cluster_rt__privacy'].status, 'active');
  assert.equal(state.savedItems.length, 0);
});

test('saveCluster creates active SavedItem type cluster', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);
  const state = adapter.actions.saveCluster(topic.id, 'signal_cluster_rt__privacy', {
    title_snapshot: 'Privacy complaints keep recurring',
    summary_snapshot: 'Users want better ways to understand trust and coverage.',
    source_links_snapshot: ['https://example.com/cluster'],
  }, { now: FIXED_NOW });

  assert.equal(state.savedItems.length, 1);
  assert.equal(state.savedItems[0].saved_type, 'cluster');
  assert.equal(state.savedItems[0].status, 'active');
});

test('saveEvidence creates active SavedItem type evidence and preserves cluster_id', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);
  const state = adapter.actions.saveEvidence(topic.id, 'signal_cluster_rt__privacy', 'curated_evidence_rt__privacy__s1', {
    title_snapshot: 'Evidence item 1',
    summary_snapshot: 'Representative evidence summary.',
    source_links_snapshot: ['https://example.com/evidence'],
  }, { now: FIXED_NOW });

  assert.equal(state.savedItems.length, 1);
  assert.equal(state.savedItems[0].saved_type, 'evidence');
  assert.equal(state.savedItems[0].cluster_id, 'signal_cluster_rt__privacy');
});

test('hideCluster hides cluster but preserves saved and watched state', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);

  adapter.actions.watchCluster(topic.id, 'signal_cluster_rt__privacy', { now: FIXED_NOW });
  adapter.actions.saveCluster(topic.id, 'signal_cluster_rt__privacy', {
    title_snapshot: 'Privacy complaints keep recurring',
  }, { now: FIXED_NOW });
  const hiddenState = adapter.actions.hideCluster(topic.id, 'signal_cluster_rt__privacy', {
    now: '2026-04-27T20:16:00.000Z',
  });

  assert.equal(hiddenState.hiddenClustersById['signal_cluster_rt__privacy'].status, 'hidden');
  assert.equal(hiddenState.watchedClustersById['signal_cluster_rt__privacy'].status, 'active');
  assert.equal(hiddenState.savedItems[0].status, 'active');
});

test('undoHideCluster restores visibility', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);

  adapter.actions.hideCluster(topic.id, 'signal_cluster_rt__privacy', { now: FIXED_NOW });
  const state = adapter.actions.undoHideCluster(topic.id, 'signal_cluster_rt__privacy', {
    now: '2026-04-27T20:16:00.000Z',
  });

  assert.equal(state.hiddenClustersById['signal_cluster_rt__privacy'].status, 'visible');
});

test('listSavedItems returns active saved items', () => {
  const adapter = createLocalRuntimeAdapter();
  const { topic } = createConfirmedTopic(adapter);

  adapter.actions.saveCluster(topic.id, 'signal_cluster_rt__privacy', {
    title_snapshot: 'Cluster save',
  }, { now: FIXED_NOW });
  adapter.actions.saveEvidence(topic.id, 'signal_cluster_rt__privacy', 'curated_evidence_rt__privacy__s1', {
    title_snapshot: 'Evidence save',
  }, { now: FIXED_NOW });

  const savedItems = adapter.workspace.listSavedItems(topic.id);

  assert.equal(savedItems.length, 2);
  assert.equal(savedItems.every((item) => item.status === 'active'), true);
  assertNoProhibitedFields(savedItems);
});

test('adapter output has no prohibited fields', () => {
  const adapter = createLocalRuntimeAdapter();
  const { draft, topic } = createConfirmedTopic(adapter);
  const run = adapter.runs.startInitialReview(topic.id, { now: FIXED_NOW });
  const actionState = adapter.actions.saveEvidence(topic.id, 'signal_cluster_rt__privacy', 'curated_evidence_rt__privacy__s1', {
    title_snapshot: 'Evidence save',
  }, { now: FIXED_NOW });
  const workspace = adapter.workspace.getTopicWorkspace(topic.id);
  const savedItems = adapter.workspace.listSavedItems(topic.id);

  [draft, topic, run, actionState, workspace, savedItems].forEach(assertNoProhibitedFields);
});

test('openSavedCluster and openSavedEvidence methods do not exist', () => {
  const adapter = createLocalRuntimeAdapter();

  assert.equal('openSavedCluster' in adapter.actions, false);
  assert.equal('openSavedEvidence' in adapter.actions, false);
  assert.equal('openSavedCluster' in adapter.workspace, false);
  assert.equal('openSavedEvidence' in adapter.workspace, false);
});
