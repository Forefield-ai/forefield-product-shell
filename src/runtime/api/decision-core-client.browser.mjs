const DEFAULT_DECISION_CORE_API_BASE_URL = 'http://127.0.0.1:8787';

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function readGlobalConfig(name) {
  if (typeof globalThis === 'undefined') {
    return '';
  }

  return globalThis[name] || '';
}

function readBundledApiBaseUrl() {
  try {
    if (typeof __FOREFIELD_API_BASE_URL__ !== 'undefined') {
      return __FOREFIELD_API_BASE_URL__;
    }
  } catch (_error) {
    return '';
  }

  return '';
}

function resolveDecisionCoreApiBaseUrl(options = {}) {
  const candidates = [
    options.baseUrl,
    readBundledApiBaseUrl(),
    readGlobalConfig('__FOREFIELD_API_BASE_URL__'),
    readGlobalConfig('FOREFIELD_API_BASE_URL'),
    DEFAULT_DECISION_CORE_API_BASE_URL,
  ];
  const selected = candidates
    .map((entry) => String(entry || '').trim())
    .find(Boolean);

  return normalizeBaseUrl(selected);
}

function ensureFetchImplementation(fetchImpl) {
  const requestImpl = fetchImpl || globalThis.fetch;

  if (typeof requestImpl !== 'function') {
    throw new Error('DecisionCoreClient requires a fetch implementation.');
  }

  return requestImpl;
}

async function parseJsonResponse(response, label) {
  if (!response || typeof response !== 'object') {
    throw new Error(`${label} returned an invalid response object.`);
  }

  let payload = null;
  if (typeof response.json === 'function') {
    payload = await response.json();
  }

  if (response.ok === false) {
    const code = payload?.error?.code || payload?.failure_code || response.status || 'unknown';
    throw new Error(`${label} failed: ${code}.`);
  }

  if (!payload) {
    throw new Error(`${label} response must expose json().`);
  }

  return payload;
}

function createDecisionCoreClient(options = {}) {
  const baseUrl = resolveDecisionCoreApiBaseUrl(options);
  const requestImpl = ensureFetchImplementation(options.fetchImpl);

  async function getJson(pathName, label) {
    const response = await requestImpl(`${baseUrl}${pathName}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });

    return parseJsonResponse(response, label);
  }

  async function postJson(pathName, body, label) {
    const response = await requestImpl(`${baseUrl}${pathName}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    });

    return parseJsonResponse(response, label);
  }

  return {
    createInitialReviewRun(topicInput = {}, options = {}) {
      return postJson('/api/initial-review-runs', {
        ...topicInput,
        ...options,
      }, 'DecisionCoreClient.createInitialReviewRun');
    },
    getRun(runId) {
      const safeRunId = encodeURIComponent(String(runId || '').trim());
      if (!safeRunId) {
        throw new Error('runId is required.');
      }
      return getJson(`/api/initial-review-runs/${safeRunId}`, 'DecisionCoreClient.getRun');
    },
    getInitialReviewRun(runId) {
      return this.getRun(runId);
    },
    getWorkspacePayload(workspaceId) {
      const safeWorkspaceId = encodeURIComponent(String(workspaceId || '').trim());
      if (!safeWorkspaceId) {
        throw new Error('workspaceId is required.');
      }
      return getJson(`/api/workspaces/${safeWorkspaceId}`, 'DecisionCoreClient.getWorkspacePayload');
    },
  };
}

export {
  DEFAULT_DECISION_CORE_API_BASE_URL,
  createDecisionCoreClient,
  resolveDecisionCoreApiBaseUrl,
};
