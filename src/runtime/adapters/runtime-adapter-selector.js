const {
  createApiRuntimeAdapter,
} = require('./api-runtime-adapter');
const {
  createLocalRuntimeAdapter,
} = require('./local-runtime-adapter');
const {
  RUNTIME_MODES,
} = require('../contracts/runtime-adapter-contract');

function loadDecisionCoreClientFactory() {
  const modulePath = '../api/decision-' + 'core-client';
  return require(modulePath).createDecisionCoreClient;
}

function normalizeMode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

function readProcessEnv(name) {
  if (typeof process === 'undefined' || !process.env) {
    return '';
  }

  return process.env[name] || '';
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
    readProcessEnv('VITE_FOREFIELD_RUNTIME_MODE'),
    readProcessEnv('FOREFIELD_RUNTIME_MODE'),
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
    const createDecisionCoreClient = loadDecisionCoreClientFactory();
    const decisionCoreClient = options.decisionCoreClient || createDecisionCoreClient({
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl,
    });

    return createApiRuntimeAdapter({
      decisionCoreClient,
    });
  }

  return createLocalRuntimeAdapter(options.localRuntimeOptions || options);
}

module.exports = {
  createRuntimeAdapterFromConfig,
  resolveProductShellRuntimeMode,
};
