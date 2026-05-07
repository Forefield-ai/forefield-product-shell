import {
  createDecisionCoreClient,
} from '../api/decision-core-client.browser.mjs';
import {
  RUNTIME_MODES,
} from '../contracts/runtime-adapter-contract.browser.mjs';
import {
  createApiRuntimeAdapter,
} from './api-runtime-adapter.browser.mjs';
import {
  createLocalRuntimeAdapter,
} from './local-runtime-adapter.browser.mjs';

function normalizeMode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

function readGlobalConfig(name) {
  if (typeof globalThis === 'undefined') {
    return '';
  }

  return globalThis[name] || '';
}

function readBundledRuntimeMode() {
  try {
    if (typeof __FOREFIELD_RUNTIME_MODE__ !== 'undefined') {
      return __FOREFIELD_RUNTIME_MODE__;
    }
  } catch (_error) {
    return '';
  }

  return '';
}

function resolveProductShellRuntimeMode(options = {}) {
  const selected = [
    options.mode,
    readBundledRuntimeMode(),
    readGlobalConfig('__FOREFIELD_RUNTIME_MODE__'),
    readGlobalConfig('FOREFIELD_RUNTIME_MODE'),
    RUNTIME_MODES.LOCAL,
  ].map(normalizeMode).find(Boolean);

  if (selected === 'api' || selected === RUNTIME_MODES.API) {
    return RUNTIME_MODES.API;
  }

  return RUNTIME_MODES.LOCAL;
}

function createRuntimeAdapterFromConfig(options = {}) {
  const mode = resolveProductShellRuntimeMode(options);

  if (mode === RUNTIME_MODES.API) {
    const decisionCoreClient = options.decisionCoreClient || createDecisionCoreClient({
      baseUrl: options.baseUrl,
      deploymentMode: options.deploymentMode,
      fetchImpl: options.fetchImpl,
    });

    return createApiRuntimeAdapter({
      decisionCoreClient,
    });
  }

  return createLocalRuntimeAdapter(options.localRuntimeOptions || options);
}

export {
  createRuntimeAdapterFromConfig,
  resolveProductShellRuntimeMode,
};
