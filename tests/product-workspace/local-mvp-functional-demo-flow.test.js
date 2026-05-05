const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const groupedProductMainlineFixture = require('../../fixtures/product/grouped-evidence-product-mainline.sample.json');
const minimalProductMainlineFixture = require('../../fixtures/product/product-mainline.sample.json');
const {
  buildBaselineBriefState,
} = require('../../src/product/read-models/build-baseline-brief-state');
const {
  buildBaselineBriefViewState,
  summarizeBaselineBriefSections,
} = require('../../src/product/read-models/build-baseline-brief-view-state');
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
  selectCluster,
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

function assertNoRawPrivateSourceProviderFields(value) {
  collectKeys(value).forEach((key) => {
    assert.equal(FORBIDDEN_KEYS.has(key), false, `Unexpected forbidden key: ${key}`);
  });
  assert.equal(/https?:\/\//i.test(JSON.stringify(value)), false);
}

function sectionById(drawerState, sectionId) {
  return drawerState.grouped_evidence_sections.find((section) => section.section_id === sectionId);
}

function buildEvidenceDrawersByClusterId(productMainline) {
  const workspaceViewState = buildTopicWorkspaceViewState(productMainline);

  return workspaceViewState.signal_cluster_sections.reduce((accumulator, signalClusterSection) => {
    const selectedViewState = buildTopicWorkspaceViewState(productMainline, {
      selectedClusterId: signalClusterSection.cluster_id,
    });

    if (selectedViewState.selected_evidence_drawer) {
      accumulator[signalClusterSection.cluster_id] = selectedViewState.selected_evidence_drawer;
    }

    return accumulator;
  }, {});
}

function createLocalDemoProductMainline(productMainline = groupedProductMainlineFixture) {
  const adapter = createLocalRuntimeAdapter();
  const topicDraft = createTopicFixture();
  const topic = adapter.topics.confirmTopicDraft(topicDraft, {
    topicId: 'topic_rt__p16f_local_mvp_demo',
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
  const compatibilityProductMainline = buildProductMainlineCompatibilityPayload(workspaceData, {
    productMainline,
  });

  return {
    adapter,
    topic,
    topicDraft,
    workspaceData,
    productMainline: compatibilityProductMainline,
  };
}

test('local MVP demo flow validates grouped workspace drawer and baseline brief state', () => {
  const { topic, workspaceData, productMainline } = createLocalDemoProductMainline();
  const workspaceViewState = buildTopicWorkspaceViewState(productMainline);
  const groupedCluster = workspaceViewState.signal_cluster_sections.find(
    (section) => section.cluster_id === GROUPED_CLUSTER_ID
  );
  const fallbackCluster = workspaceViewState.signal_cluster_sections.find(
    (section) => section.cluster_id === FALLBACK_CLUSTER_ID
  );
  const groupedDrawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: GROUPED_CLUSTER_ID,
  }).selected_evidence_drawer;
  const fallbackDrawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: FALLBACK_CLUSTER_ID,
  }).selected_evidence_drawer;
  const selectedClusterState = selectCluster(initialWorkspaceInteractionState(), GROUPED_CLUSTER_ID);
  const openGroupedDrawerState = openEvidenceDrawer(selectedClusterState, GROUPED_CLUSTER_ID);
  const briefState = buildBaselineBriefState({
    topicScope: {
      topic_id: topic.id,
      topic_status: 'ready',
      topic_name: topic.topic_name,
      topic_summary: topic.topic_summary,
      target_audience: 'Product teams',
      problem_space: 'Meeting follow-up',
      monitoring_intent: 'Find recurring workflow friction.',
    },
    productMainline,
  });
  const briefViewState = buildBaselineBriefViewState({
    workspaceViewState,
    evidenceDrawersByClusterId: buildEvidenceDrawersByClusterId(productMainline),
    briefState,
  });
  const briefSummary = summarizeBaselineBriefSections(briefViewState);

  assert.equal(workspaceData.signal_clusters.length, 2);
  assert.equal(workspaceViewState.review_summary.signal_cluster_count, 2);
  assert.equal(groupedCluster.drawer_available, true);
  assert.equal(groupedCluster.grouped_evidence_preview.direct_evidence_count, 1);
  assert.equal(groupedCluster.grouped_evidence_preview.counter_evidence_count, 1);
  assert.equal(groupedCluster.grouped_evidence_preview.discovery_lead_count, 1);
  assert.equal(openGroupedDrawerState.drawer_state, 'open');
  assert.equal(openGroupedDrawerState.drawer_cluster_id, GROUPED_CLUSTER_ID);

  assert.equal(groupedDrawerState.grouped_evidence_summary.has_grouped_evidence, true);
  assert.equal(sectionById(groupedDrawerState, 'direct_support').count, 1);
  assert.equal(sectionById(groupedDrawerState, 'counter_evidence').count, 1);
  assert.equal(sectionById(groupedDrawerState, 'discovery_leads').count, 1);
  assert.equal(sectionById(groupedDrawerState, 'discovery_leads').caveat_label, 'Follow-up leads, not evidence yet.');

  assert.equal(fallbackCluster.drawer_available, true);
  assert.equal('grouped_evidence_preview' in fallbackCluster, false);
  assert.equal('grouped_evidence_summary' in fallbackDrawerState, false);
  assert.equal(fallbackDrawerState.evidence_items.length, 1);

  assert.equal(briefViewState.hasGroupedEvidence, true);
  assert.equal(briefViewState.copyableMarkdown, briefViewState.markdown);
  assert.match(briefViewState.copyableMarkdown, /## Topic/);
  assert.match(briefViewState.copyableMarkdown, /## Review Summary/);
  assert.match(briefViewState.copyableMarkdown, /## Key Signal Clusters/);
  assert.match(briefViewState.copyableMarkdown, /## Evidence Highlights/);
  assert.match(briefViewState.copyableMarkdown, /## Caveats/);
  assert.match(briefViewState.copyableMarkdown, /Discovery leads are not evidence yet/);
  assert.match(briefViewState.copyableMarkdown, /Trend context does not prove user demand/);
  assert.equal(briefSummary.direct_evidence_count, 2);
  assert.equal(briefSummary.counter_evidence_count, 1);
  assert.equal(briefSummary.discovery_lead_count, 1);

  [
    workspaceData,
    workspaceViewState,
    groupedDrawerState,
    fallbackDrawerState,
    briefViewState,
  ].forEach(assertNoRawPrivateSourceProviderFields);
});

test('local MVP demo fixture is exposed in the development selector and App fixture map', () => {
  const appSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/ui/App.jsx'),
    'utf8'
  );
  const selectorSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/ui/components/DebugFixtureSelector.jsx'),
    'utf8'
  );

  assert.match(appSource, /groupedEvidenceProductMainline/);
  assert.match(appSource, /grouped_evidence/);
  assert.match(selectorSource, /Grouped evidence review snapshot/);
});

test('local MVP demo flow preserves v0.2 fallback workspace behavior', () => {
  const { workspaceData, productMainline } = createLocalDemoProductMainline(minimalProductMainlineFixture);
  const workspaceViewState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: minimalProductMainlineFixture.signal_clusters[0].id,
  });
  const briefState = buildBaselineBriefState({
    topicScope: {
      topic_id: 'topic_rt__p16f_v02_fallback',
      topic_status: 'ready',
    },
    productMainline,
  });
  const briefViewState = buildBaselineBriefViewState({
    workspaceViewState,
    evidenceDrawersByClusterId: buildEvidenceDrawersByClusterId(productMainline),
    briefState,
  });

  assert.equal(workspaceData.signal_clusters.length, 1);
  assert.equal('grouped_evidence' in workspaceData.signal_clusters[0], false);
  assert.equal(workspaceViewState.signal_cluster_sections[0].evidence_count, 2);
  assert.equal('grouped_evidence_preview' in workspaceViewState.signal_cluster_sections[0], false);
  assert.equal(workspaceViewState.selected_evidence_drawer.evidence_items.length, 2);
  assert.equal(briefViewState.hasGroupedEvidence, false);
  assert.equal(briefViewState.fallbackMode, true);
  assert.match(briefViewState.copyableMarkdown, /Using v0\.2 flat evidence fallback/);
  assert.doesNotMatch(briefViewState.copyableMarkdown, /example\.com/);
});
