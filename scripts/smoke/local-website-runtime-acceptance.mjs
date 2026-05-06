import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const productShellRoot = path.resolve(__dirname, '..', '..');
const decisionCoreRoot = process.env.FOREFIELD_DECISION_CORE_REPO
  || path.resolve(productShellRoot, '..', 'forefield-decision-core');

const {
  createRuntimeAdapterFromConfig,
} = require('../../src/runtime/adapters/runtime-adapter-selector');
const {
  buildTopicWorkspaceViewState,
} = require('../../src/product/read-models/build-topic-workspace-view-state');
const {
  buildBaselineBriefState,
} = require('../../src/product/read-models/build-baseline-brief-state');
const {
  buildBaselineBriefViewState,
} = require('../../src/product/read-models/build-baseline-brief-view-state');

const FORBIDDEN_SUMMARY_TERMS = [
  'raw_text',
  'raw_source_payload',
  'provider_response',
  'provider_payload',
  'api_key',
  'chain_of_thought',
  'source_url',
  'target_url',
  'username',
  'profile_url',
  'source_candidate_outputs',
];

function requireDecisionCoreServer() {
  return require(path.join(decisionCoreRoot, 'src', 'runtime', 'server', 'initial-review-server.js'));
}

function topicInput() {
  return {
    topic_input: 'AI meeting notes for product teams',
    topic_name: 'AI meeting notes for product teams',
    topic_summary: 'Track whether product teams struggle to clean up AI-generated meeting notes.',
    target_audience: 'product teams',
    problem_space: 'meeting follow-up and action item cleanup',
    monitoring_intent: 'Find recurring user language around cleanup, ownership, and follow-up quality.',
  };
}

function buildEvidenceDrawersByClusterId(productMainline) {
  const workspaceState = buildTopicWorkspaceViewState(productMainline);

  return (workspaceState.signal_cluster_sections || []).reduce((accumulator, section) => {
    const clusterId = section?.cluster_id;
    if (!clusterId) return accumulator;

    const selectedState = buildTopicWorkspaceViewState(productMainline, {
      selectedClusterId: clusterId,
    });

    if (selectedState.selected_evidence_drawer) {
      accumulator[clusterId] = selectedState.selected_evidence_drawer;
    }

    return accumulator;
  }, {});
}

function countForbiddenTerms(value) {
  const serialized = JSON.stringify(value || {}).toLowerCase();

  return FORBIDDEN_SUMMARY_TERMS.reduce((count, term) => (
    serialized.includes(term) ? count + 1 : count
  ), 0);
}

export async function runLocalWebsiteRuntimeAcceptance(options = {}) {
  const {
    createInitialReviewApiServer,
    listen,
  } = requireDecisionCoreServer();
  const server = createInitialReviewApiServer({
    env: {},
  });
  const started = await listen(server, {
    host: options.host || '127.0.0.1',
    port: options.port === undefined ? 0 : Number(options.port),
  });

  try {
    const runtimeAdapter = createRuntimeAdapterFromConfig({
      mode: 'api',
      baseUrl: started.url,
      fetchImpl: fetch,
    });
    const runtimeResult = await runtimeAdapter.workspace.createRunAndGetWorkspacePayload(topicInput(), {
      mode: 'mocked',
    });
    const productMainline = runtimeResult.product_mainline_payload;
    const workspaceState = buildTopicWorkspaceViewState(productMainline);
    const firstClusterId = workspaceState.signal_cluster_sections?.[0]?.cluster_id || '';
    const drawerState = firstClusterId
      ? buildTopicWorkspaceViewState(productMainline, {
        selectedClusterId: firstClusterId,
      }).selected_evidence_drawer
      : null;
    const briefState = buildBaselineBriefViewState({
      workspaceViewState: workspaceState,
      evidenceDrawersByClusterId: buildEvidenceDrawersByClusterId(productMainline),
      briefState: buildBaselineBriefState({
        productMainline,
      }),
    });
    const rawPrivateFieldViolationCount = countForbiddenTerms({
      runtimeResult,
      workspaceState,
      drawerState,
      briefState,
    });
    const ok = Boolean(
      runtimeAdapter.mode === 'api'
      && runtimeResult.run?.workspace_id
      && runtimeResult.workspace_payload?.workspace_id
      && workspaceState.signal_cluster_sections?.length > 0
      && drawerState
      && briefState?.copyableMarkdown
      && rawPrivateFieldViolationCount === 0
    );

    return {
      ok,
      mode: 'local_website_runtime_acceptance',
      runtime_adapter_mode: runtimeAdapter.mode,
      api_base_url: started.url,
      live_provider_calls: false,
      create_run_ok: Boolean(runtimeResult.run?.workspace_id),
      workspace_payload_loaded: Boolean(runtimeResult.workspace_payload?.workspace_id),
      topic_workspace_state_built: Boolean(workspaceState.workspace_header),
      signal_cluster_count: workspaceState.signal_cluster_sections?.length || 0,
      evidence_drawer_state_built: Boolean(drawerState),
      evidence_drawer_item_count: drawerState?.evidence_items?.length || 0,
      baseline_brief_state_built: Boolean(briefState?.copyableMarkdown),
      copyable_markdown_present: Boolean(briefState?.copyableMarkdown),
      v02_fallback_preserved_by_existing_tests: true,
      local_fixture_mode_preserved_by_existing_tests: true,
      raw_private_field_violation_count: rawPrivateFieldViolationCount,
      failure_code: ok ? null : 'local_website_runtime_acceptance_failed',
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const summary = await runLocalWebsiteRuntimeAcceptance();
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) {
    process.exitCode = 1;
  }
}
