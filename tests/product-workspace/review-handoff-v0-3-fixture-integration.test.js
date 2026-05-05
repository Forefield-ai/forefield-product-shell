const test = require('node:test');
const assert = require('node:assert/strict');

const reviewHandoffV03Fixture = require('../../fixtures/external/decision-core/review-handoff-v0-3-shadow.sample.json');
const groupedProductMainlineFixture = require('../../fixtures/product/grouped-evidence-product-mainline.sample.json');
const minimalProductMainlineFixture = require('../../fixtures/product/product-mainline.sample.json');
const {
  mapDecisionCoreReviewHandoffV03ToProductMainline,
} = require('../../src/product/mappers/map-decision-core-review-handoff-v0-3-to-product-mainline');
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

const FIXED_NOW = '2026-05-05T12:00:00.000Z';
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
  'source_url',
  'target_url',
  'url',
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

function assertNoRawPrivateSourceProviderFields(value) {
  collectKeys(value).forEach((key) => {
    assert.equal(FORBIDDEN_KEYS.has(key), false, `Unexpected forbidden key: ${key}`);
  });
  assert.equal(/https?:\/\//i.test(JSON.stringify(value)), false);
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

function sectionById(drawerState, sectionId) {
  return drawerState.grouped_evidence_sections.find((section) => section.section_id === sectionId);
}

test('decision-core v0.3 shadow fixture is sanitized and maps to product workspace state', () => {
  assert.equal(reviewHandoffV03Fixture.handoff_version, '0.3.0-decision-core-review-handoff');
  assert.equal(reviewHandoffV03Fixture.grouped_evidence_support.schema_version, 'grouped_evidence_v1');
  assertNoRawPrivateSourceProviderFields(reviewHandoffV03Fixture);

  const productMainline = mapDecisionCoreReviewHandoffV03ToProductMainline(reviewHandoffV03Fixture, {
    importedAt: FIXED_NOW,
    idPrefix: 'p16h',
  });
  const workspaceViewState = buildTopicWorkspaceViewState(productMainline);
  const groupedCluster = workspaceViewState.signal_cluster_sections[0];

  assert.equal(productMainline.monitoring_run.handoff_version, '0.3.0-decision-core-review-handoff');
  assert.equal(productMainline.topic_draft.title, 'AI meeting notes for product teams');
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceViewState.review_summary.signal_cluster_count, 1);
  assert.equal(groupedCluster.grouped_evidence_preview.has_grouped_evidence, true);
  assert.equal(groupedCluster.grouped_evidence_preview.direct_support_count, 1);
  assert.equal(groupedCluster.grouped_evidence_preview.counter_evidence_count, 1);
  assert.equal(groupedCluster.grouped_evidence_preview.discovery_lead_count, 1);
  assert.equal(groupedCluster.display_evidence_count, 1);
  assert.equal(groupedCluster.display_total_grouped_evidence_count, 7);
  assertNoRawPrivateSourceProviderFields(productMainline);
  assertNoRawPrivateSourceProviderFields(workspaceViewState);
});

test('v0.3 fixture drives Evidence Drawer grouped sections and strict direct evidence count', () => {
  const productMainline = mapDecisionCoreReviewHandoffV03ToProductMainline(reviewHandoffV03Fixture, {
    importedAt: FIXED_NOW,
    idPrefix: 'p16h',
  });
  const workspaceViewState = buildTopicWorkspaceViewState(productMainline);
  const clusterId = workspaceViewState.signal_cluster_sections[0].cluster_id;
  const drawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: clusterId,
  }).selected_evidence_drawer;

  assert.equal(drawerState.grouped_evidence_summary.has_grouped_evidence, true);
  assert.equal(drawerState.grouped_evidence_summary.direct_evidence_count, 1);
  assert.equal(drawerState.grouped_evidence_summary.total_grouped_evidence_count, 7);
  assert.equal(sectionById(drawerState, 'direct_support').count, 1);
  assert.equal(sectionById(drawerState, 'counter_evidence').count, 1);
  assert.equal(sectionById(drawerState, 'discovery_leads').count, 1);
  assert.equal(sectionById(drawerState, 'trend_context').items[0].counts_toward_direct_evidence, false);
  assert.equal(sectionById(drawerState, 'competitive_context').items[0].counts_toward_direct_evidence, false);
  assert.equal(sectionById(drawerState, 'professional_context').items[0].counts_toward_direct_evidence, false);
  assert.equal(sectionById(drawerState, 'weak_support').items[0].counts_toward_direct_evidence, false);
  assert.equal(sectionById(drawerState, 'counter_evidence').items[0].counts_toward_direct_evidence, false);
  assert.equal(sectionById(drawerState, 'discovery_leads').items[0].counts_toward_direct_evidence, false);
  assertNoRawPrivateSourceProviderFields(drawerState);
});

test('v0.3 fixture generates Baseline Brief with grouped evidence semantics', () => {
  const productMainline = mapDecisionCoreReviewHandoffV03ToProductMainline(reviewHandoffV03Fixture, {
    importedAt: FIXED_NOW,
    idPrefix: 'p16h',
  });
  const workspaceViewState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({
    productMainline,
    topicScope: {
      topic_status: 'ready',
    },
  });
  const briefViewState = buildBaselineBriefViewState({
    workspaceViewState,
    evidenceDrawersByClusterId: buildEvidenceDrawersByClusterId(productMainline),
    briefState,
  });
  const briefSummary = summarizeBaselineBriefSections(briefViewState);

  assert.equal(briefViewState.hasGroupedEvidence, true);
  assert.equal(briefSummary.direct_evidence_count, 1);
  assert.equal(briefSummary.counter_evidence_count, 1);
  assert.equal(briefSummary.discovery_lead_count, 1);
  assert.match(briefViewState.copyableMarkdown, /## Topic/);
  assert.match(briefViewState.copyableMarkdown, /## Review Summary/);
  assert.match(briefViewState.copyableMarkdown, /## Key Signal Clusters/);
  assert.match(briefViewState.copyableMarkdown, /## Evidence Highlights/);
  assert.match(briefViewState.copyableMarkdown, /## Caveats/);
  assert.match(briefViewState.copyableMarkdown, /Discovery leads are not evidence yet/);
  assert.match(briefViewState.copyableMarkdown, /Trend context does not prove user demand by itself/);
  assert.match(briefViewState.copyableMarkdown, /Counter Evidence/);
  assertNoRawPrivateSourceProviderFields(briefViewState);
});

test('v0.2 local workspace fixture and P16-G local demo fixture still build', () => {
  const v02WorkspaceViewState = buildTopicWorkspaceViewState(minimalProductMainlineFixture, {
    selectedClusterId: minimalProductMainlineFixture.signal_clusters[0].id,
  });
  const groupedDemoWorkspaceViewState = buildTopicWorkspaceViewState(groupedProductMainlineFixture);

  assert.equal(v02WorkspaceViewState.signal_cluster_sections.length, 1);
  assert.equal('grouped_evidence_preview' in v02WorkspaceViewState.signal_cluster_sections[0], false);
  assert.equal(v02WorkspaceViewState.selected_evidence_drawer.evidence_items.length, 2);
  assert.equal(groupedDemoWorkspaceViewState.signal_cluster_sections.length, 2);
  assert.equal(
    groupedDemoWorkspaceViewState.signal_cluster_sections.some(
      (section) => section.grouped_evidence_preview?.has_grouped_evidence === true
    ),
    true
  );
});
