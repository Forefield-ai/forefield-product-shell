const test = require('node:test');
const assert = require('node:assert/strict');

const groupedProductMainlineFixture = require('../../fixtures/product/grouped-evidence-product-mainline.sample.json');
const minimalProductMainlineFixture = require('../../fixtures/product/product-mainline.sample.json');
const {
  buildTopicWorkspaceViewState,
} = require('../../src/product/read-models/build-topic-workspace-view-state');
const {
  createLocalRuntimeAdapter,
} = require('../../src/runtime/adapters/local-runtime-adapter');
const {
  buildProductMainlineCompatibilityPayload,
} = require('../../src/runtime/workspace/local-workspace-payload');
const {
  initialWorkspaceInteractionState,
  openEvidenceDrawer,
} = require('../../src/product/workspace/workspace-interaction-state');

const FIXED_NOW = '2026-05-05T12:00:00.000Z';
const GROUPED_CLUSTER_ID = 'signal_cluster_ps__p16c-grouped-evidence__r1';
const FALLBACK_CLUSTER_ID = 'signal_cluster_ps__p16c-grouped-evidence__fallback';
const FORBIDDEN_KEYS = new Set([
  'api_key',
  'author_id',
  'chain_of_thought',
  'private_id',
  'profile_id',
  'profile_url',
  'prompt',
  'provider_response',
  'raw_forum_text',
  'raw_provider_response',
  'raw_snippet',
  'raw_source_payload',
  'raw_source_text',
  'raw_text',
  'target_url',
]);

function createTopicFixture() {
  return {
    original_input: 'Track AI meeting notes pain for product teams',
    topic_summary: 'AI meeting notes workflow monitoring.',
    topic_name: 'AI meeting notes for product teams',
    target_audience: 'Product teams',
    problem_space: 'Meeting follow-up',
    monitoring_intent: 'Find recurring workflow friction.',
    signal_focus: ['pain_point', 'workaround'],
    competitors_alternatives: ['manual notes'],
  };
}

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

function assertNoRawPrivateProviderKeys(value) {
  collectKeys(value).forEach((key) => {
    assert.equal(FORBIDDEN_KEYS.has(key), false, `Unexpected forbidden key: ${key}`);
  });
}

function assertNoUrlValues(value) {
  assert.equal(/https?:\/\//i.test(JSON.stringify(value)), false);
}

function sectionById(drawerState, sectionId) {
  return drawerState.grouped_evidence_sections.find((section) => section.section_id === sectionId);
}

function createWorkspaceFlowProductMainline(productMainline = groupedProductMainlineFixture) {
  const adapter = createLocalRuntimeAdapter();
  const topic = adapter.topics.confirmTopicDraft(createTopicFixture(), {
    topicId: 'topic_rt__p16d_grouped_workspace',
    status: 'building',
    now: FIXED_NOW,
  });
  adapter.runs.startInitialReview(topic.id, {
    status: 'building',
    now: FIXED_NOW,
  });
  const workspaceData = adapter.workspace.getTopicWorkspace(topic.id, {
    productMainline,
  });

  return {
    workspaceData,
    productMainline: buildProductMainlineCompatibilityPayload(workspaceData, {
      productMainline,
    }),
  };
}

test('local workspace grouped evidence scenario loads through runtime payload', () => {
  const { workspaceData, productMainline } = createWorkspaceFlowProductMainline();

  assert.equal(workspaceData.signal_clusters.length, 2);
  assert.equal(workspaceData.signal_clusters[0].id, GROUPED_CLUSTER_ID);
  assert.equal(workspaceData.signal_clusters[1].id, FALLBACK_CLUSTER_ID);
  assert.equal(workspaceData.signal_clusters[0].grouped_evidence.direct_support.length, 1);
  assert.equal('grouped_evidence' in workspaceData.signal_clusters[1], false);
  assert.equal(productMainline.signal_clusters[0].grouped_evidence.discovery_leads.length, 1);
});

test('TopicWorkspace view state contains grouped evidence for grouped cluster', () => {
  const { productMainline } = createWorkspaceFlowProductMainline();
  const viewState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: GROUPED_CLUSTER_ID,
  });
  const groupedCluster = viewState.signal_cluster_sections.find(
    (section) => section.cluster_id === GROUPED_CLUSTER_ID
  );

  assert.equal(groupedCluster.drawer_available, true);
  assert.equal(groupedCluster.evidence_count, 0);
  assert.equal(groupedCluster.grouped_evidence_preview.direct_evidence_count, 1);
  assert.equal(groupedCluster.grouped_evidence_preview.counter_evidence_count, 1);
  assert.equal(groupedCluster.grouped_evidence_preview.discovery_lead_count, 1);
  assert.equal(groupedCluster.grouped_evidence_preview.total_grouped_evidence_count, 7);
  assert.equal(viewState.selected_evidence_drawer.grouped_evidence_summary.has_grouped_evidence, true);
});

test('TopicWorkspace view state preserves fallback for non-grouped cluster', () => {
  const { productMainline } = createWorkspaceFlowProductMainline();
  const viewState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: FALLBACK_CLUSTER_ID,
  });
  const fallbackCluster = viewState.signal_cluster_sections.find(
    (section) => section.cluster_id === FALLBACK_CLUSTER_ID
  );

  assert.equal(fallbackCluster.drawer_available, true);
  assert.equal(fallbackCluster.evidence_count, 1);
  assert.equal('grouped_evidence_preview' in fallbackCluster, false);
  assert.equal('grouped_evidence_summary' in viewState.selected_evidence_drawer, false);
  assert.equal(viewState.selected_evidence_drawer.evidence_items.length, 1);
});

test('EvidenceDrawer state separates grouped sections and preserves semantics', () => {
  const { productMainline } = createWorkspaceFlowProductMainline();
  const drawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: GROUPED_CLUSTER_ID,
  }).selected_evidence_drawer;

  assert.equal(sectionById(drawerState, 'direct_support').count, 1);
  assert.equal(sectionById(drawerState, 'counter_evidence').count, 1);
  assert.equal(sectionById(drawerState, 'weak_support').count, 1);
  assert.equal(sectionById(drawerState, 'trend_context').count, 1);
  assert.equal(sectionById(drawerState, 'competitive_context').count, 1);
  assert.equal(sectionById(drawerState, 'professional_context').count, 1);
  assert.equal(sectionById(drawerState, 'discovery_leads').count, 1);
  assert.equal(sectionById(drawerState, 'discovery_leads').caveat_label, 'Follow-up leads, not evidence yet.');
});

test('EvidenceDrawer state falls back when grouped evidence is absent', () => {
  const { productMainline } = createWorkspaceFlowProductMainline();
  const drawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: FALLBACK_CLUSTER_ID,
  }).selected_evidence_drawer;

  assert.equal(drawerState.evidence_items.length, 1);
  assert.equal(drawerState.evidence_items[0].summary, 'Fallback flat evidence summary for functional workspace flow validation.');
  assert.equal('grouped_evidence_sections' in drawerState, false);
});

test('workspace interaction state can open grouped and fallback drawer targets', () => {
  const groupedDrawerState = openEvidenceDrawer(initialWorkspaceInteractionState(), GROUPED_CLUSTER_ID);
  const fallbackDrawerState = openEvidenceDrawer(initialWorkspaceInteractionState(), FALLBACK_CLUSTER_ID);

  assert.equal(groupedDrawerState.drawer_state, 'open');
  assert.equal(groupedDrawerState.drawer_cluster_id, GROUPED_CLUSTER_ID);
  assert.equal(groupedDrawerState.selected_cluster_id, GROUPED_CLUSTER_ID);
  assert.equal(fallbackDrawerState.drawer_state, 'open');
  assert.equal(fallbackDrawerState.drawer_cluster_id, FALLBACK_CLUSTER_ID);
});

test('trend competitive professional weak discovery and counter do not inflate direct support', () => {
  const { productMainline } = createWorkspaceFlowProductMainline();
  const drawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: GROUPED_CLUSTER_ID,
  }).selected_evidence_drawer;
  const directCount = drawerState.grouped_evidence_summary.direct_evidence_count;
  const nonDirectSections = [
    'trend_context',
    'competitive_context',
    'professional_context',
    'weak_support',
    'discovery_leads',
    'counter_evidence',
  ];

  assert.equal(directCount, 1);
  nonDirectSections.forEach((sectionId) => {
    const section = sectionById(drawerState, sectionId);

    assert.equal(section.is_direct_evidence, false);
    assert.equal(
      section.items.some((item) => item.counts_toward_direct_evidence === true),
      false,
      `${sectionId} should not count as direct evidence`
    );
  });
});

test('counter evidence is preserved in workspace drawer state', () => {
  const { productMainline } = createWorkspaceFlowProductMainline();
  const drawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: GROUPED_CLUSTER_ID,
  }).selected_evidence_drawer;
  const counterSection = sectionById(drawerState, 'counter_evidence');

  assert.equal(counterSection.count, 1);
  assert.match(counterSection.items[0].summary, /current summary quality is sufficient/i);
  assert.equal(counterSection.items[0].counts_toward_direct_evidence, false);
});

test('workspace and drawer state expose no raw private provider fields or source URLs', () => {
  const { workspaceData, productMainline } = createWorkspaceFlowProductMainline();
  const groupedDrawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: GROUPED_CLUSTER_ID,
  }).selected_evidence_drawer;
  const fallbackDrawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: FALLBACK_CLUSTER_ID,
  }).selected_evidence_drawer;

  [workspaceData, groupedDrawerState, fallbackDrawerState].forEach((value) => {
    assertNoRawPrivateProviderKeys(value);
    assertNoUrlValues(value);
  });
});

test('existing v0.2 local workspace path still works', () => {
  const { workspaceData, productMainline } = createWorkspaceFlowProductMainline(minimalProductMainlineFixture);
  const viewState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: minimalProductMainlineFixture.signal_clusters[0].id,
  });

  assert.equal(workspaceData.signal_clusters.length, 1);
  assert.equal('grouped_evidence' in workspaceData.signal_clusters[0], false);
  assert.equal(viewState.signal_cluster_sections[0].evidence_count, 2);
  assert.equal('grouped_evidence_preview' in viewState.signal_cluster_sections[0], false);
  assert.equal(viewState.selected_evidence_drawer.evidence_items.length, 2);
});
