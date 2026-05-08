const test = require('node:test');
const assert = require('node:assert/strict');

const {
  API_RUNTIME_STATUSES,
  buildApiRuntimeOptions,
  buildApiTopicRunInputFromDraft,
  isApiTopicSnapshot,
  normalizeApiRuntimeErrorCode,
  pollInitialReviewRun,
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

test('API visible flow checks backend, creates run, polls status, and fetches workspace patch', async () => {
  const calls = [];
  const statusChanges = [];
  const result = await runApiInitialReviewFromDraft({
    draft: SAMPLE_DRAFT,
    apiRuntimeAdapter: {
      system: {
        checkBackendAvailability: async () => {
          calls.push({ type: 'health' });
          return { ok: true, status: 'ready' };
        },
      },
      runs: {
        createInitialReviewRun: async (topicInput, options) => {
          calls.push({ type: 'create', topicInput, options });
          return {
            run_id: 'initial-review-run:test:api-visible',
            workspace_id: 'workspace:test:api-visible',
            status: 'collecting_candidates',
          };
        },
        getRunStatus: async (runId) => {
          calls.push({ type: 'poll', runId });
          return {
            run_id: 'initial-review-run:test:api-visible',
            workspace_id: 'workspace:test:api-visible',
            status: 'workspace_ready',
          };
        },
      },
      workspace: {
        getWorkspacePayload: async (workspaceId) => {
          calls.push({ type: 'workspace', workspaceId });
          return mockWorkspacePayload();
        },
      },
    },
    pollOptions: {
      maxAttempts: 2,
      delayMs: 0,
    },
    onStatusChange: (state) => {
      statusChanges.push(state.status);
    },
  });

  assert.equal(result.status, API_RUNTIME_STATUSES.WORKSPACE_READY);
  assert.deepEqual(calls.map((call) => call.type), ['health', 'create', 'poll', 'workspace']);
  assert.equal(calls[1].topicInput.topic_input, SAMPLE_DRAFT.original_input);
  assert.equal(calls[1].options.mode, 'mocked');
  assert.deepEqual(statusChanges, [
    API_RUNTIME_STATUSES.CHECKING_BACKEND,
    API_RUNTIME_STATUSES.CREATING_RUN,
    API_RUNTIME_STATUSES.POLLING_RUN,
    API_RUNTIME_STATUSES.LOADING_WORKSPACE,
  ]);
  assert.equal(result.topic_patch.runtimeSource, 'api');
  assert.equal(result.topic_patch.runId, 'initial-review-run:test:api-visible');
  assert.equal(result.topic_patch.workspaceId, 'workspace:test:api-visible');
  assert.equal(isApiTopicSnapshot(result.topic_patch), true);
  assert.equal(JSON.stringify(result).includes('fixture'), false);
});

test('API visible flow reports workspace_not_ready without fixture fallback', async () => {
  await assert.rejects(
    () => runApiInitialReviewFromDraft({
      draft: SAMPLE_DRAFT,
      apiRuntimeAdapter: {
        system: {
          checkBackendAvailability: async () => ({ ok: true, status: 'ready' }),
        },
        runs: {
          createInitialReviewRun: async () => ({
            run_id: 'initial-review-run:test:not-ready',
            workspace_id: 'workspace:test:not-ready',
            status: 'collecting_candidates',
          }),
          getRunStatus: async () => ({
            run_id: 'initial-review-run:test:not-ready',
            workspace_id: 'workspace:test:not-ready',
            status: 'collecting_candidates',
          }),
        },
        workspace: {
          getWorkspacePayload: async () => {
            throw new Error('workspace should not be fetched before ready');
          },
        },
      },
      pollOptions: {
        maxAttempts: 1,
        delayMs: 0,
      },
    }),
    /workspace_not_ready/
  );
});

test('API visible flow reports failed backend run safely', async () => {
  await assert.rejects(
    () => runApiInitialReviewFromDraft({
      draft: SAMPLE_DRAFT,
      apiRuntimeAdapter: {
        system: {
          checkBackendAvailability: async () => ({ ok: true, status: 'ready' }),
        },
        runs: {
          createInitialReviewRun: async () => ({
            run_id: 'initial-review-run:test:failed',
            workspace_id: 'workspace:test:failed',
            status: 'failed',
            failure_code: 'runtime_execution_failed',
          }),
          getRunStatus: async () => {
            throw new Error('poll should not be needed for failed run');
          },
        },
        workspace: {
          getWorkspacePayload: async () => {
            throw new Error('workspace should not be fetched for failed run');
          },
        },
      },
      pollOptions: {
        delayMs: 0,
      },
    }),
    /run_failed:runtime_execution_failed/
  );
});

test('pollInitialReviewRun returns ready status after polling and rejects stale runs', async () => {
  const ready = await pollInitialReviewRun({
    run: {
      run_id: 'initial-review-run:test:poll',
      workspace_id: 'workspace:test:poll',
      status: 'collecting_candidates',
    },
    getRunStatus: async () => ({
      run_id: 'initial-review-run:test:poll',
      workspace_id: 'workspace:test:poll',
      status: 'workspace_ready',
    }),
    maxAttempts: 1,
    delayMs: 0,
  });

  assert.equal(ready.status, 'workspace_ready');
  await assert.rejects(
    () => pollInitialReviewRun({
      run: {
        run_id: 'initial-review-run:test:poll-stale',
        workspace_id: 'workspace:test:poll-stale',
        status: 'filtering_candidates',
      },
      getRunStatus: async () => ({
        run_id: 'initial-review-run:test:poll-stale',
        workspace_id: 'workspace:test:poll-stale',
        status: 'filtering_candidates',
      }),
      maxAttempts: 1,
      delayMs: 0,
    }),
    /workspace_not_ready/
  );
});

test('API visible flow treats limited and insufficient outcomes as terminal product states', async () => {
  const limited = await pollInitialReviewRun({
    run: {
      run_id: 'initial-review-run:test:limited',
      workspace_id: 'workspace:test:limited',
      status: 'workspace_ready_with_limited_support',
    },
    getRunStatus: async () => {
      throw new Error('poll should not run for terminal limited status');
    },
    maxAttempts: 1,
    delayMs: 0,
  });
  const insufficient = await pollInitialReviewRun({
    run: {
      run_id: 'initial-review-run:test:insufficient',
      workspace_id: 'workspace:test:insufficient',
      status: 'insufficient_signal',
    },
    getRunStatus: async () => {
      throw new Error('poll should not run for terminal insufficient status');
    },
    maxAttempts: 1,
    delayMs: 0,
  });

  assert.equal(limited.status, 'workspace_ready_with_limited_support');
  assert.equal(insufficient.status, 'insufficient_signal');
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
    normalizeApiRuntimeErrorCode(new Error('backend_unavailable')),
    'backend_unavailable'
  );
  assert.equal(
    normalizeApiRuntimeErrorCode(new Error('invalid_backend_url')),
    'invalid_backend_url'
  );
  assert.equal(
    normalizeApiRuntimeErrorCode(new Error('workspace_not_ready')),
    'workspace_not_ready'
  );
  assert.equal(
    normalizeApiRuntimeErrorCode(new Error('run_failed:runtime_execution_failed')),
    'run_failed'
  );
  assert.equal(
    normalizeApiRuntimeErrorCode(new Error('unexpected')),
    'runtime_execution_failed'
  );
});
