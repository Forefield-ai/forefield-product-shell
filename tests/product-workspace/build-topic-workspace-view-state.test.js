const test = require('node:test');
const assert = require('node:assert/strict');

const minimalProductMainlineFixture = require('../../fixtures/product/product-mainline.sample.json');
const richProductMainlineFixture = require('../../fixtures/product/rich-product-mainline.sample.json');
const minimalWorkspaceViewFixture = require('../../fixtures/product/topic-workspace-view-state.sample.json');
const richWorkspaceViewFixture = require('../../fixtures/product/rich-topic-workspace-view-state.sample.json');
const {
  buildTopicWorkspaceViewState,
} = require('../../src/product/read-models/build-topic-workspace-view-state');

const PROHIBITED_KEYS = new Set([
  'OpportunitySet',
  'OpportunityCard',
  'OpportunityScore',
  'ClaimTrace',
  'opportunity_score',
  'raw_refs',
  'raw_trace_refs',
  'claim_candidate_id',
  'analysis_packets',
  'corroboration_record',
  'support_entries',
  'contradiction_entries',
  'weak_context_entries',
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

test('minimal product mainline fixture loads', () => {
  assert.ok(minimalProductMainlineFixture);
  assert.ok(Array.isArray(minimalProductMainlineFixture.signal_clusters));
});

test('rich product mainline fixture loads', () => {
  assert.ok(richProductMainlineFixture);
  assert.ok(Array.isArray(richProductMainlineFixture.signal_clusters));
  assert.ok(richProductMainlineFixture.signal_clusters.length > 1);
});

test('minimal workspace view matches topic-workspace-view-state fixture', () => {
  const viewState = buildTopicWorkspaceViewState(minimalProductMainlineFixture);

  assert.deepEqual(viewState, minimalWorkspaceViewFixture);
});

test('rich workspace view matches rich-topic-workspace-view-state fixture', () => {
  const viewState = buildTopicWorkspaceViewState(richProductMainlineFixture);

  assert.deepEqual(viewState, richWorkspaceViewFixture);
});

test('review_summary counts are correct', () => {
  const richViewState = buildTopicWorkspaceViewState(richProductMainlineFixture);

  assert.equal(
    richViewState.review_summary.signal_cluster_count,
    richProductMainlineFixture.signal_clusters.length
  );
  assert.equal(
    richViewState.review_summary.curated_evidence_record_count,
    richProductMainlineFixture.curated_evidence_records.length
  );
  assert.equal(richViewState.review_summary.public_source_ref_count, 5);
  assert.equal(richViewState.review_summary.directional_count, 1);
  assert.equal(richViewState.review_summary.exploratory_count, 1);
});

test('source_coverage_strip counts are correct', () => {
  const minimalViewState = buildTopicWorkspaceViewState(minimalProductMainlineFixture);
  const richViewState = buildTopicWorkspaceViewState(richProductMainlineFixture);

  assert.equal(minimalViewState.source_coverage_strip.public_source_ref_count, 2);
  assert.equal(minimalViewState.source_coverage_strip.unique_public_source_ref_count, 2);
  assert.equal(richViewState.source_coverage_strip.public_source_ref_count, 5);
  assert.equal(richViewState.source_coverage_strip.unique_public_source_ref_count, 5);
});

test('signal_cluster_sections length equals signal_clusters length', () => {
  const minimalViewState = buildTopicWorkspaceViewState(minimalProductMainlineFixture);
  const richViewState = buildTopicWorkspaceViewState(richProductMainlineFixture);

  assert.equal(
    minimalViewState.signal_cluster_sections.length,
    minimalProductMainlineFixture.signal_clusters.length
  );
  assert.equal(
    richViewState.signal_cluster_sections.length,
    richProductMainlineFixture.signal_clusters.length
  );
});

test('selected_evidence_drawer is null when selectedClusterId is not provided', () => {
  const viewState = buildTopicWorkspaceViewState(richProductMainlineFixture);

  assert.equal(viewState.selected_evidence_drawer, null);
});

test('selected_evidence_drawer scopes to selected first cluster when selectedClusterId is provided', () => {
  const selectedClusterId = minimalProductMainlineFixture.signal_clusters[0].id;
  const viewState = buildTopicWorkspaceViewState(minimalProductMainlineFixture, {
    selectedClusterId,
  });

  assert.ok(viewState.selected_evidence_drawer);
  assert.equal(
    viewState.selected_evidence_drawer.signal_cluster_ref.signal_cluster_id,
    selectedClusterId
  );
  assert.equal(viewState.selected_evidence_drawer.evidence_items.length, 2);
});

test('selected_evidence_drawer scopes to selected second cluster for rich fixture when selectedClusterId is provided', () => {
  const selectedClusterId = richProductMainlineFixture.signal_clusters[1].id;
  const viewState = buildTopicWorkspaceViewState(richProductMainlineFixture, {
    selectedClusterId,
  });

  assert.ok(viewState.selected_evidence_drawer);
  assert.equal(
    viewState.selected_evidence_drawer.signal_cluster_ref.signal_cluster_id,
    selectedClusterId
  );
  assert.deepEqual(viewState.selected_evidence_drawer.source_links, [
    'https://example.com/forum/manual-handoff-pain',
    'https://example.com/community/manual-handoff-followup',
  ]);
});

test('throws a clear error when selectedClusterId does not match any cluster', () => {
  assert.throws(
    () => buildTopicWorkspaceViewState(richProductMainlineFixture, {
      selectedClusterId: 'missing_cluster',
    }),
    /Selected signal cluster not found/i
  );
});

test('prohibited fields are absent from workspace view', () => {
  const minimalViewState = buildTopicWorkspaceViewState(minimalProductMainlineFixture);
  const richViewState = buildTopicWorkspaceViewState(richProductMainlineFixture);

  [minimalViewState, richViewState].forEach((value) => {
    const keys = collectKeys(value);

    keys.forEach((key) => {
      assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
    });
  });
});

test('no confirmed Topic is created by default', () => {
  const viewState = buildTopicWorkspaceViewState(richProductMainlineFixture);

  assert.equal(Object.prototype.hasOwnProperty.call(viewState, 'topic'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(viewState, 'confirmed_topic'), false);
});
