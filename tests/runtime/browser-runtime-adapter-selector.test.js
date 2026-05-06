const test = require('node:test');
const assert = require('node:assert/strict');

test('browser API runtime adapter creates run with injected client', async () => {
  const {
    createApiRuntimeAdapter,
  } = await import('../../src/runtime/adapters/api-runtime-adapter.browser.mjs');
  const {
    RUNTIME_MODES,
  } = await import('../../src/runtime/contracts/runtime-adapter-contract.browser.mjs');
  const calls = [];

  const adapter = createApiRuntimeAdapter({
    decisionCoreClient: {
      checkBackendAvailability: async () => ({
        ok: true,
        status: 'ready',
      }),
      createInitialReviewRun: async (topicInput, options) => {
        calls.push({ topicInput, options });
        return {
          run_id: 'initial-review-run:test:browser-api',
          workspace_id: 'workspace:test:browser-api',
          status: 'workspace_ready',
        };
      },
      getWorkspacePayload: async () => ({
        workspace_payload_version: 'forefield_workspace_payload_v1',
        payload_kind: 'product_workspace_payload',
        payload_source: 'browser_api_selector_test',
        workspace_id: 'workspace:test:browser-api',
        initial_review_run_id: 'initial-review-run:test:browser-api',
        built_at: '2026-05-06T23:15:00.000Z',
        product_mainline_payload: {
          monitoring_run: {
            id: 'monitoring_run__browser_api',
            handoff_version: '0.3.0-decision-core-review-handoff',
          },
          topic_draft: {
            id: 'topic_draft__browser_api',
            monitoring_run_id: 'monitoring_run__browser_api',
            lifecycle_state: 'ready',
            title: 'AI meeting notes for product teams',
            summary: 'Browser API selector test payload.',
            limitations_summary: 'Preliminary review.',
          },
          signal_clusters: [],
          curated_evidence_records: [],
        },
        caveats: ['Preliminary review.'],
      }),
    },
  });
  const result = await adapter.workspace.createRunAndGetWorkspacePayload({
    topic_input: 'AI meeting notes for product teams',
  }, {
    mode: 'mocked',
  });
  const health = await adapter.system.checkBackendAvailability();

  assert.equal(adapter.mode, RUNTIME_MODES.API);
  assert.equal(health.status, 'ready');
  assert.equal(calls[0].topicInput.topic_input, 'AI meeting notes for product teams');
  assert.equal(calls[0].options.mode, 'mocked');
  assert.equal(result.product_mainline_payload.topic_draft.title, 'AI meeting notes for product teams');
});
