const {
  assertCanonicalRuntimePayload,
} = require('../contracts/runtime-adapter-contract');

const REMOTE_WORKSPACE_PAYLOAD_VERSION = 'forefield_workspace_payload_v1';

const FORBIDDEN_REMOTE_PAYLOAD_KEYS = Object.freeze([
  'api_key',
  'author',
  'author_id',
  'chain_of_thought',
  'comment_id',
  'debug_metadata',
  'decision_core_internal',
  'full_content',
  'internal_decision_core',
  'link',
  'permalink',
  'private_id',
  'profile_id',
  'profile_url',
  'prompt',
  'provider_payload',
  'provider_response',
  'raw_comment',
  'raw_forum_text',
  'raw_payload',
  'raw_provider_response',
  'raw_snippet',
  'raw_source_payload',
  'raw_source_text',
  'raw_text',
  'request_url',
  'review_handoff_v0_3',
  'shadow_emission',
  'source_candidate_output',
  'source_candidate_outputs',
  'source_payload',
  'source_url',
  'target_url',
  'url',
  'user_id',
  'username',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectForbiddenRemoteWorkspacePayloadPaths(value, pathName = 'payload', hits = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collectForbiddenRemoteWorkspacePayloadPaths(entry, `${pathName}[${index}]`, hits);
    });
    return hits;
  }

  if (!isPlainObject(value)) {
    if (typeof value === 'string' && /https?:\/\//i.test(value)) {
      hits.push(pathName);
    }
    return hits;
  }

  Object.keys(value).forEach((key) => {
    const nextPath = `${pathName}.${key}`;
    if (FORBIDDEN_REMOTE_PAYLOAD_KEYS.includes(key)) {
      hits.push(nextPath);
    }
    collectForbiddenRemoteWorkspacePayloadPaths(value[key], nextPath, hits);
  });

  return hits;
}

function assertNoRemoteWorkspacePayloadForbiddenFields(payload) {
  const hits = collectForbiddenRemoteWorkspacePayloadPaths(payload);

  if (hits.length) {
    throw new Error(`Remote workspace payload contains forbidden fields: ${hits.join(', ')}`);
  }

  return payload;
}

function normalizeRemoteWorkspacePayload(payload = {}) {
  if (!isPlainObject(payload)) {
    throw new Error('Remote workspace payload must be an object.');
  }

  if (payload.workspace_payload_version !== REMOTE_WORKSPACE_PAYLOAD_VERSION) {
    throw new Error(`Unsupported remote workspace payload version: ${payload.workspace_payload_version || 'missing'}`);
  }

  if (!isPlainObject(payload.product_mainline_payload)) {
    throw new Error('Remote workspace payload must contain product_mainline_payload.');
  }

  assertNoRemoteWorkspacePayloadForbiddenFields(payload);

  return assertCanonicalRuntimePayload({
    workspace_payload_version: payload.workspace_payload_version,
    payload_kind: payload.payload_kind || 'product_workspace_payload',
    payload_source: payload.payload_source || 'remote_runtime_workspace_payload',
    workspace_id: payload.workspace_id,
    initial_review_run_id: payload.initial_review_run_id,
    built_at: payload.built_at,
    source_coverage_summary: payload.source_coverage_summary,
    product_mainline_payload: payload.product_mainline_payload,
    caveats: Array.isArray(payload.caveats) ? payload.caveats : [],
  });
}

function validateRemoteWorkspacePayload(payload = {}) {
  try {
    normalizeRemoteWorkspacePayload(payload);
    return {
      ok: true,
      checks: [{
        check: 'remote_workspace_payload_valid',
        passed: true,
        detail: 'ok',
      }],
    };
  } catch (error) {
    return {
      ok: false,
      checks: [{
        check: 'remote_workspace_payload_valid',
        passed: false,
        detail: error.message,
      }],
    };
  }
}

module.exports = {
  REMOTE_WORKSPACE_PAYLOAD_VERSION,
  assertNoRemoteWorkspacePayloadForbiddenFields,
  collectForbiddenRemoteWorkspacePayloadPaths,
  normalizeRemoteWorkspacePayload,
  validateRemoteWorkspacePayload,
};
