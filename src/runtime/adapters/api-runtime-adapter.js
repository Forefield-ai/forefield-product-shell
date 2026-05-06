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
    runs: {
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
    },
  };
}

module.exports = {
  createApiRuntimeAdapter,
};
