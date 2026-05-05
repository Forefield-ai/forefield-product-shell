const test = require('node:test');
const assert = require('node:assert/strict');

const groupedProductMainlineFixture = require('../../fixtures/product/grouped-evidence-product-mainline.sample.json');
const minimalProductMainlineFixture = require('../../fixtures/product/product-mainline.sample.json');
const {
  buildEvidenceDrawerState,
} = require('../../src/product/read-models/build-evidence-drawer-state');
const {
  buildGroupedEvidenceViewState,
} = require('../../src/product/read-models/build-grouped-evidence-view-state');
const {
  buildTopicWorkspaceViewState,
} = require('../../src/product/read-models/build-topic-workspace-view-state');
const {
  buildLocalTopicWorkspaceData,
  buildProductMainlineCompatibilityPayload,
} = require('../../src/runtime/workspace/local-workspace-payload');

const FORBIDDEN_KEYS = new Set([
  'api_key',
  'author_id',
  'chain_of_thought',
  'private_id',
  'profile_id',
  'profile_url',
  'prompt',
  'provider_response',
  'raw_provider_response',
  'raw_snippet',
  'raw_source_payload',
  'raw_source_text',
  'raw_text',
  'source_url',
  'target_url',
]);

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
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

function assertNoRawPrivateProviderFields(value) {
  const keys = collectKeys(value);
  const serialized = JSON.stringify(value).toLowerCase();

  keys.forEach((key) => {
    assert.equal(FORBIDDEN_KEYS.has(key), false, `Unexpected forbidden key: ${key}`);
  });
  assert.equal(/https?:\/\//i.test(serialized), false);
  assert.equal(serialized.includes('api key'), false);
  assert.equal(serialized.includes('provider response'), false);
  assert.equal(serialized.includes('chain of thought'), false);
}

function sectionById(viewState, sectionId) {
  return viewState.groupedEvidenceSections.find((section) => section.section_id === sectionId);
}

test('buildGroupedEvidenceViewState maps v0.3 grouped evidence sections correctly', () => {
  const signalCluster = groupedProductMainlineFixture.signal_clusters[0];
  const viewState = buildGroupedEvidenceViewState({
    signalCluster,
    curatedEvidenceRecords: groupedProductMainlineFixture.curated_evidence_records,
  });

  assert.equal(viewState.hasGroupedEvidence, true);
  assert.equal(viewState.fallbackMode, false);
  assert.equal(viewState.groupedEvidenceSections.length, 7);
  assert.deepEqual(
    viewState.groupedEvidenceSections.map((section) => section.section_id),
    [
      'direct_support',
      'counter_evidence',
      'weak_support',
      'trend_context',
      'competitive_context',
      'professional_context',
      'discovery_leads',
    ]
  );
  assert.equal(sectionById(viewState, 'direct_support').title, 'Direct Support');
  assert.equal(sectionById(viewState, 'discovery_leads').caveat_label, 'Follow-up leads, not evidence yet.');
});

test('direct support count is strict', () => {
  const viewState = buildGroupedEvidenceViewState({
    signalCluster: groupedProductMainlineFixture.signal_clusters[0],
    curatedEvidenceRecords: groupedProductMainlineFixture.curated_evidence_records,
  });

  assert.equal(viewState.directEvidenceCount, 1);
  assert.equal(sectionById(viewState, 'direct_support').is_direct_evidence, true);
  assert.equal(sectionById(viewState, 'direct_support').items[0].counts_toward_direct_evidence, true);
});

test('trend competitive professional weak discovery and counter sections do not count as direct evidence', () => {
  const viewState = buildGroupedEvidenceViewState({
    signalCluster: groupedProductMainlineFixture.signal_clusters[0],
    curatedEvidenceRecords: groupedProductMainlineFixture.curated_evidence_records,
  });

  [
    'trend_context',
    'competitive_context',
    'professional_context',
    'weak_support',
    'discovery_leads',
    'counter_evidence',
  ].forEach((sectionId) => {
    const section = sectionById(viewState, sectionId);

    assert.equal(section.is_direct_evidence, false);
    assert.equal(
      section.items.every((item) => item.counts_toward_direct_evidence === false),
      true,
      `${sectionId} should not count as direct evidence`
    );
  });
});

test('counter evidence is preserved and not counted as direct support', () => {
  const viewState = buildGroupedEvidenceViewState({
    signalCluster: groupedProductMainlineFixture.signal_clusters[0],
    curatedEvidenceRecords: groupedProductMainlineFixture.curated_evidence_records,
  });
  const counterSection = sectionById(viewState, 'counter_evidence');

  assert.equal(counterSection.count, 1);
  assert.match(counterSection.items[0].summary, /current summary quality is sufficient/i);
  assert.equal(viewState.directEvidenceCount, 1);
});

test('fallback works when grouped evidence is absent', () => {
  const viewState = buildGroupedEvidenceViewState({
    signalCluster: minimalProductMainlineFixture.signal_clusters[0],
    curatedEvidenceRecords: minimalProductMainlineFixture.curated_evidence_records,
  });

  assert.equal(viewState.hasGroupedEvidence, false);
  assert.equal(viewState.fallbackMode, true);
  assert.equal(sectionById(viewState, 'direct_support').count, 2);
  assert.equal(viewState.directEvidenceCount, 2);
});

test('Evidence Drawer state exposes grouped sections from fixture', () => {
  const drawerState = buildEvidenceDrawerState({
    topicDraft: groupedProductMainlineFixture.topic_draft,
    signalCluster: groupedProductMainlineFixture.signal_clusters[0],
    curatedEvidenceRecords: groupedProductMainlineFixture.curated_evidence_records,
  });

  assert.equal(drawerState.grouped_evidence_summary.has_grouped_evidence, true);
  assert.equal(drawerState.grouped_evidence_summary.direct_evidence_count, 1);
  assert.equal(drawerState.grouped_evidence_summary.total_grouped_evidence_count, 7);
  assert.equal(drawerState.grouped_evidence_sections.length, 7);
  assert.equal(drawerState.evidence_items.length, 0);
  assertNoRawPrivateProviderFields(drawerState.grouped_evidence_sections);
});

test('workspace view keeps v0.2 fallback behavior when grouped evidence is absent', () => {
  const viewState = buildTopicWorkspaceViewState(minimalProductMainlineFixture);

  assert.equal(viewState.signal_cluster_sections[0].evidence_count, 2);
  assert.equal(viewState.signal_cluster_sections[0].drawer_available, true);
  assert.equal('grouped_evidence_preview' in viewState.signal_cluster_sections[0], false);
});

test('workspace view exposes grouped preview without changing flat evidence counts', () => {
  const viewState = buildTopicWorkspaceViewState(groupedProductMainlineFixture, {
    selectedClusterId: groupedProductMainlineFixture.signal_clusters[0].id,
  });
  const clusterSection = viewState.signal_cluster_sections[0];

  assert.equal(clusterSection.evidence_count, 0);
  assert.equal(clusterSection.drawer_available, true);
  assert.equal(clusterSection.grouped_evidence_preview.direct_evidence_count, 1);
  assert.equal(clusterSection.grouped_evidence_preview.counter_evidence_count, 1);
  assert.equal(clusterSection.grouped_evidence_preview.discovery_lead_count, 1);
  assert.equal(clusterSection.grouped_evidence_preview.total_grouped_evidence_count, 7);
  assert.equal(viewState.selected_evidence_drawer.grouped_evidence_summary.has_grouped_evidence, true);
});

test('malformed grouped evidence item is ignored without hiding cluster', () => {
  const fixture = JSON.parse(JSON.stringify(groupedProductMainlineFixture));
  fixture.signal_clusters[0].grouped_evidence.direct_support.push({
    item_id: 'bad_raw_item',
    raw_text: 'unsafe',
    summary: 'Unsafe item should not render.',
  });
  fixture.signal_clusters[0].grouped_evidence.trend_context.push({
    item_id: 'bad_url_item',
    summary: 'Unsafe URL should not render.',
    source_url: 'https://example.com/not-allowed',
  });

  const viewState = buildGroupedEvidenceViewState({
    signalCluster: fixture.signal_clusters[0],
    curatedEvidenceRecords: fixture.curated_evidence_records,
  });

  assert.equal(sectionById(viewState, 'direct_support').count, 1);
  assert.equal(sectionById(viewState, 'trend_context').count, 1);
  assert.equal(viewState.totalGroupedEvidenceCount, 7);
});

test('grouped evidence fixture contains no raw private source URL or provider fields', () => {
  assertNoRawPrivateProviderFields(groupedProductMainlineFixture.signal_clusters[0].grouped_evidence);
});

test('local workspace payload can carry grouped evidence into product read models', () => {
  const workspaceData = buildLocalTopicWorkspaceData({
    topic: {
      id: 'topic_rt__p16c_grouped',
      workspace_id: 'workspace_rt__demo',
      topic_name: 'AI meeting notes for product teams',
      status: 'draft',
      created_at: '2026-05-05T00:00:00Z',
      updated_at: '2026-05-05T00:00:00Z',
    },
    productMainline: groupedProductMainlineFixture,
  });
  const compatibilityPayload = buildProductMainlineCompatibilityPayload(workspaceData, {
    productMainline: groupedProductMainlineFixture,
  });
  const viewState = buildTopicWorkspaceViewState(compatibilityPayload, {
    selectedClusterId: groupedProductMainlineFixture.signal_clusters[0].id,
  });

  assert.equal(workspaceData.signal_clusters[0].grouped_evidence.direct_support.length, 1);
  assert.equal(viewState.selected_evidence_drawer.grouped_evidence_summary.total_grouped_evidence_count, 7);
  assertNoRawPrivateProviderFields(viewState.selected_evidence_drawer.grouped_evidence_sections);
});
