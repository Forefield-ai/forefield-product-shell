function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
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

  if (response.ok === false) {
    throw new Error(`${label} failed with status ${response.status || 'unknown'}.`);
  }

  if (typeof response.json !== 'function') {
    throw new Error(`${label} response must expose json().`);
  }

  return response.json();
}

function createDecisionCoreClient(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl || '');
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

  return {
    getRun(runId) {
      const safeRunId = encodeURIComponent(String(runId || '').trim());
      if (!safeRunId) {
        throw new Error('runId is required.');
      }
      return getJson(`/api/initial-review-runs/${safeRunId}`, 'DecisionCoreClient.getRun');
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

module.exports = {
  createDecisionCoreClient,
};
