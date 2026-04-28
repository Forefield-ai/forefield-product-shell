const test = require('node:test');
const assert = require('node:assert/strict');

const richProductMainlineFixture = require('../../fixtures/product/rich-product-mainline.sample.json');
const sparseProductMainlineFixture = require('../../fixtures/product/sparse-product-mainline.sample.json');
const emptyProductMainlineFixture = require('../../fixtures/product/empty-product-mainline.sample.json');
const noEvidenceProductMainlineFixture = require('../../fixtures/product/no-evidence-product-mainline.sample.json');
const richCopilotFixture = require('../../fixtures/product/copilot-guided-actions-state-rich.sample.json');
const sparseCopilotFixture = require('../../fixtures/product/copilot-guided-actions-state-sparse.sample.json');
const {
  hideCluster,
  initialActionState,
  saveCluster,
  watchCluster,
} = require('../../src/product/actions/user-action-state');
const {
  COPILOT_GUIDED_ACTIONS_KIND,
  COPILOT_ACTION_IDS,
  COPILOT_OUTPUT_STATUS,
  COPILOT_WORKSPACE_STATES,
  buildCopilotGuidedActionsState,
  buildCopilotGuidedActionMockOutput,
} = require('../../src/product/copilot/build-copilot-guided-actions-state');
const {
  BASELINE_BRIEF_PROTOTYPE_STATES,
} = require('../../src/product/read-models/build-baseline-brief-state');

const SAMPLE_TOPIC_SCOPE = {
  topic_id: 'local_topic__privacy-workflow-demand__20260428120000',
  topic_status: 'ready',
  topic_name: 'Privacy workflow demand review',
  topic_summary: 'Track whether recurring privacy-control complaints justify a follow-up validation pass.',
  target_audience: 'Product and support leads',
  problem_space: 'Shared-workflow privacy controls and complaint handling',
  monitoring_intent: 'Monitor whether recurring public demand signals justify the next validation step.',
};

const PROHIBITED_KEYS = new Set([
  'DecisionCoreBoundaryHandoff',
  'OpportunitySet',
  'OpportunityCard',
  'OpportunityScore',
  'ClaimTrace',
  'raw_refs',
  'raw_trace_refs',
  'prompt_logs',
  'crawler_logs',
  'internal_decision_core',
  'provenance',
  'support_role',
  'published_at',
  'observed_at',
]);

const FORBIDDEN_PHRASES = [
  'market size',
  'clear demand',
  'confirmed demand',
  'purchase intent',
  'competitor strategy',
  'opportunity ranking',
  'gtm',
  'pricing',
  'roadmap',
  'no demand',
];

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, keys));
    return keys;
  }

  if (!value || typeof value !== 'object') {
    return keys;
  }

  Object.keys(value).forEach((key) => {
    keys.push(key);
    collectKeys(value[key], keys);
  });

  return keys;
}

function collectStrings(value, strings = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, strings));
    return strings;
  }

  if (typeof value === 'string') {
    strings.push(value);
    return strings;
  }

  if (!value || typeof value !== 'object') {
    return strings;
  }

  Object.values(value).forEach((entry) => collectStrings(entry, strings));
  return strings;
}

function buildRichState(actionState = initialActionState()) {
  return buildCopilotGuidedActionsState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
    actionState,
  });
}

function buildSparseState() {
  return buildCopilotGuidedActionsState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: sparseProductMainlineFixture,
  });
}

test('rich copilot guided actions state matches the rich fixture', () => {
  const state = buildRichState();

  assert.deepEqual(state, richCopilotFixture);
  assert.equal(state.kind, COPILOT_GUIDED_ACTIONS_KIND);
  assert.equal(state.workspace_state, COPILOT_WORKSPACE_STATES.RICH);
});

test('sparse copilot guided actions state matches the sparse fixture', () => {
  const state = buildSparseState();

  assert.deepEqual(state, sparseCopilotFixture);
  assert.equal(state.workspace_state, COPILOT_WORKSPACE_STATES.SPARSE);
  state.actions.forEach((action) => {
    assert.equal(action.availability.is_available, true);
    assert.match(action.availability.summary, /limited-evidence|preliminary/i);
  });
});

test('allowed copilot action set is explicitly bounded and each contract has required fields', () => {
  const state = buildRichState();

  assert.deepEqual(
    state.actions.map((action) => action.action_id),
    [
      COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
      COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
      COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS,
      COPILOT_ACTION_IDS.GENERATE_VALIDATION_QUESTIONS,
      COPILOT_ACTION_IDS.SUGGEST_WHAT_TO_WATCH_NEXT,
    ]
  );

  state.actions.forEach((action) => {
    assert.equal(typeof action.display_name, 'string');
    assert.equal(typeof action.input_type, 'string');
    assert.ok(Array.isArray(action.required_input_fields));
    assert.ok(Array.isArray(action.allowed_data_sources));
    assert.ok(action.output_shape);
    assert.ok(action.availability_rules);
    assert.ok(action.state_specific_constraints);
    assert.ok(Array.isArray(action.forbidden_claims));
    assert.ok(action.trace_behavior);
  });
});

test('rich deterministic mock outputs stay evidence-grounded across the allowed action set', () => {
  const inputsByActionId = {
    [COPILOT_ACTION_IDS.EXPLAIN_CLUSTER]: { cluster_id: richProductMainlineFixture.signal_clusters[0].id },
    [COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT]: { cluster_id: richProductMainlineFixture.signal_clusters[0].id },
    [COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS]: {},
    [COPILOT_ACTION_IDS.GENERATE_VALIDATION_QUESTIONS]: { cluster_id: richProductMainlineFixture.signal_clusters[1].id },
    [COPILOT_ACTION_IDS.SUGGEST_WHAT_TO_WATCH_NEXT]: {},
  };

  Object.values(COPILOT_ACTION_IDS).forEach((actionId) => {
    const output = buildCopilotGuidedActionMockOutput({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: richProductMainlineFixture,
      actionId,
      input: inputsByActionId[actionId],
    });

    assert.equal(output.status, COPILOT_OUTPUT_STATUS.AVAILABLE);
    assert.equal(typeof output.what_this_currently_supports, 'string');
    assert.equal(typeof output.what_remains_limited, 'string');
    assert.ok(Array.isArray(output.what_to_validate_next));
    assert.ok(Array.isArray(output.trace_refs));
  });
});

test('sparse outputs include preliminary / limited-evidence language', () => {
  const explainClusterOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: sparseProductMainlineFixture,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
    input: { cluster_id: sparseProductMainlineFixture.signal_clusters[0].id },
  });
  const explainTakeawayOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: sparseProductMainlineFixture,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
    input: { cluster_id: sparseProductMainlineFixture.signal_clusters[0].id },
  });

  assert.equal(explainClusterOutput.preliminary, true);
  assert.equal(explainTakeawayOutput.preliminary, true);
  assert.match(
    `${explainClusterOutput.what_this_currently_supports} ${explainClusterOutput.what_remains_limited}`,
    /preliminary|limited/i
  );
  assert.match(
    `${explainTakeawayOutput.what_this_currently_supports} ${explainTakeawayOutput.what_remains_limited}`,
    /preliminary|incomplete|limited/i
  );
});

test('no-evidence outputs do not create evidence-backed claims and use monitoring-gap behavior', () => {
  const state = buildCopilotGuidedActionsState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: noEvidenceProductMainlineFixture,
  });
  const explainClusterOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: noEvidenceProductMainlineFixture,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
    input: { cluster_id: noEvidenceProductMainlineFixture.signal_clusters[0].id },
  });
  const explainTakeawayOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: noEvidenceProductMainlineFixture,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
    input: { cluster_id: noEvidenceProductMainlineFixture.signal_clusters[0].id },
  });

  assert.equal(state.workspace_state, COPILOT_WORKSPACE_STATES.NO_EVIDENCE);
  assert.equal(explainClusterOutput.status, COPILOT_OUTPUT_STATUS.AVAILABLE);
  assert.match(
    `${explainClusterOutput.what_this_currently_supports} ${explainClusterOutput.what_remains_limited}`,
    /monitoring gap|no product-visible evidence/i
  );
  assert.equal(explainClusterOutput.trace_refs[0].trace_kind, 'monitoring_gap');
  assert.equal(explainTakeawayOutput.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
});

test('empty, failed, and malformed states do not generate market analysis', () => {
  const emptyOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: emptyProductMainlineFixture,
    actionId: COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS,
  });
  const failedOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
    input: { cluster_id: richProductMainlineFixture.signal_clusters[0].id },
    prototypeState: BASELINE_BRIEF_PROTOTYPE_STATES.BASELINE_FAILED,
  });
  const malformedOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: {
      monitoring_run: {},
      topic_draft: {},
      signal_clusters: [],
    },
    actionId: COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS,
  });

  [emptyOutput, failedOutput, malformedOutput].forEach((output) => {
    assert.equal(output.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
    assert.equal(output.what_this_currently_supports, null);
    assert.equal(output.what_to_validate_next.length, 0);
    assert.doesNotMatch(output.what_remains_limited || '', /no demand/i);
  });
});

test('saved, watched, and hidden state are treated as user emphasis rather than market validation', () => {
  let actionState = initialActionState();

  actionState = saveCluster(actionState, {
    localTopicId: SAMPLE_TOPIC_SCOPE.topic_id,
    clusterId: richProductMainlineFixture.signal_clusters[1].id,
    titleSnapshot: richProductMainlineFixture.signal_clusters[1].headline,
    summarySnapshot: richProductMainlineFixture.signal_clusters[1].summary,
    sourceLinksSnapshot: ['https://example.com/forum/manual-handoff-pain'],
  }, { now: '2026-04-28T19:00:00.000Z' });

  actionState = watchCluster(actionState, {
    localTopicId: SAMPLE_TOPIC_SCOPE.topic_id,
    clusterId: richProductMainlineFixture.signal_clusters[0].id,
  }, { now: '2026-04-28T19:01:00.000Z' });

  actionState = hideCluster(actionState, {
    localTopicId: SAMPLE_TOPIC_SCOPE.topic_id,
    clusterId: richProductMainlineFixture.signal_clusters[0].id,
  }, { now: '2026-04-28T19:02:00.000Z' });

  const watchNextOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
    actionState,
    actionId: COPILOT_ACTION_IDS.SUGGEST_WHAT_TO_WATCH_NEXT,
  });
  const hiddenClusterOutput = buildCopilotGuidedActionMockOutput({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
    actionState,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
    input: { cluster_id: richProductMainlineFixture.signal_clusters[0].id },
  });

  assert.equal(watchNextOutput.status, COPILOT_OUTPUT_STATUS.AVAILABLE);
  assert.match(watchNextOutput.what_remains_limited, /user emphasis|do not/i);
  assert.doesNotMatch(
    `${watchNextOutput.what_this_currently_supports} ${watchNextOutput.what_remains_limited} ${watchNextOutput.what_to_validate_next.join(' ')}`,
    /validated market priorit|validated market importance/i
  );
  assert.equal(hiddenClusterOutput.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
});

test('copilot outputs do not synthesize forbidden claim phrases', () => {
  const outputs = [
    buildCopilotGuidedActionMockOutput({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: richProductMainlineFixture,
      actionId: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
      input: { cluster_id: richProductMainlineFixture.signal_clusters[0].id },
    }),
    buildCopilotGuidedActionMockOutput({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: sparseProductMainlineFixture,
      actionId: COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
      input: { cluster_id: sparseProductMainlineFixture.signal_clusters[0].id },
    }),
    buildCopilotGuidedActionMockOutput({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: noEvidenceProductMainlineFixture,
      actionId: COPILOT_ACTION_IDS.SUGGEST_WHAT_TO_WATCH_NEXT,
    }),
  ];

  outputs.forEach((output) => {
    const strings = collectStrings(output).map((entry) => entry.toLowerCase());

    FORBIDDEN_PHRASES.forEach((phrase) => {
      strings.forEach((entry) => {
        assert.equal(entry.includes(phrase), false, `Unexpected forbidden phrase found: ${phrase}`);
      });
    });
  });
});

test('copilot contracts and outputs do not expose prohibited internal fields', () => {
  const values = [
    buildRichState(),
    buildSparseState(),
    buildCopilotGuidedActionMockOutput({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: richProductMainlineFixture,
      actionId: COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
      input: { cluster_id: richProductMainlineFixture.signal_clusters[0].id },
    }),
  ];

  values.forEach((value) => {
    const keys = collectKeys(value);
    keys.forEach((key) => {
      assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
    });
  });
});

test('action availability matrix matches rich, sparse, no-evidence, empty, and failed state behavior', () => {
  const richState = buildRichState();
  const sparseState = buildSparseState();
  const noEvidenceState = buildCopilotGuidedActionsState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: noEvidenceProductMainlineFixture,
  });
  const emptyState = buildCopilotGuidedActionsState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: emptyProductMainlineFixture,
  });
  const failedState = buildCopilotGuidedActionsState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
    prototypeState: BASELINE_BRIEF_PROTOTYPE_STATES.BASELINE_FAILED,
  });

  richState.actions.forEach((action) => {
    assert.equal(action.availability.is_available, true, action.action_id);
  });

  sparseState.actions.forEach((action) => {
    assert.equal(action.availability.is_available, true, action.action_id);
  });

  const noEvidenceAvailability = noEvidenceState.actions.reduce((accumulator, action) => {
    accumulator[action.action_id] = action.availability.is_available;
    return accumulator;
  }, {});
  assert.deepEqual(noEvidenceAvailability, {
    [COPILOT_ACTION_IDS.EXPLAIN_CLUSTER]: true,
    [COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT]: false,
    [COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS]: true,
    [COPILOT_ACTION_IDS.GENERATE_VALIDATION_QUESTIONS]: true,
    [COPILOT_ACTION_IDS.SUGGEST_WHAT_TO_WATCH_NEXT]: true,
  });

  emptyState.actions.forEach((action) => {
    assert.equal(action.availability.is_available, false, action.action_id);
  });

  failedState.actions.forEach((action) => {
    assert.equal(action.availability.is_available, false, action.action_id);
  });
});
