const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRuntimeAdapterFromConfig,
  resolveProductShellRuntimeMode,
} = require('../../src/runtime/adapters/runtime-adapter-selector');
const {
  RUNTIME_MODES,
} = require('../../src/runtime/contracts/runtime-adapter-contract');

test('runtime adapter selector keeps local mode by default and selects API mode by config', () => {
  const previousRuntimeMode = process.env.VITE_FOREFIELD_RUNTIME_MODE;

  try {
    delete process.env.VITE_FOREFIELD_RUNTIME_MODE;

    assert.equal(resolveProductShellRuntimeMode(), RUNTIME_MODES.LOCAL);
    assert.equal(resolveProductShellRuntimeMode({ mode: 'api' }), RUNTIME_MODES.API);

    process.env.VITE_FOREFIELD_RUNTIME_MODE = 'api';
    assert.equal(resolveProductShellRuntimeMode(), RUNTIME_MODES.API);
  } finally {
    if (previousRuntimeMode === undefined) {
      delete process.env.VITE_FOREFIELD_RUNTIME_MODE;
    } else {
      process.env.VITE_FOREFIELD_RUNTIME_MODE = previousRuntimeMode;
    }
  }
});

test('runtime adapter selector creates API adapter without breaking local fixture adapter', async () => {
  const calls = [];
  const apiAdapter = createRuntimeAdapterFromConfig({
    mode: 'api',
    decisionCoreClient: {
      createInitialReviewRun: async (topicInput, options) => {
        calls.push({ topicInput, options });
        return {
          run_id: 'initial-review-run:test:api',
          workspace_id: 'workspace:test:api',
          status: 'workspace_ready',
        };
      },
      getWorkspacePayload: async () => ({
        workspace_payload_version: 'forefield_workspace_payload_v1',
        payload_kind: 'product_workspace_payload',
        payload_source: 'test_api_runtime_payload',
        workspace_id: 'workspace:test:api',
        initial_review_run_id: 'initial-review-run:test:api',
        built_at: '2026-05-06T22:00:00.000Z',
        product_mainline_payload: require('../../fixtures/product/grouped-evidence-product-mainline.sample.json'),
        caveats: ['API runtime adapter test payload.'],
      }),
      getRun: async () => ({
        run_id: 'initial-review-run:test:api',
        workspace_id: 'workspace:test:api',
        status: 'workspace_ready',
      }),
    },
  });
  const apiResult = await apiAdapter.workspace.createRunAndGetWorkspacePayload({
    topic_input: 'AI meeting notes for product teams',
  }, {
    mode: 'mocked',
  });
  const localAdapter = createRuntimeAdapterFromConfig();
  const localDraft = localAdapter.topics.createTopicDraft('AI meeting notes for product teams');

  assert.equal(apiAdapter.mode, RUNTIME_MODES.API);
  assert.equal(apiResult.run.workspace_id, 'workspace:test:api');
  assert.equal(apiResult.product_mainline_payload.signal_clusters.length, 2);
  assert.equal(calls[0].topicInput.topic_input, 'AI meeting notes for product teams');
  assert.equal(calls[0].options.mode, 'mocked');
  assert.equal(localAdapter.mode, RUNTIME_MODES.LOCAL);
  assert.equal(localDraft.topic_name.length > 0, true);
});

test('deployed API mode requires a non-local configured backend URL', () => {
  assert.throws(
    () => createRuntimeAdapterFromConfig({
      mode: 'api',
      deploymentMode: 'deployed',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    }),
    /invalid_backend_url/
  );

  const apiAdapter = createRuntimeAdapterFromConfig({
    mode: 'api',
    deploymentMode: 'deployed',
    baseUrl: 'https://api.forefield.example',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ ok: true, status: 'ready' }),
    }),
  });
  const localAdapter = createRuntimeAdapterFromConfig({
    mode: 'local',
    deploymentMode: 'deployed',
  });

  assert.equal(apiAdapter.mode, RUNTIME_MODES.API);
  assert.equal(localAdapter.mode, RUNTIME_MODES.LOCAL);
});

test('local website runtime acceptance smoke reaches workspace drawer and brief through HTTP API mode', async () => {
  const {
    runLocalWebsiteRuntimeAcceptance,
  } = await import('../../scripts/smoke/local-website-runtime-acceptance.mjs');
  const summary = await runLocalWebsiteRuntimeAcceptance();

  assert.equal(summary.ok, true);
  assert.equal(summary.mode, 'local_website_runtime_acceptance');
  assert.equal(summary.runtime_adapter_mode, RUNTIME_MODES.API);
  assert.equal(summary.live_provider_calls, false);
  assert.equal(summary.create_run_ok, true);
  assert.equal(summary.workspace_payload_loaded, true);
  assert.equal(summary.topic_workspace_state_built, true);
  assert.equal(summary.signal_cluster_count > 0, true);
  assert.equal(summary.evidence_drawer_state_built, true);
  assert.equal(summary.baseline_brief_state_built, true);
  assert.equal(summary.copyable_markdown_present, true);
  assert.equal(summary.raw_private_field_violation_count, 0);
  assert.equal(summary.failure_code, null);
});
