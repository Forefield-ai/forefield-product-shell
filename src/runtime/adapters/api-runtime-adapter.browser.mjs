import {
  assertCanonicalRuntimePayload,
  RUNTIME_MODES,
} from '../contracts/runtime-adapter-contract.browser.mjs';
import {
  normalizeRemoteWorkspacePayload,
} from '../workspace/remote-workspace-payload.browser.mjs';

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

export {
  createApiRuntimeAdapter,
};
