const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const groupedProductMainline = require('../../fixtures/product/grouped-evidence-product-mainline.sample.json');
const minimalProductMainline = require('../../fixtures/product/product-mainline.sample.json');
const runtimeWorkspacePayload = require('../../fixtures/external/decision-core/initial-review-runtime-workspace-payload.partial.sample.json');
const {
  createDecisionCoreClient,
} = require('../../src/runtime/api/decision-core-client');
const {
  createApiRuntimeAdapter,
} = require('../../src/runtime/adapters/api-runtime-adapter');
const {
  normalizeRemoteWorkspacePayload,
  validateRemoteWorkspacePayload,
} = require('../../src/runtime/workspace/remote-workspace-payload');
const {
  createLocalRuntimeAdapter,
} = require('../../src/runtime/adapters/local-runtime-adapter');
const {
  buildTopicWorkspaceViewState,
} = require('../../src/product/read-models/build-topic-workspace-view-state');
const {
  buildBaselineBriefState,
} = require('../../src/product/read-models/build-baseline-brief-state');
const {
  buildBaselineBriefViewState,
} = require('../../src/product/read-models/build-baseline-brief-view-state');

const WORKSPACE_ID = 'workspace:p18a:runtime';

function remotePayload(productMainline = groupedProductMainline) {
  return {
    workspace_payload_version: 'forefield_workspace_payload_v1',
    payload_kind: 'product_workspace_payload',
    payload_source: 'review_handoff_v0_3_runtime_minimal',
    workspace_id: WORKSPACE_ID,
    initial_review_run_id: 'initial-review-run:p18a:runtime',
    built_at: '2026-05-06T16:00:00.000Z',
    product_mainline_payload: productMainline,
    caveats: ['Remote payload is product-shell compatible.'],
  };
}

function buildEvidenceDrawersByClusterId(productMainline) {
  const workspaceState = buildTopicWorkspaceViewState(productMainline);

  return workspaceState.signal_cluster_sections.reduce((accumulator, section) => {
    const selectedState = buildTopicWorkspaceViewState(productMainline, {
      selectedClusterId: section.cluster_id,
    });

    if (selectedState.selected_evidence_drawer) {
      accumulator[section.cluster_id] = selectedState.selected_evidence_drawer;
    }

    return accumulator;
  }, {});
}

function assertNoForbiddenSerializedFields(value) {
  const serialized = JSON.stringify(value);

  [
    'raw_text',
    'raw_source_payload',
    'provider_response',
    'api_key',
    'chain_of_thought',
    'source_candidate_outputs',
  ].forEach((term) => {
    assert.equal(serialized.includes(term), false, `${term} should not appear`);
  });
  assert.equal(serialized.includes('"review_handoff_v0_3"'), false, 'review_handoff_v0_3 field should not appear');
}

test('DecisionCore API client loads mocked workspace payload through injected fetch', async () => {
  const calls = [];
  const client = createDecisionCoreClient({
    baseUrl: 'https://example.test',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => remotePayload(),
      };
    },
  });

  const payload = await client.getWorkspacePayload(WORKSPACE_ID);

  assert.equal(payload.workspace_id, WORKSPACE_ID);
  assert.equal(calls[0].url, `https://example.test/api/workspaces/${encodeURIComponent(WORKSPACE_ID)}`);
  assert.equal(calls[0].options.method, 'GET');
});

test('API runtime adapter normalizes remote payload and builds workspace/drawer/brief states', async () => {
  const adapter = createApiRuntimeAdapter({
    decisionCoreClient: {
      getWorkspacePayload: async () => remotePayload(),
      getRun: async () => ({ id: 'initial-review-run:p18a:runtime', status: 'workspace_ready' }),
    },
  });
  const productMainline = await adapter.workspace.getProductMainline(WORKSPACE_ID);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const groupedCluster = workspaceState.signal_cluster_sections.find((section) =>
    section.grouped_evidence_preview?.has_grouped_evidence === true
  );
  const drawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId: groupedCluster.cluster_id,
  }).selected_evidence_drawer;
  const briefState = buildBaselineBriefViewState({
    workspaceViewState: workspaceState,
    evidenceDrawersByClusterId: buildEvidenceDrawersByClusterId(productMainline),
    briefState: buildBaselineBriefState({ productMainline }),
  });

  assert.equal(workspaceState.signal_cluster_sections.length, 2);
  assert.equal(groupedCluster.grouped_evidence_preview.direct_support_count, 1);
  assert.equal(drawerState.grouped_evidence_summary.direct_evidence_count, 1);
  assert.match(briefState.copyableMarkdown, /## Evidence Highlights/);
  assert.match(briefState.copyableMarkdown, /Discovery leads are not evidence yet/);
  assertNoForbiddenSerializedFields(productMainline);
  assertNoForbiddenSerializedFields(workspaceState);
  assertNoForbiddenSerializedFields(drawerState);
  assertNoForbiddenSerializedFields(briefState);
});

test('API runtime adapter accepts runtime workspace payload with partial source coverage', async () => {
  const adapter = createApiRuntimeAdapter({
    decisionCoreClient: {
      getWorkspacePayload: async () => runtimeWorkspacePayload,
      getRun: async () => ({ id: runtimeWorkspacePayload.initial_review_run_id, status: 'workspace_ready' }),
    },
  });
  const normalizedPayload = await adapter.workspace.getWorkspacePayload(runtimeWorkspacePayload.workspace_id);
  const productMainline = await adapter.workspace.getProductMainline(runtimeWorkspacePayload.workspace_id);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const selectedClusterId = workspaceState.signal_cluster_sections[0].cluster_id;
  const drawerState = buildTopicWorkspaceViewState(productMainline, {
    selectedClusterId,
  }).selected_evidence_drawer;
  const briefState = buildBaselineBriefViewState({
    workspaceViewState: workspaceState,
    evidenceDrawersByClusterId: buildEvidenceDrawersByClusterId(productMainline),
    briefState: buildBaselineBriefState({ productMainline }),
  });

  assert.equal(validateRemoteWorkspacePayload(runtimeWorkspacePayload).ok, true);
  assert.equal(normalizedPayload.source_coverage_summary.partial_source_failure, true);
  assert.equal(workspaceState.source_coverage_strip.partial_source_failure, true);
  assert.equal(workspaceState.source_coverage_strip.failed_count, 3);
  assert.equal(workspaceState.source_coverage_strip.succeeded_count, 3);
  assert.equal(workspaceState.source_coverage_strip.per_source.length, 6);
  assert.equal(
    workspaceState.source_coverage_strip.per_source.find((entry) => entry.source_name === 'google_forum').failure_code,
    'serpapi_http_429'
  );
  assert.equal(workspaceState.source_coverage_strip.raw_private_field_violation_count, 0);
  assert.equal(drawerState.grouped_evidence_summary.direct_evidence_count, 1);
  assert.equal(
    drawerState.grouped_evidence_sections.find((section) => section.section_id === 'counter_evidence').count,
    1
  );
  assert.match(briefState.copyableMarkdown, /## Review Summary/);
  assert.match(briefState.copyableMarkdown, /Counter Evidence/);
  assertNoForbiddenSerializedFields(runtimeWorkspacePayload);
  assertNoForbiddenSerializedFields(normalizedPayload);
  assertNoForbiddenSerializedFields(workspaceState);
  assertNoForbiddenSerializedFields(drawerState);
  assertNoForbiddenSerializedFields(briefState);
});

test('remote workspace payload rejects raw/private/provider and decision-core internal fields', () => {
  assert.equal(validateRemoteWorkspacePayload(remotePayload()).ok, true);

  [
    { raw_text: 'raw live content' },
    { provider_response: { raw: true } },
    { review_handoff_v0_3: { handoff_version: '0.3.0-decision-core-review-handoff' } },
    { product_mainline_payload: { ...groupedProductMainline, source_candidate_outputs: [] } },
  ].forEach((patch) => {
    assert.throws(
      () => normalizeRemoteWorkspacePayload({
        ...remotePayload(),
        ...patch,
      }),
      /forbidden fields/
    );
  });
});

test('v0.2 fallback and local fixture adapter still work', () => {
  const v02WorkspaceState = buildTopicWorkspaceViewState(minimalProductMainline, {
    selectedClusterId: minimalProductMainline.signal_clusters[0].id,
  });
  const localAdapter = createLocalRuntimeAdapter();
  const draft = localAdapter.topics.createTopicDraft('AI meeting notes for product teams');
  const topic = localAdapter.topics.confirmTopicDraft(draft, { now: '2026-05-06T16:00:00.000Z' });
  const run = localAdapter.runs.startInitialReview(topic.id, { now: '2026-05-06T16:00:00.000Z' });
  const localWorkspace = localAdapter.workspace.getTopicWorkspace(topic.id);

  assert.equal(v02WorkspaceState.signal_cluster_sections.length, 1);
  assert.equal(v02WorkspaceState.selected_evidence_drawer.evidence_items.length, 2);
  assert.equal(run.topic_id, topic.id);
  assert.equal(localWorkspace.topic.id, topic.id);
});

test('product-shell runtime API modules do not import decision-core internals', () => {
  const runtimeRoot = path.join(__dirname, '..', '..', 'src', 'runtime');
  const files = collectJavaScriptFiles(runtimeRoot);

  files.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    assert.equal(/forefield-decision-core/i.test(source), false, `decision-core repo import found in ${filePath}`);
    assert.equal(/require\((['"`]).*src[\\/].*contracts.*\1\)/i.test(source), false, `decision-core contract import pattern found in ${filePath}`);
  });
});

function collectJavaScriptFiles(rootPath) {
  return fs.readdirSync(rootPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(fullPath);
    return entry.isFile() && fullPath.endsWith('.js') ? [fullPath] : [];
  });
}
