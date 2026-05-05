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
  buildBaselineBriefMarkdown,
  buildBaselineBriefViewState,
  summarizeBaselineBriefSections,
} = require('../../src/product/read-models/build-baseline-brief-view-state');
const {
  buildTopicWorkspaceViewState,
} = require('../../src/product/read-models/build-topic-workspace-view-state');

const SAMPLE_TOPIC_SCOPE = {
  topic_id: 'local_topic__p16e_baseline_brief',
  topic_status: 'ready',
  topic_name: 'AI meeting notes for product teams',
  topic_summary: 'AI meeting notes workflow monitoring.',
  target_audience: 'Product teams',
  problem_space: 'Meeting follow-up',
  monitoring_intent: 'Find recurring workflow friction.',
};
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
  'source_url',
  'target_url',
  'url',
]);

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

function buildBriefViewState(productMainline) {
  return buildBaselineBriefViewState({
    workspaceViewState: buildTopicWorkspaceViewState(productMainline),
    evidenceDrawersByClusterId: buildEvidenceDrawersByClusterId(productMainline),
    briefState: buildBaselineBriefState({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline,
    }),
  });
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

function sectionById(briefViewState, sectionId) {
  return briefViewState.evidenceHighlights.find((section) => section.sectionId === sectionId);
}

test('buildBaselineBriefViewState generates brief from grouped evidence workspace state', () => {
  const briefViewState = buildBriefViewState(groupedProductMainlineFixture);

  assert.equal(briefViewState.briefTitle, 'Baseline Brief');
  assert.equal(briefViewState.hasGroupedEvidence, true);
  assert.equal(briefViewState.fallbackMode, false);
  assert.equal(briefViewState.copyableMarkdown, briefViewState.markdown);
  assert.equal(briefViewState.clusterBriefs.length, 2);
  assert.equal(
    briefViewState.clusterBriefs.find((cluster) => cluster.clusterId === GROUPED_CLUSTER_ID).hasGroupedEvidence,
    true
  );
  assert.equal(
    briefViewState.clusterBriefs.find((cluster) => cluster.clusterId === FALLBACK_CLUSTER_ID).fallbackMode,
    true
  );
});

test('buildBaselineBriefMarkdown includes required functional sections', () => {
  const briefViewState = buildBriefViewState(groupedProductMainlineFixture);
  const markdown = buildBaselineBriefMarkdown(briefViewState);

  assert.match(markdown, /# Baseline Brief/);
  assert.match(markdown, /## Topic/);
  assert.match(markdown, /## Review Summary/);
  assert.match(markdown, /## Key Signal Clusters/);
  assert.match(markdown, /## Evidence Highlights/);
  assert.match(markdown, /## Caveats/);
});

test('direct support count is strict and contextual sections do not inflate it', () => {
  const briefViewState = buildBriefViewState(groupedProductMainlineFixture);
  const summary = summarizeBaselineBriefSections(briefViewState);

  assert.equal(summary.counts_by_section.direct_support, 2);
  assert.equal(summary.counts_by_section.trend_context, 1);
  assert.equal(summary.counts_by_section.discovery_leads, 1);
  assert.equal(summary.counts_by_section.competitive_context, 1);
  assert.equal(summary.direct_evidence_count, 2);
  assert.equal(briefViewState.reviewOutcome.directEvidenceCount, 2);
});

test('trend context discovery leads and competitive context are labeled as non-evidence context', () => {
  const briefViewState = buildBriefViewState(groupedProductMainlineFixture);

  assert.equal(sectionById(briefViewState, 'trend_context').isDirectEvidence, false);
  assert.equal(sectionById(briefViewState, 'discovery_leads').isDirectEvidence, false);
  assert.equal(sectionById(briefViewState, 'competitive_context').isDirectEvidence, false);
  assert.match(briefViewState.markdown, /Trend context does not prove user demand/);
  assert.match(briefViewState.markdown, /Discovery leads are not evidence yet/);
  assert.match(briefViewState.markdown, /Competitive\/vendor context does not prove user demand by itself/);
});

test('counter evidence is preserved separately from direct support', () => {
  const briefViewState = buildBriefViewState(groupedProductMainlineFixture);
  const counterSection = sectionById(briefViewState, 'counter_evidence');

  assert.equal(counterSection.isDirectEvidence, false);
  assert.equal(counterSection.count, 1);
  assert.equal(briefViewState.counterEvidenceSummary.preserved, true);
  assert.match(briefViewState.markdown, /Counter Evidence/);
  assert.match(briefViewState.markdown, /current summary quality is sufficient/i);
});

test('brief output excludes raw private provider fields and source URLs', () => {
  const briefViewStates = [
    buildBriefViewState(groupedProductMainlineFixture),
    buildBriefViewState(minimalProductMainlineFixture),
  ];

  briefViewStates.forEach((briefViewState) => {
    collectKeys(briefViewState).forEach((key) => {
      assert.equal(FORBIDDEN_KEYS.has(key), false, `Unexpected forbidden key: ${key}`);
    });

    assert.equal(/https?:\/\//i.test(JSON.stringify(briefViewState)), false);
    assert.equal(/https?:\/\//i.test(briefViewState.copyableMarkdown), false);
  });
});

test('brief works when grouped evidence is absent and marks fallback mode', () => {
  const briefViewState = buildBriefViewState(minimalProductMainlineFixture);

  assert.equal(briefViewState.hasGroupedEvidence, false);
  assert.equal(briefViewState.fallbackMode, true);
  assert.equal(briefViewState.clusterBriefs.length, 1);
  assert.equal(briefViewState.evidenceHighlights.length, 1);
  assert.equal(sectionById(briefViewState, 'direct_support').fallbackMode, true);
  assert.match(briefViewState.markdown, /Using v0\.2 flat evidence fallback/);
  assert.doesNotMatch(briefViewState.markdown, /example\.com/);
});

test('browser-safe baseline brief view builder stays aligned with CommonJS builder', async () => {
  const browserModule = await import('../../src/product/read-models/build-baseline-brief-view-state.browser.mjs');
  const browserBriefViewState = browserModule.buildBaselineBriefViewState({
    workspaceViewState: buildTopicWorkspaceViewState(groupedProductMainlineFixture),
    evidenceDrawersByClusterId: buildEvidenceDrawersByClusterId(groupedProductMainlineFixture),
    briefState: buildBaselineBriefState({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: groupedProductMainlineFixture,
    }),
  });
  const commonJsBriefViewState = buildBriefViewState(groupedProductMainlineFixture);

  assert.deepEqual(browserBriefViewState, commonJsBriefViewState);
  assert.equal(
    browserModule.buildBaselineBriefMarkdown(browserBriefViewState),
    buildBaselineBriefMarkdown(commonJsBriefViewState)
  );
  assert.deepEqual(
    browserModule.summarizeBaselineBriefSections(browserBriefViewState),
    summarizeBaselineBriefSections(commonJsBriefViewState)
  );
});

test('BriefPreview can receive copyable markdown state through the functional preview path', () => {
  const componentSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/ui/components/BriefPreview.jsx'),
    'utf8'
  );

  assert.match(componentSource, /baselineBriefViewState/);
  assert.match(componentSource, /copyableMarkdown/);
  assert.match(componentSource, /Copyable Markdown Draft/);
});
