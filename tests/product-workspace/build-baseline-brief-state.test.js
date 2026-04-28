const test = require('node:test');
const assert = require('node:assert/strict');

const richProductMainlineFixture = require('../../fixtures/product/rich-product-mainline.sample.json');
const sparseProductMainlineFixture = require('../../fixtures/product/sparse-product-mainline.sample.json');
const emptyProductMainlineFixture = require('../../fixtures/product/empty-product-mainline.sample.json');
const noEvidenceProductMainlineFixture = require('../../fixtures/product/no-evidence-product-mainline.sample.json');
const richBaselineBriefFixture = require('../../fixtures/product/baseline-brief-state.sample.json');
const sparseBaselineBriefFixture = require('../../fixtures/product/baseline-brief-sparse-state.sample.json');
const {
  hideCluster,
  initialActionState,
  saveCluster,
  watchCluster,
} = require('../../src/product/actions/user-action-state');
const {
  BASELINE_BRIEF_KIND,
  BASELINE_BRIEF_MODES,
  BASELINE_BRIEF_PROTOTYPE_STATES,
  BASELINE_BRIEF_UNAVAILABLE_REASONS,
  buildBaselineBriefState,
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
  'opportunity_score',
  'raw_refs',
  'raw_trace_refs',
  'claim_candidate_id',
  'internal_decision_core',
  'decision_band',
  'claim_id',
  'opportunity_id',
  'review_priority',
  'prompt_logs',
  'crawler_logs',
  'source_ranked_entry_ref',
  'provenance',
  'quote_excerpt',
  'published_at',
  'observed_at',
  'support_role',
]);

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

test('rich workspace builds the standard baseline brief fixture', () => {
  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
  });

  assert.deepEqual(briefState, richBaselineBriefFixture);
});

test('sparse workspace builds a preliminary baseline brief fixture', () => {
  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: sparseProductMainlineFixture,
  });

  assert.deepEqual(briefState, sparseBaselineBriefFixture);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.match(briefState.sections.review_snapshot.preliminary_caveat, /preliminary/i);
});

test('no-evidence workspace remains eligible but excludes evidence-backed takeaways', () => {
  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: noEvidenceProductMainlineFixture,
  });

  assert.equal(briefState.brief_kind, BASELINE_BRIEF_KIND);
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.equal(briefState.sections.key_signal_clusters.length, 1);
  assert.equal(briefState.sections.evidence_backed_takeaways.length, 0);
});

test('empty workspace does not produce a normal baseline brief', () => {
  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: emptyProductMainlineFixture,
  });

  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE
  );
  assert.equal(briefState.sections.topic_context, null);
  assert.deepEqual(briefState.sections.key_signal_clusters, []);
});

test('failed, stuck, data-unavailable, unknown-fixture, and unexpected-status prototype states are not eligible', () => {
  const prototypeStates = [
    {
      key: BASELINE_BRIEF_PROTOTYPE_STATES.BASELINE_FAILED,
      reason: BASELINE_BRIEF_UNAVAILABLE_REASONS.BASELINE_FAILED,
    },
    {
      key: BASELINE_BRIEF_PROTOTYPE_STATES.BASELINE_STUCK,
      reason: BASELINE_BRIEF_UNAVAILABLE_REASONS.BASELINE_STUCK,
    },
    {
      key: BASELINE_BRIEF_PROTOTYPE_STATES.DATA_UNAVAILABLE,
      reason: BASELINE_BRIEF_UNAVAILABLE_REASONS.DATA_UNAVAILABLE,
    },
    {
      key: BASELINE_BRIEF_PROTOTYPE_STATES.UNKNOWN_FIXTURE_KEY,
      reason: BASELINE_BRIEF_UNAVAILABLE_REASONS.UNKNOWN_FIXTURE_KEY,
    },
    {
      key: BASELINE_BRIEF_PROTOTYPE_STATES.UNEXPECTED_TOPIC_STATUS,
      reason: BASELINE_BRIEF_UNAVAILABLE_REASONS.UNEXPECTED_TOPIC_STATUS,
    },
  ];

  prototypeStates.forEach(({ key, reason }) => {
    const briefState = buildBaselineBriefState({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: richProductMainlineFixture,
      prototypeState: key,
    });

    assert.equal(briefState.eligibility.is_eligible, false);
    assert.equal(briefState.eligibility.unavailable_reason, reason);
    assert.deepEqual(briefState.sections.evidence_backed_takeaways, []);
  });
});

test('non-ready topic status is treated as review_not_ready instead of a normal brief', () => {
  const briefState = buildBaselineBriefState({
    topicScope: {
      ...SAMPLE_TOPIC_SCOPE,
      topic_status: 'building',
    },
    productMainline: richProductMainlineFixture,
  });

  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_NOT_READY
  );
});

test('saved, watched, and hidden state influences the brief without changing eligibility semantics', () => {
  let actionState = initialActionState();

  actionState = saveCluster(actionState, {
    localTopicId: SAMPLE_TOPIC_SCOPE.topic_id,
    clusterId: richProductMainlineFixture.signal_clusters[1].id,
    titleSnapshot: richProductMainlineFixture.signal_clusters[1].headline,
    summarySnapshot: richProductMainlineFixture.signal_clusters[1].summary,
    sourceLinksSnapshot: ['https://example.com/forum/manual-handoff-pain'],
  }, { now: '2026-04-28T12:00:00.000Z' });

  actionState = watchCluster(actionState, {
    localTopicId: SAMPLE_TOPIC_SCOPE.topic_id,
    clusterId: richProductMainlineFixture.signal_clusters[0].id,
  }, { now: '2026-04-28T12:01:00.000Z' });

  actionState = hideCluster(actionState, {
    localTopicId: SAMPLE_TOPIC_SCOPE.topic_id,
    clusterId: richProductMainlineFixture.signal_clusters[0].id,
  }, { now: '2026-04-28T12:02:00.000Z' });

  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
    actionState,
  });

  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.sections.review_snapshot.saved_cluster_count, 1);
  assert.equal(briefState.sections.review_snapshot.watched_cluster_count, 1);
  assert.equal(briefState.sections.review_snapshot.visible_cluster_count, 1);
  assert.equal(briefState.sections.key_signal_clusters.length, 1);
  assert.equal(briefState.sections.key_signal_clusters[0].cluster_id, richProductMainlineFixture.signal_clusters[1].id);
  assert.equal(briefState.sections.key_signal_clusters[0].is_saved, true);
});

test('malformed product mainline returns data-unavailable instead of a normal or empty brief', () => {
  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: {
      monitoring_run: {},
      topic_draft: {},
      signal_clusters: [],
    },
  });

  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.DATA_UNAVAILABLE
  );
  assert.notEqual(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE
  );
});

test('baseline brief output does not expose prohibited internal fields', () => {
  const values = [
    buildBaselineBriefState({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: richProductMainlineFixture,
    }),
    buildBaselineBriefState({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: sparseProductMainlineFixture,
    }),
    buildBaselineBriefState({
      topicScope: SAMPLE_TOPIC_SCOPE,
      productMainline: noEvidenceProductMainlineFixture,
    }),
  ];

  values.forEach((value) => {
    const keys = collectKeys(value);

    keys.forEach((key) => {
      assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
    });
  });
});
