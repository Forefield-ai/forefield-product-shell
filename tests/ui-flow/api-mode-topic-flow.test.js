const test = require('node:test');
const assert = require('node:assert/strict');

const {
  API_RUNTIME_STATUSES,
  buildApiRuntimeOptions,
  buildApiTopicRunInputFromDraft,
  isApiTopicSnapshot,
  normalizeApiRuntimeErrorCode,
  runApiInitialReviewFromDraft,
} = require('../../src/ui/flow/api-mode-topic-flow');

const SAMPLE_DRAFT = {
  original_input: 'AI meeting notes for product teams',
  topic_summary: 'Teams need cleaner meeting notes and action item follow-up.',
  topic_name: 'AI meeting notes for product teams',
  target_audience: 'Product managers and product operations teams',
  problem_space: 'Meeting notes, action items, and follow-up ownership are fragmented.',
  monitoring_intent: 'Monitor recurring demand for AI meeting notes workflows.',
  signal_focus: ['pain_point'],
  competitors_alternatives: [],
};

function mockWorkspacePayload() {
  return {
    workspace_payload_version: 'forefield_workspace_payload_v1',
    payload_kind: 'product_workspace_payload',
    payload_source: 'test_api_visible_flow',
    workspace_id: 'workspace:test:api-visible',
    initial_review_run_id: 'initial-review-run:test:api-visible',
    built_at: '2026-05-06T23:00:00.000Z',
    source_coverage_summary: {
      attempted_count: 0,
      succeeded_count: 0,
      failed_count: 0,
      partial_source_failure: false,
    },
    product_mainline_payload: {
      monitoring_run: {
        id: 'monitoring_run__api_visible',
        handoff_version: '0.3.0-decision-core-review-handoff',
      },
      topic_draft: {
        id: 'topic_draft__api_visible',
        monitoring_run_id: 'monitoring_run__api_visible',
        lifecycle_state: 'ready',
        title: 'AI meeting notes for product teams',
        summary: 'Backend-produced product payload for visible API mode.',
        limitations_summary: 'Preliminary review.',
      },
      signal_clusters: [],
      curated_evidence_records: [],
    },
    caveats: ['Preliminary review.'],
  };
}

test('API mode builds backend topic input without fixture fields', () => {
  const input = buildApiTopicRunInputFromDraft(SAMPLE_DRAFT);

  assert.deepEqual(input, {
    topic_input: 'AI meeting notes for product teams',
    topic_name: 'AI meeting notes for product teams',
    topic_summary: 'Teams need cleaner meeting notes and action item follow-up.',
    target_audience: 'Product managers and product operations teams',
    problem_space: 'Meeting notes, action items, and follow-up ownership are fragmented.',
    monitoring_intent: 'Monitor recurring demand for AI meeting notes workflows.',
  });
  assert.equal(Object.prototype.hasOwnProperty.call(input, 'fixtureKey'), false);
});

test('API mode runtime options default to mocked backend mode', () => {
  assert.deepEqual(buildApiRuntimeOptions(), {
    mode: 'mocked',
  });
  assert.deepEqual(buildApiRuntimeOptions({
    mode: 'live',
    source_config: { selected_sources: ['youtube'] },
  }), {
    mode: 'live',
    source_config: { selected_sources: ['youtube'] },
  });
});

test('API visible flow calls create run through API adapter and returns workspace patch', async () => {
  const calls = [];
  const result = await runApiInitialReviewFromDraft({
    draft: SAMPLE_DRAFT,
    apiRuntimeAdapter: {
      workspace: {
        createRunAndGetWorkspacePayload: async (topicInput, options) => {
          calls.push({ topicInput, options });
          return {
            run: {
              run_id: 'initial-review-run:test:api-visible',
              workspace_id: 'workspace:test:api-visible',
              status: 'workspace_ready',
            },
            workspace_payload: mockWorkspacePayload(),
            product_mainline_payload: mockWorkspacePayload().product_mainline_payload,
          };
        },
      },
    },
  });

  assert.equal(result.status, API_RUNTIME_STATUSES.WORKSPACE_READY);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].topicInput.topic_input, SAMPLE_DRAFT.original_input);
  assert.equal(calls[0].options.mode, 'mocked');
  assert.equal(result.topic_patch.runtimeSource, 'api');
  assert.equal(result.topic_patch.runId, 'initial-review-run:test:api-visible');
  assert.equal(result.topic_patch.workspaceId, 'workspace:test:api-visible');
  assert.equal(isApiTopicSnapshot(result.topic_patch), true);
  assert.equal(JSON.stringify(result).includes('fixture'), false);
});

test('API visible flow normalizes safe error codes without fixture fallback', () => {
  assert.equal(
    normalizeApiRuntimeErrorCode(new Error('DecisionCoreClient.createInitialReviewRun failed: live_gate_missing.')),
    'live_gate_missing'
  );
  assert.equal(
    normalizeApiRuntimeErrorCode(new Error('DecisionCoreClient.getWorkspacePayload failed: workspace_not_found.')),
    'workspace_load_failed'
  );
  assert.equal(
    normalizeApiRuntimeErrorCode(new Error('Failed to fetch')),
    'backend_unavailable'
  );
  assert.equal(
    normalizeApiRuntimeErrorCode(new Error('unexpected')),
    'runtime_execution_failed'
  );
});
