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
  saveEvidence,
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
const FORBIDDEN_PHRASES = [
  'clear demand',
  'confirmed demand',
  'proves strong demand',
  'market size',
  'purchase intent',
  'competitor strategy',
  'opportunity ranking',
  'roi',
  'adoption forecast',
  'trend acceleration',
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

  Object.values(value).forEach((entry) => {
    collectStrings(entry, strings);
  });

  return strings;
}

test('rich workspace builds the standard baseline brief fixture', () => {
  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
  });

  assert.deepEqual(briefState, richBaselineBriefFixture);
  assert.match(
    briefState.sections.key_signal_clusters[0].summary,
    /current review suggests/i
  );
  assert.notEqual(
    briefState.sections.evidence_backed_takeaways[0].takeaway_summary,
    richProductMainlineFixture.signal_clusters[0].summary
  );
  assert.match(
    briefState.sections.review_snapshot.summary,
    /evidence-backed takeaways/i
  );
  assert.equal(briefState.sections.key_signal_clusters[0].trace_available, true);
  assert.equal(briefState.sections.key_signal_clusters[0].trace_kind, 'cluster');
  assert.equal(
    briefState.sections.evidence_backed_takeaways[0].supporting_cluster_id,
    briefState.sections.evidence_backed_takeaways[0].cluster_id
  );
  assert.deepEqual(
    briefState.sections.evidence_backed_takeaways[0].supporting_evidence_ids,
    briefState.sections.evidence_backed_takeaways[0].supporting_evidence.map((item) => item.evidence_id)
  );
  assert.equal(briefState.sections.evidence_backed_takeaways[0].trace_available, true);
});

test('sparse workspace builds a preliminary baseline brief fixture', () => {
  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: sparseProductMainlineFixture,
  });

  assert.deepEqual(briefState, sparseBaselineBriefFixture);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.match(briefState.sections.review_snapshot.preliminary_caveat, /preliminary/i);
  assert.match(
    briefState.sections.evidence_backed_takeaways[0].takeaway_summary,
    /preliminary reading/i
  );
  assert.equal(
    briefState.sections.evidence_backed_takeaways[0].supporting_evidence[0].label,
    'Evidence record 1'
  );
  assert.doesNotMatch(
    briefState.sections.evidence_backed_takeaways[0].supporting_evidence[0].label,
    /public source/i
  );
  assert.equal(
    briefState.sections.caveats_and_limitations.workspace_limitations.includes(
      briefState.sections.caveats_and_limitations.preliminary_caveat
    ),
    false
  );
  assert.equal(briefState.sections.key_signal_clusters[0].trace_kind, 'cluster');
  assert.equal(briefState.sections.evidence_backed_takeaways[0].source_link_count, 0);
  assert.equal(briefState.sections.evidence_backed_takeaways[0].trace_available, true);
  assert.equal(
    new Set(briefState.sections.caveats_and_limitations.workspace_limitations).size,
    briefState.sections.caveats_and_limitations.workspace_limitations.length
  );
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
  assert.match(
    briefState.sections.key_signal_clusters[0].summary,
    /monitoring candidate/i
  );
  assert.match(
    briefState.sections.caveats_and_limitations.workspace_limitations.join(' '),
    /monitoring candidate|evidence-backed takeaway/i
  );
  assert.equal(briefState.sections.key_signal_clusters[0].trace_available, true);
  assert.equal(briefState.sections.key_signal_clusters[0].trace_kind, 'monitoring_gap');
  assert.equal(briefState.sections.key_signal_clusters[0].source_link_count, 0);
  assert.doesNotMatch(
    briefState.sections.suggested_next_review_actions.join(' '),
    /supported cluster|supported evidence item|strongest evidence-backed cluster/i
  );
  assert.equal(
    briefState.sections.caveats_and_limitations.workspace_limitations.includes(
      briefState.sections.caveats_and_limitations.preliminary_caveat
    ),
    false
  );
  assert.equal(
    new Set(briefState.sections.caveats_and_limitations.workspace_limitations).size,
    briefState.sections.caveats_and_limitations.workspace_limitations.length
  );
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
  assert.equal(briefState.sections.evidence_backed_takeaways.length, 1);
  assert.equal(briefState.sections.key_signal_clusters[0].cluster_id, richProductMainlineFixture.signal_clusters[1].id);
  assert.equal(briefState.sections.key_signal_clusters[0].is_saved, true);
  assert.equal(briefState.sections.key_signal_clusters[0].trace_available, true);
  assert.equal(briefState.sections.key_signal_clusters[0].trace_kind, 'cluster');
  assert.equal(
    briefState.sections.evidence_backed_takeaways[0].cluster_id,
    richProductMainlineFixture.signal_clusters[1].id
  );
});

test('saved evidence influences supporting-evidence order without inflating evidence strength', () => {
  let actionState = initialActionState();

  actionState = saveEvidence(actionState, {
    localTopicId: SAMPLE_TOPIC_SCOPE.topic_id,
    evidenceId: richProductMainlineFixture.curated_evidence_records[1].id,
    clusterId: richProductMainlineFixture.signal_clusters[0].id,
    labelSnapshot: richProductMainlineFixture.curated_evidence_records[1].label,
    summarySnapshot: richProductMainlineFixture.curated_evidence_records[1].summary,
    sourceUrlSnapshot: richProductMainlineFixture.curated_evidence_records[1].source_url,
  }, { now: '2026-04-28T12:03:00.000Z' });

  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
    actionState,
  });

  assert.equal(briefState.sections.review_snapshot.saved_evidence_count, 1);
  assert.equal(
    briefState.sections.evidence_backed_takeaways[0].supporting_evidence[0].evidence_id,
    richProductMainlineFixture.curated_evidence_records[1].id
  );
  assert.equal(
    briefState.sections.evidence_backed_takeaways[0].confidence_label,
    'directional'
  );
  assert.equal(
    briefState.sections.evidence_backed_takeaways[0].supporting_evidence_ids[0],
    richProductMainlineFixture.curated_evidence_records[1].id
  );
  assert.doesNotMatch(
    briefState.sections.evidence_backed_takeaways[0].takeaway_summary,
    /proved|confirmed|clear demand/i
  );
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

test('baseline brief output does not synthesize forbidden unsupported claims', () => {
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
    const strings = collectStrings(value).map((entry) => entry.toLowerCase());

    FORBIDDEN_PHRASES.forEach((phrase) => {
      strings.forEach((entry) => {
        assert.equal(
          entry.includes(phrase),
          false,
          `Unexpected forbidden phrase found: ${phrase}`
        );
      });
    });
  });
});

test('contradiction caveats stay readable without repeating contradiction risk in every takeaway', () => {
  const briefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
  });

  assert.match(
    briefState.sections.caveats_and_limitations.workspace_limitations.join(' '),
    /pull in different directions/i
  );
  briefState.sections.evidence_backed_takeaways.forEach((takeaway) => {
    assert.doesNotMatch(takeaway.takeaway_summary, /contradiction risk/i);
  });
});

test('browser-safe baseline brief builder stays aligned with the CommonJS builder', async () => {
  const browserModule = await import('../../src/product/read-models/build-baseline-brief-state.browser.mjs');
  const browserBriefState = browserModule.buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
  });
  const commonJsBriefState = buildBaselineBriefState({
    topicScope: SAMPLE_TOPIC_SCOPE,
    productMainline: richProductMainlineFixture,
  });

  assert.deepEqual(browserBriefState, commonJsBriefState);
  assert.equal(browserModule.BASELINE_BRIEF_KIND, BASELINE_BRIEF_KIND);
  assert.equal(browserModule.BASELINE_BRIEF_MODES.PRELIMINARY, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.equal(
    browserModule.BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE
  );
});
