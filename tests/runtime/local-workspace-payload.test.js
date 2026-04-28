const test = require('node:test');
const assert = require('node:assert/strict');

const minimalProductMainline = require('../../fixtures/product/product-mainline.sample.json');
const richProductMainline = require('../../fixtures/product/rich-product-mainline.sample.json');
const {
  buildLocalTopicWorkspaceData,
  buildProductMainlineCompatibilityPayload,
} = require('../../src/runtime/workspace/local-workspace-payload');
const { buildTopicWorkspaceViewState } = require('../../src/product/read-models/build-topic-workspace-view-state');

const SAMPLE_TOPIC = {
  id: 'topic_rt__workspace_payload_demo',
  workspace_id: 'demo_workspace',
  created_by: 'demo_user',
  topic_name: 'Privacy complaints monitoring',
  topic_summary: 'Track recurring privacy complaints across public sources.',
  status: 'building',
  created_at: '2026-04-27T20:15:00.000Z',
  updated_at: '2026-04-27T20:15:00.000Z',
};

const SAMPLE_RUN = {
  id: 'monitoring_run_rt__workspace_payload_demo',
  topic_id: SAMPLE_TOPIC.id,
  workspace_id: SAMPLE_TOPIC.workspace_id,
  status: 'building',
  stage_label: 'Preparing Initial Topic Map',
  created_at: '2026-04-27T20:15:00.000Z',
  updated_at: '2026-04-27T20:15:00.000Z',
};

test('buildLocalTopicWorkspaceData returns canonical workspace payload backed by fixtures', () => {
  const workspaceData = buildLocalTopicWorkspaceData({
    topic: SAMPLE_TOPIC,
    monitoringRun: SAMPLE_RUN,
    productMainline: minimalProductMainline,
  });

  assert.equal(workspaceData.workspace_id, SAMPLE_TOPIC.workspace_id);
  assert.equal(workspaceData.topic_id, SAMPLE_TOPIC.id);
  assert.equal(workspaceData.monitoring_run_id, SAMPLE_RUN.id);
  assert.equal(workspaceData.topic.id, SAMPLE_TOPIC.id);
  assert.equal(workspaceData.monitoring_run.id, SAMPLE_RUN.id);
  assert.equal(workspaceData.initial_topic_map.monitoring_run_id, SAMPLE_RUN.id);
  assert.equal(workspaceData.initial_topic_map.signal_cluster_ids.length, 1);
  assert.equal(workspaceData.signal_clusters[0].id, minimalProductMainline.signal_clusters[0].id);
  assert.equal(
    workspaceData.curated_evidence_records[0].id,
    minimalProductMainline.curated_evidence_records[0].id
  );
  assert.equal('action_summary' in workspaceData, false);
});

test('buildProductMainlineCompatibilityPayload preserves presenter boundary and UI-compatible counts', () => {
  const workspaceData = buildLocalTopicWorkspaceData({
    topic: SAMPLE_TOPIC,
    monitoringRun: SAMPLE_RUN,
    productMainline: richProductMainline,
  });
  const compatibilityPayload = buildProductMainlineCompatibilityPayload(workspaceData, {
    productMainline: richProductMainline,
  });
  const viewState = buildTopicWorkspaceViewState(compatibilityPayload, {
    selectedClusterId: richProductMainline.signal_clusters[0].id,
  });

  assert.equal(
    viewState.review_summary.signal_cluster_count,
    richProductMainline.signal_clusters.length
  );
  assert.equal(
    viewState.review_summary.curated_evidence_record_count,
    richProductMainline.curated_evidence_records.length
  );
  assert.equal(
    viewState.selected_evidence_drawer.signal_cluster_ref.signal_cluster_id,
    richProductMainline.signal_clusters[0].id
  );
  assert.equal(
    viewState.selected_evidence_drawer.evidence_items[0].curated_evidence_record_id,
    richProductMainline.curated_evidence_records[0].id
  );
});
