const {
  assertCanonicalRuntimePayload,
  RUNTIME_MODES,
} = require('../contracts/runtime-adapter-contract');
const {
  normalizeRemoteWorkspacePayload,
} = require('../workspace/remote-workspace-payload');

function ensureClient(client) {
  if (!client || typeof client !== 'object' || Array.isArray(client)) {
    throw new Error('createApiRuntimeAdapter requires decisionCoreClient.');
  }

  if (typeof client.getWorkspacePayload !== 'function') {
    throw new Error('decisionCoreClient.getWorkspacePayload must be a function.');
  }

  return client;
}

function createApiRuntimeAdapter(options = {}) {
  const decisionCoreClient = ensureClient(options.decisionCoreClient);

  return {
    mode: RUNTIME_MODES.API,
    system: {
      async checkBackendAvailability() {
        if (typeof decisionCoreClient.checkBackendAvailability !== 'function') {
          throw new Error('decisionCoreClient.checkBackendAvailability must be a function for API mode.');
        }

        const health = await decisionCoreClient.checkBackendAvailability();
        if (!health || health.ok !== true || health.status !== 'ready') {
          throw new Error('backend_unavailable');
        }

        return health;
      },
    },
    runs: {
      createInitialReviewRun(topicInput, options = {}) {
        if (typeof decisionCoreClient.createInitialReviewRun !== 'function') {
          throw new Error('decisionCoreClient.createInitialReviewRun must be a function for create calls.');
        }

        return decisionCoreClient.createInitialReviewRun(topicInput, options);
      },
      getRunStatus(runId) {
        if (typeof decisionCoreClient.getRun !== 'function') {
          throw new Error('decisionCoreClient.getRun must be a function for run status calls.');
        }

        return decisionCoreClient.getRun(runId);
      },
    },
    workspace: {
      async getWorkspacePayload(workspaceId) {
        const remotePayload = await decisionCoreClient.getWorkspacePayload(workspaceId);
        return assertCanonicalRuntimePayload(normalizeRemoteWorkspacePayload(remotePayload));
      },
      async getProductMainline(workspaceId) {
        const workspacePayload = await this.getWorkspacePayload(workspaceId);
        return assertCanonicalRuntimePayload(workspacePayload.product_mainline_payload);
      },
      async getTopicWorkspace(workspaceId) {
        return this.getProductMainline(workspaceId);
      },
      async createRunAndGetWorkspacePayload(topicInput, options = {}) {
        if (typeof decisionCoreClient.createInitialReviewRun !== 'function') {
          throw new Error('decisionCoreClient.createInitialReviewRun must be a function for create calls.');
        }

        const run = await decisionCoreClient.createInitialReviewRun(topicInput, options);
        if (!run?.workspace_id) {
          throw new Error('Initial review create response must include workspace_id.');
        }

        const workspacePayload = await this.getWorkspacePayload(run.workspace_id);

        return {
          run,
          workspace_payload: workspacePayload,
          product_mainline_payload: assertCanonicalRuntimePayload(workspacePayload.product_mainline_payload),
        };
      },
    },
  };
}

module.exports = {
  createApiRuntimeAdapter,
};
