const API_RUNTIME_STATUSES = Object.freeze({
  IDLE: 'idle',
  CREATING_RUN: 'creating_run',
  LOADING_WORKSPACE: 'loading_workspace',
  WORKSPACE_READY: 'workspace_ready',
  FAILED: 'failed',
});

const SAFE_API_ERROR_CODES = Object.freeze([
  'backend_unavailable',
  'invalid_topic',
  'live_gate_missing',
  'workspace_load_failed',
  'runtime_execution_failed',
]);

function ensureDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new Error('API mode requires a topic draft object.');
  }

  return draft;
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildApiTopicRunInputFromDraft(draft) {
  const safeDraft = ensureDraft(draft);
  const topicInput = asTrimmedString(safeDraft.original_input)
    || asTrimmedString(safeDraft.topic_name);

  if (!topicInput) {
    throw new Error('invalid_topic');
  }

  return {
    topic_input: topicInput,
    topic_name: asTrimmedString(safeDraft.topic_name),
    topic_summary: asTrimmedString(safeDraft.topic_summary),
    target_audience: asTrimmedString(safeDraft.target_audience),
    problem_space: asTrimmedString(safeDraft.problem_space),
    monitoring_intent: asTrimmedString(safeDraft.monitoring_intent),
  };
}

function buildApiRuntimeOptions(options = {}) {
  return {
    mode: options.mode === 'live' ? 'live' : 'mocked',
    ...(options.source_config && typeof options.source_config === 'object'
      ? { source_config: options.source_config }
      : {}),
  };
}

function normalizeApiRuntimeErrorCode(error) {
  const message = String(error?.message || error || '').toLowerCase();

  if (message.includes('invalid_topic')) {
    return 'invalid_topic';
  }

  if (message.includes('live_gate_missing')) {
    return 'live_gate_missing';
  }

  if (
    message.includes('workspace_not_found')
    || message.includes('workspace_id')
    || message.includes('getworkspacepayload')
  ) {
    return 'workspace_load_failed';
  }

  if (
    message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('decisioncoreclient')
  ) {
    return 'backend_unavailable';
  }

  return 'runtime_execution_failed';
}

function buildApiWorkspaceTopicPatch({
  run,
  workspacePayload,
  productMainlinePayload,
} = {}) {
  if (!run?.workspace_id) {
    throw new Error('workspace_load_failed');
  }

  if (!productMainlinePayload || typeof productMainlinePayload !== 'object') {
    throw new Error('workspace_load_failed');
  }

  return {
    runtimeSource: 'api',
    runId: run.run_id || run.id || null,
    workspaceId: run.workspace_id,
    apiRun: run,
    apiWorkspacePayload: workspacePayload,
    apiProductMainline: productMainlinePayload,
  };
}

function isApiTopicSnapshot(topic) {
  return topic?.runtimeSource === 'api';
}

async function runApiInitialReviewFromDraft({
  apiRuntimeAdapter,
  draft,
  options = {},
} = {}) {
  if (
    !apiRuntimeAdapter
    || typeof apiRuntimeAdapter !== 'object'
    || typeof apiRuntimeAdapter.workspace?.createRunAndGetWorkspacePayload !== 'function'
  ) {
    throw new Error('API mode requires apiRuntimeAdapter.workspace.createRunAndGetWorkspacePayload.');
  }

  const topicInput = buildApiTopicRunInputFromDraft(draft);
  const runtimeOptions = buildApiRuntimeOptions(options);
  const result = await apiRuntimeAdapter.workspace.createRunAndGetWorkspacePayload(
    topicInput,
    runtimeOptions
  );

  return {
    status: API_RUNTIME_STATUSES.WORKSPACE_READY,
    topic_input: topicInput,
    runtime_options: runtimeOptions,
    run: result.run,
    workspace_payload: result.workspace_payload,
    product_mainline_payload: result.product_mainline_payload,
    topic_patch: buildApiWorkspaceTopicPatch({
      run: result.run,
      workspacePayload: result.workspace_payload,
      productMainlinePayload: result.product_mainline_payload,
    }),
  };
}

export {
  API_RUNTIME_STATUSES,
  SAFE_API_ERROR_CODES,
  buildApiRuntimeOptions,
  buildApiTopicRunInputFromDraft,
  buildApiWorkspaceTopicPatch,
  isApiTopicSnapshot,
  normalizeApiRuntimeErrorCode,
  runApiInitialReviewFromDraft,
};
