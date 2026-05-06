const API_RUNTIME_STATUSES = Object.freeze({
  IDLE: 'idle',
  CHECKING_BACKEND: 'checking_backend',
  CREATING_RUN: 'creating_run',
  POLLING_RUN: 'polling_run',
  LOADING_WORKSPACE: 'loading_workspace',
  WORKSPACE_READY: 'workspace_ready',
  FAILED: 'failed',
});

const SAFE_API_ERROR_CODES = Object.freeze([
  'backend_unavailable',
  'invalid_topic',
  'invalid_backend_url',
  'live_gate_missing',
  'workspace_not_ready',
  'run_failed',
  'workspace_load_failed',
  'runtime_execution_failed',
]);

const RUN_TERMINAL_READY_STATUSES = Object.freeze([
  'workspace_ready',
]);

const RUN_TERMINAL_FAILED_STATUSES = Object.freeze([
  'failed',
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

  if (message.includes('invalid_backend_url')) {
    return 'invalid_backend_url';
  }

  if (message.includes('invalid_topic')) {
    return 'invalid_topic';
  }

  if (message.includes('live_gate_missing')) {
    return 'live_gate_missing';
  }

  if (message.includes('workspace_not_ready')) {
    return 'workspace_not_ready';
  }

  if (message.includes('run_failed')) {
    return 'run_failed';
  }

  if (message.includes('backend_unavailable')) {
    return 'backend_unavailable';
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

function waitForDelay(delayMs) {
  const safeDelay = Number(delayMs);
  if (!Number.isFinite(safeDelay) || safeDelay <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, safeDelay);
  });
}

function normalizeRunStatus(run = {}) {
  return String(run.status || run.run_status || '')
    .trim()
    .toLowerCase();
}

async function pollInitialReviewRun({
  run,
  getRunStatus,
  maxAttempts = 5,
  delayMs = 400,
  onStatusChange,
} = {}) {
  if (!run?.run_id && !run?.id) {
    throw new Error('workspace_load_failed');
  }

  if (typeof getRunStatus !== 'function') {
    throw new Error('API mode requires getRunStatus for polling.');
  }

  const runId = run.run_id || run.id;
  let latestRun = run;

  for (let attempt = 0; attempt < Math.max(Number(maxAttempts) || 1, 1); attempt += 1) {
    const status = normalizeRunStatus(latestRun);

    if (RUN_TERMINAL_READY_STATUSES.includes(status)) {
      return latestRun;
    }

    if (RUN_TERMINAL_FAILED_STATUSES.includes(status)) {
      throw new Error(`run_failed:${latestRun.failure_code || 'runtime_execution_failed'}`);
    }

    onStatusChange?.({
      status: API_RUNTIME_STATUSES.POLLING_RUN,
      run: latestRun,
      attempt: attempt + 1,
    });
    await waitForDelay(delayMs);
    latestRun = await getRunStatus(runId);
  }

  const finalStatus = normalizeRunStatus(latestRun);
  if (RUN_TERMINAL_READY_STATUSES.includes(finalStatus)) {
    return latestRun;
  }

  if (RUN_TERMINAL_FAILED_STATUSES.includes(finalStatus)) {
    throw new Error(`run_failed:${latestRun.failure_code || 'runtime_execution_failed'}`);
  }

  throw new Error('workspace_not_ready');
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
  pollOptions = {},
  onStatusChange,
} = {}) {
  if (
    !apiRuntimeAdapter
    || typeof apiRuntimeAdapter !== 'object'
    || typeof apiRuntimeAdapter.system?.checkBackendAvailability !== 'function'
    || typeof apiRuntimeAdapter.runs?.createInitialReviewRun !== 'function'
    || typeof apiRuntimeAdapter.runs?.getRunStatus !== 'function'
    || typeof apiRuntimeAdapter.workspace?.getWorkspacePayload !== 'function'
  ) {
    throw new Error('API mode requires create, poll, and workspace adapter functions.');
  }

  const topicInput = buildApiTopicRunInputFromDraft(draft);
  const runtimeOptions = buildApiRuntimeOptions(options);
  onStatusChange?.({
    status: API_RUNTIME_STATUSES.CHECKING_BACKEND,
  });
  await apiRuntimeAdapter.system.checkBackendAvailability();

  onStatusChange?.({
    status: API_RUNTIME_STATUSES.CREATING_RUN,
  });
  const run = await apiRuntimeAdapter.runs.createInitialReviewRun(
    topicInput,
    runtimeOptions
  );
  const readyRun = await pollInitialReviewRun({
    run,
    getRunStatus: apiRuntimeAdapter.runs.getRunStatus,
    maxAttempts: pollOptions.maxAttempts,
    delayMs: pollOptions.delayMs,
    onStatusChange,
  });
  const workspaceId = readyRun.workspace_id || run.workspace_id;
  if (!workspaceId) {
    throw new Error('workspace_load_failed');
  }

  onStatusChange?.({
    status: API_RUNTIME_STATUSES.LOADING_WORKSPACE,
    run: readyRun,
  });
  const workspacePayload = await apiRuntimeAdapter.workspace.getWorkspacePayload(workspaceId);
  const productMainlinePayload = workspacePayload.product_mainline_payload;

  return {
    status: API_RUNTIME_STATUSES.WORKSPACE_READY,
    topic_input: topicInput,
    runtime_options: runtimeOptions,
    run: readyRun,
    workspace_payload: workspacePayload,
    product_mainline_payload: productMainlinePayload,
    topic_patch: buildApiWorkspaceTopicPatch({
      run: readyRun,
      workspacePayload,
      productMainlinePayload,
    }),
  };
}

module.exports = {
  API_RUNTIME_STATUSES,
  SAFE_API_ERROR_CODES,
  buildApiRuntimeOptions,
  buildApiTopicRunInputFromDraft,
  buildApiWorkspaceTopicPatch,
  isApiTopicSnapshot,
  normalizeApiRuntimeErrorCode,
  pollInitialReviewRun,
  runApiInitialReviewFromDraft,
};
