const test = require('node:test');
const assert = require('node:assert/strict');

const readyReviewHandoff = require('../../fixtures/external/decision-core/review-handoff-ready.sample.json');
const sparseReviewHandoff = require('../../fixtures/external/decision-core/review-handoff-sparse.sample.json');
const noEvidenceReviewHandoff = require('../../fixtures/external/decision-core/review-handoff-no-evidence.sample.json');
const emptyReviewHandoff = require('../../fixtures/external/decision-core/review-handoff-empty.sample.json');
const blockedReviewHandoff = require('../../fixtures/external/decision-core/review-handoff-blocked.sample.json');
const generatedReadyReviewHandoff = require('../../fixtures/external/decision-core/generated/review-handoff-ready.generated.json');
const generatedSparseReviewHandoff = require('../../fixtures/external/decision-core/generated/review-handoff-sparse.generated.json');
const generatedNoEvidenceReviewHandoff = require('../../fixtures/external/decision-core/generated/review-handoff-no-evidence.generated.json');
const generatedEmptyReviewHandoff = require('../../fixtures/external/decision-core/generated/review-handoff-empty.generated.json');
const generatedBlockedReviewHandoff = require('../../fixtures/external/decision-core/generated/review-handoff-blocked.generated.json');
const cachedGeneratedReadyReviewHandoff = require('../../fixtures/external/decision-core/generated/cached-source/review-handoff-ready.cached.generated.json');
const cachedGeneratedSparseReviewHandoff = require('../../fixtures/external/decision-core/generated/cached-source/review-handoff-sparse.cached.generated.json');
const cachedGeneratedNoEvidenceReviewHandoff = require('../../fixtures/external/decision-core/generated/cached-source/review-handoff-no-evidence.cached.generated.json');
const cachedGeneratedEmptyReviewHandoff = require('../../fixtures/external/decision-core/generated/cached-source/review-handoff-empty.cached.generated.json');
const cachedGeneratedBlockedReviewHandoff = require('../../fixtures/external/decision-core/generated/cached-source/review-handoff-blocked.cached.generated.json');
const {
  buildCopilotGuidedActionMockOutput,
  buildCopilotGuidedActionsState,
  COPILOT_ACTION_IDS,
  COPILOT_OUTPUT_STATUS,
  COPILOT_WORKSPACE_STATES,
} = require('../../src/product/copilot/build-copilot-guided-actions-state');
const {
  buildBaselineBriefState,
  BASELINE_BRIEF_MODES,
  BASELINE_BRIEF_UNAVAILABLE_REASONS,
} = require('../../src/product/read-models/build-baseline-brief-state');
const {
  buildEvidenceDrawerState,
} = require('../../src/product/read-models/build-evidence-drawer-state');
const {
  buildTopicWorkspaceViewState,
} = require('../../src/product/read-models/build-topic-workspace-view-state');
const {
  DECISION_CORE_REVIEW_HANDOFF_VERSION,
  mapDecisionCoreReviewHandoffToProductMainline,
} = require('../../src/product/mappers/map-decision-core-review-handoff-to-product-mainline');

const FIXED_IMPORTED_AT = '2026-04-29T18:00:00.000Z';
const PROHIBITED_KEYS = new Set([
  'OpportunitySet',
  'OpportunityCard',
  'OpportunityScore',
  'ClaimTrace',
  'opportunity_score',
  'raw_opportunity_score',
  'market_opportunity_score',
  'business_value_score',
  'opportunity_rank',
  'score_band',
  'scoring_hooks',
  'opportunity_card_id',
  'raw_refs',
  'raw_trace_refs',
  'raw_ref',
  'raw_items',
  'claim_candidate_id',
  'claim_trace_id',
  'claim_id',
  'opportunity_id',
  'source_item_id',
  'evidence_candidate_id',
  'analysis_packet_id',
  'internal_decision_core',
  'internal_priority_inputs',
  'decision_core_refs',
  'analysis_packets',
  'corroboration_record',
  'support_entries',
  'contradiction_entries',
  'weak_context_entries',
  'prompt_logs',
  'crawler_logs',
  'llm_patch_status',
  'llm_patch_provider',
  'llm_patch_model',
  'llm_patch_verification',
  'analysis_llm_patch_decisions',
  'raw_llm_decision',
  'patch_status',
  'raw_source_payload',
  'unprocessed_source_payload',
  'debug_metadata',
  'source_ranked_entry_ref',
  'ranked_entries',
  'ranked_entry_count',
]);
const FORBIDDEN_PHRASES = [
  'clear demand',
  'confirmed demand',
  'proves strong demand',
  'purchase intent',
  'opportunity ranking',
  'market opportunity',
  'opportunity score',
  'business opportunity ranking',
  'gtm recommendation',
  'pricing recommendation',
  'roadmap recommendation',
  'market sizing',
  'no demand',
];
const GENERATED_REVIEW_HANDOFFS = [
  generatedReadyReviewHandoff,
  generatedSparseReviewHandoff,
  generatedNoEvidenceReviewHandoff,
  generatedEmptyReviewHandoff,
  generatedBlockedReviewHandoff,
];
const CACHED_SOURCE_GENERATED_REVIEW_HANDOFFS = [
  cachedGeneratedReadyReviewHandoff,
  cachedGeneratedSparseReviewHandoff,
  cachedGeneratedNoEvidenceReviewHandoff,
  cachedGeneratedEmptyReviewHandoff,
  cachedGeneratedBlockedReviewHandoff,
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function mapReviewHandoff(handoff) {
  return mapDecisionCoreReviewHandoffToProductMainline(handoff, {
    importedAt: FIXED_IMPORTED_AT,
  });
}

function assertNoProhibitedKeys(value) {
  collectKeys(value).forEach((key) => {
    assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
  });
}

function assertNoForbiddenPhrases(value) {
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
}

function assertClusterEvidenceRefsResolved(productMainline) {
  const evidenceIds = new Set(productMainline.curated_evidence_records.map((record) => record.id));

  productMainline.signal_clusters.forEach((cluster) => {
    cluster.curated_evidence_ids.forEach((evidenceId) => {
      assert.equal(evidenceIds.has(evidenceId), true, `Dangling evidence id: ${evidenceId}`);
    });
  });
}

function assertSourceLikeEvidenceQuoteExcerpts(handoff, productMainline, expectedSnippet) {
  const sourceLikeEvidence = handoff.evidence_items.find((item) =>
    typeof item.quote_excerpt === 'string'
    && item.quote_excerpt.includes(expectedSnippet)
  );

  assert.ok(sourceLikeEvidence, `Expected source-like quote excerpt containing "${expectedSnippet}"`);

  const productEvidence = productMainline.curated_evidence_records.find((record) =>
    record.source_review_evidence_ref.evidence_item_id === sourceLikeEvidence.evidence_item_id
  );

  assert.ok(productEvidence, 'Expected copied evidence item to map into a product-owned evidence record');
  assert.equal(productEvidence.quote_excerpt, sourceLikeEvidence.quote_excerpt);
  assert.equal(productEvidence.quote_excerpt.includes('Users want a clearer and lower-friction product behavior.'), false);
  assert.equal(productEvidence.quote_excerpt.includes('Users want more explicit privacy controls'), false);
  assert.equal(productEvidence.id.startsWith('curated_evidence_record_'), true);

  const cluster = productMainline.signal_clusters.find((entry) =>
    entry.curated_evidence_ids.includes(productEvidence.id)
  );
  const drawerState = buildEvidenceDrawerState({
    topicDraft: productMainline.topic_draft,
    signalCluster: cluster,
    curatedEvidenceRecords: productMainline.curated_evidence_records,
  });
  const briefState = buildBaselineBriefState({ productMainline });

  assert.ok(drawerState.evidence_items.some((item) => item.summary === productEvidence.summary));
  assert.ok(
    briefState.sections.evidence_backed_takeaways.some((takeaway) =>
      takeaway.supporting_evidence.some((item) => item.summary === productEvidence.summary)
    )
  );
}

test('ready review handoff maps to normal product mainline and read models', () => {
  const productMainline = mapReviewHandoff(readyReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.monitoring_run.handoff_version, DECISION_CORE_REVIEW_HANDOFF_VERSION);
  assert.equal(productMainline.monitoring_run.source_review_run_id, readyReviewHandoff.run.run_id);
  assert.equal(productMainline.monitoring_run.imported_at, FIXED_IMPORTED_AT);
  assert.equal(productMainline.review_state.state, 'ready');
  assert.equal(productMainline.signal_clusters.length, readyReviewHandoff.review_entries.length);
  assert.equal(productMainline.curated_evidence_records.length, readyReviewHandoff.evidence_items.length);
  assert.equal(workspaceState.review_state.state, 'ready');
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, false);
  assert.equal(workspaceState.empty_or_sparse_state.is_sparse, false);
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.STANDARD);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.RICH);
  assertClusterEvidenceRefsResolved(productMainline);
});

test('evidence ids become product-owned ids without dangling cluster references', () => {
  const productMainline = mapReviewHandoff(readyReviewHandoff);
  const coreEvidenceIds = new Set(readyReviewHandoff.evidence_items.map((item) => item.evidence_item_id));

  productMainline.curated_evidence_records.forEach((record) => {
    assert.match(record.id, /^curated_evidence_record_ps__/);
    assert.equal(coreEvidenceIds.has(record.id), false);
    assert.equal(
      coreEvidenceIds.has(record.source_review_evidence_ref.evidence_item_id),
      true
    );
  });
  assertClusterEvidenceRefsResolved(productMainline);
});

test('sparse review handoff preserves explicit preliminary state even with source URLs', () => {
  const productMainline = mapReviewHandoff(sparseReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.review_state.state, 'sparse');
  assert.equal(productMainline.curated_evidence_records.length, 1);
  assert.equal(productMainline.curated_evidence_records[0].public_source_refs.length, 1);
  assert.equal(workspaceState.empty_or_sparse_state.state, 'sparse');
  assert.equal(workspaceState.empty_or_sparse_state.is_sparse, true);
  assert.ok(
    workspaceState.empty_or_sparse_state.explicit_reasons.includes('limited_public_source_coverage')
  );
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.SPARSE);
});

test('no_evidence review handoff keeps visible clusters without fake evidence-backed takeaways', () => {
  const productMainline = mapReviewHandoff(noEvidenceReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });
  const explainClusterOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
    input: { cluster_id: productMainline.signal_clusters[0].id },
  });
  const explainTakeawayOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
    input: { cluster_id: productMainline.signal_clusters[0].id },
  });

  assert.equal(productMainline.review_state.state, 'no_evidence');
  assert.equal(productMainline.signal_clusters.length, 1);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.signal_cluster_sections[0].drawer_available, false);
  assert.equal(workspaceState.signal_cluster_sections[0].evidence_count, 0);
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.equal(briefState.sections.key_signal_clusters.length, 1);
  assert.equal(briefState.sections.evidence_backed_takeaways.length, 0);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.NO_EVIDENCE);
  assert.equal(explainClusterOutput.status, COPILOT_OUTPUT_STATUS.AVAILABLE);
  assert.equal(explainClusterOutput.trace_refs[0].trace_kind, 'monitoring_gap');
  assert.equal(explainTakeawayOutput.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
});

test('empty review handoff creates no normal Brief and does not imply no demand', () => {
  const productMainline = mapReviewHandoff(emptyReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.review_state.state, 'empty');
  assert.equal(productMainline.signal_clusters.length, 0);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, true);
  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE
  );
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.EMPTY);
  assertNoForbiddenPhrases({
    productMainline,
    workspaceState,
    briefState,
  });
});

test('blocked review handoff maps to safe unavailable state without becoming empty', () => {
  const productMainline = mapReviewHandoff(blockedReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });
  const summarizeOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS,
  });

  assert.equal(productMainline.review_state.state, 'blocked');
  assert.equal(productMainline.monitoring_run.ingest_status, 'blocked');
  assert.equal(productMainline.signal_clusters.length, 0);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.empty_or_sparse_state.is_blocked, true);
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, false);
  assert.equal(workspaceState.empty_or_sparse_state.is_sparse, false);
  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_BLOCKED
  );
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.REVIEW_BLOCKED);
  copilotState.actions.forEach((action) => {
    assert.equal(action.availability.is_available, false, action.action_id);
  });
  assert.equal(summarizeOutput.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
  assert.equal(summarizeOutput.what_this_currently_supports, null);
  assert.equal(summarizeOutput.what_to_validate_next.length, 0);
});

test('unsupported review handoff version throws a clear error', () => {
  const handoff = clone(readyReviewHandoff);
  handoff.handoff_version = '9.9.9-unknown';

  assert.throws(
    () => mapReviewHandoff(handoff),
    /unsupported decisioncorereviewhandoff\.handoff_version/i
  );
});

test('dangling evidence_item_ids throw instead of creating broken product refs', () => {
  const handoff = clone(readyReviewHandoff);
  handoff.review_entries[0].evidence_item_ids.push('evidence-item:missing');

  assert.throws(
    () => mapReviewHandoff(handoff),
    /references missing evidence_item/i
  );
});

test('mapped review handoff output excludes prohibited internal fields', () => {
  [
    readyReviewHandoff,
    sparseReviewHandoff,
    noEvidenceReviewHandoff,
    emptyReviewHandoff,
    blockedReviewHandoff,
  ].forEach((handoff) => {
    assertNoProhibitedKeys(mapReviewHandoff(handoff));
  });
});

test('review_priority_order remains bounded source review metadata, not a score', () => {
  const productMainline = mapReviewHandoff(readyReviewHandoff);
  const keys = collectKeys(productMainline);

  assert.equal(keys.includes('review_priority_order'), true);
  assert.equal(keys.includes('opportunity_score'), false);
  assert.equal(keys.includes('market_opportunity_score'), false);
  assert.equal(keys.includes('business_value_score'), false);
  assert.equal(productMainline.signal_clusters[0].source_review_entry_ref.review_priority_order, 1);
  assert.equal(
    productMainline.signal_clusters[0].source_review_entry_ref.review_entry_id,
    readyReviewHandoff.review_entries[0].review_entry_id
  );
  assert.equal(productMainline.signal_clusters[0].source_ranked_entry_ref, undefined);
});

test('generated ready review handoff maps to normal product mainline and read models', () => {
  const productMainline = mapReviewHandoff(generatedReadyReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.monitoring_run.handoff_version, DECISION_CORE_REVIEW_HANDOFF_VERSION);
  assert.equal(productMainline.review_state.state, 'ready');
  assert.equal(productMainline.signal_clusters.length, generatedReadyReviewHandoff.review_entries.length);
  assert.equal(productMainline.curated_evidence_records.length, generatedReadyReviewHandoff.evidence_items.length);
  assert.equal(workspaceState.review_state.state, 'ready');
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, false);
  assert.equal(workspaceState.empty_or_sparse_state.is_sparse, false);
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.STANDARD);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.RICH);
  assertClusterEvidenceRefsResolved(productMainline);
  assertSourceLikeEvidenceQuoteExcerpts(
    generatedReadyReviewHandoff,
    productMainline,
    'People keep asking for clearer privacy controls.'
  );
});

test('generated sparse review handoff preserves explicit preliminary state', () => {
  const productMainline = mapReviewHandoff(generatedSparseReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.review_state.state, 'sparse');
  assert.equal(productMainline.curated_evidence_records.length, generatedSparseReviewHandoff.evidence_items.length);
  assert.equal(workspaceState.empty_or_sparse_state.state, 'sparse');
  assert.equal(workspaceState.empty_or_sparse_state.is_sparse, true);
  assert.ok(
    workspaceState.empty_or_sparse_state.explicit_reasons.includes('limited_public_source_coverage')
  );
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.SPARSE);
  assertClusterEvidenceRefsResolved(productMainline);
  assertSourceLikeEvidenceQuoteExcerpts(
    generatedSparseReviewHandoff,
    productMainline,
    'People keep asking for clearer privacy controls.'
  );
});

test('generated no_evidence review handoff creates no fake evidence-backed takeaway', () => {
  const productMainline = mapReviewHandoff(generatedNoEvidenceReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });
  const explainClusterOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
    input: { cluster_id: productMainline.signal_clusters[0].id },
  });
  const explainTakeawayOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
    input: { cluster_id: productMainline.signal_clusters[0].id },
  });

  assert.equal(productMainline.review_state.state, 'no_evidence');
  assert.equal(productMainline.signal_clusters.length, generatedNoEvidenceReviewHandoff.review_entries.length);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.signal_cluster_sections[0].drawer_available, false);
  assert.equal(briefState.sections.evidence_backed_takeaways.length, 0);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.NO_EVIDENCE);
  assert.equal(explainClusterOutput.status, COPILOT_OUTPUT_STATUS.AVAILABLE);
  assert.equal(explainClusterOutput.trace_refs[0].trace_kind, 'monitoring_gap');
  assert.equal(explainTakeawayOutput.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
});

test('generated empty review handoff keeps safe empty behavior without demand conclusions', () => {
  const productMainline = mapReviewHandoff(generatedEmptyReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.review_state.state, 'empty');
  assert.equal(productMainline.signal_clusters.length, 0);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, true);
  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE
  );
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.EMPTY);
  assertNoForbiddenPhrases({
    productMainline,
    workspaceState,
    briefState,
  });
});

test('generated blocked review handoff maps to safe unavailable state without market analysis', () => {
  const productMainline = mapReviewHandoff(generatedBlockedReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });
  const summarizeOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS,
  });

  assert.equal(productMainline.review_state.state, 'blocked');
  assert.equal(productMainline.monitoring_run.ingest_status, 'blocked');
  assert.equal(productMainline.signal_clusters.length, 0);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.empty_or_sparse_state.is_blocked, true);
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, false);
  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_BLOCKED
  );
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.REVIEW_BLOCKED);
  assert.equal(summarizeOutput.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
  assertNoForbiddenPhrases({
    productMainline,
    workspaceState,
    briefState,
    summarizeOutput,
  });
});

test('generated evidence ids become product-owned ids without dangling refs', () => {
  const productMainline = mapReviewHandoff(generatedReadyReviewHandoff);
  const coreEvidenceIds = new Set(generatedReadyReviewHandoff.evidence_items.map((item) => item.evidence_item_id));

  productMainline.curated_evidence_records.forEach((record) => {
    assert.match(record.id, /^curated_evidence_record_ps__/);
    assert.equal(coreEvidenceIds.has(record.id), false);
    assert.equal(
      coreEvidenceIds.has(record.source_review_evidence_ref.evidence_item_id),
      true
    );
  });
  assertClusterEvidenceRefsResolved(productMainline);
});

test('generated review handoff outputs exclude prohibited internals', () => {
  GENERATED_REVIEW_HANDOFFS.forEach((handoff) => {
    assertNoProhibitedKeys(mapReviewHandoff(handoff));
  });
});

test('generated review_priority_order remains review order only', () => {
  const productMainline = mapReviewHandoff(generatedReadyReviewHandoff);
  const keys = collectKeys(productMainline);

  assert.equal(keys.includes('review_priority_order'), true);
  assert.equal(keys.includes('opportunity_score'), false);
  assert.equal(keys.includes('market_opportunity_score'), false);
  assert.equal(keys.includes('business_value_score'), false);
  assert.equal(productMainline.signal_clusters[0].source_review_entry_ref.review_priority_order, 1);
  assert.equal(
    productMainline.signal_clusters[0].source_review_entry_ref.review_entry_id,
    generatedReadyReviewHandoff.review_entries[0].review_entry_id
  );
  assert.equal(productMainline.signal_clusters[0].source_ranked_entry_ref, undefined);
});

test('cached-source generated ready review handoff maps to normal product mainline and read models', () => {
  const productMainline = mapReviewHandoff(cachedGeneratedReadyReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.monitoring_run.handoff_version, DECISION_CORE_REVIEW_HANDOFF_VERSION);
  assert.equal(productMainline.review_state.state, 'ready');
  assert.equal(productMainline.signal_clusters.length, cachedGeneratedReadyReviewHandoff.review_entries.length);
  assert.equal(productMainline.curated_evidence_records.length, cachedGeneratedReadyReviewHandoff.evidence_items.length);
  assert.equal(workspaceState.review_state.state, 'ready');
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, false);
  assert.equal(workspaceState.empty_or_sparse_state.is_sparse, false);
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.STANDARD);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.RICH);
  assertClusterEvidenceRefsResolved(productMainline);
  assertSourceLikeEvidenceQuoteExcerpts(
    cachedGeneratedReadyReviewHandoff,
    productMainline,
    'I need clearer privacy controls before I can trust this with client calls.'
  );
});

test('cached-source generated sparse review handoff preserves preliminary state', () => {
  const productMainline = mapReviewHandoff(cachedGeneratedSparseReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.review_state.state, 'sparse');
  assert.equal(productMainline.curated_evidence_records.length, cachedGeneratedSparseReviewHandoff.evidence_items.length);
  assert.equal(workspaceState.empty_or_sparse_state.state, 'sparse');
  assert.equal(workspaceState.empty_or_sparse_state.is_sparse, true);
  assert.ok(
    workspaceState.empty_or_sparse_state.explicit_reasons.includes('limited_cached_source_coverage')
  );
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.SPARSE);
  assertClusterEvidenceRefsResolved(productMainline);
  assertSourceLikeEvidenceQuoteExcerpts(
    cachedGeneratedSparseReviewHandoff,
    productMainline,
    'I need clearer privacy controls before I can trust this with client calls.'
  );
});

test('cached-source generated no_evidence creates visible review state without fake evidence-backed takeaways', () => {
  const productMainline = mapReviewHandoff(cachedGeneratedNoEvidenceReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });
  const explainClusterOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
    input: { cluster_id: productMainline.signal_clusters[0].id },
  });
  const explainTakeawayOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
    input: { cluster_id: productMainline.signal_clusters[0].id },
  });

  assert.equal(productMainline.review_state.state, 'no_evidence');
  assert.equal(productMainline.signal_clusters.length, cachedGeneratedNoEvidenceReviewHandoff.review_entries.length);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.signal_cluster_sections[0].drawer_available, false);
  assert.equal(workspaceState.signal_cluster_sections[0].evidence_count, 0);
  assert.equal(briefState.eligibility.is_eligible, true);
  assert.equal(briefState.eligibility.brief_mode, BASELINE_BRIEF_MODES.PRELIMINARY);
  assert.equal(briefState.sections.evidence_backed_takeaways.length, 0);
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.NO_EVIDENCE);
  assert.equal(explainClusterOutput.status, COPILOT_OUTPUT_STATUS.AVAILABLE);
  assert.equal(explainClusterOutput.trace_refs[0].trace_kind, 'monitoring_gap');
  assert.equal(explainTakeawayOutput.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
});

test('cached-source generated empty review handoff keeps safe empty behavior without demand conclusions', () => {
  const productMainline = mapReviewHandoff(cachedGeneratedEmptyReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });

  assert.equal(productMainline.review_state.state, 'empty');
  assert.equal(productMainline.signal_clusters.length, 0);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, true);
  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE
  );
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.EMPTY);
  assertNoForbiddenPhrases({
    productMainline,
    workspaceState,
    briefState,
  });
});

test('cached-source generated blocked review handoff maps to safe unavailable state without market analysis', () => {
  const productMainline = mapReviewHandoff(cachedGeneratedBlockedReviewHandoff);
  const workspaceState = buildTopicWorkspaceViewState(productMainline);
  const briefState = buildBaselineBriefState({ productMainline });
  const copilotState = buildCopilotGuidedActionsState({ productMainline });
  const summarizeOutput = buildCopilotGuidedActionMockOutput({
    productMainline,
    actionId: COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS,
  });

  assert.equal(productMainline.review_state.state, 'blocked');
  assert.equal(productMainline.monitoring_run.ingest_status, 'blocked');
  assert.equal(productMainline.signal_clusters.length, 0);
  assert.equal(productMainline.curated_evidence_records.length, 0);
  assert.equal(workspaceState.empty_or_sparse_state.is_blocked, true);
  assert.equal(workspaceState.empty_or_sparse_state.is_empty, false);
  assert.equal(briefState.eligibility.is_eligible, false);
  assert.equal(
    briefState.eligibility.unavailable_reason,
    BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_BLOCKED
  );
  assert.equal(copilotState.workspace_state, COPILOT_WORKSPACE_STATES.REVIEW_BLOCKED);
  assert.equal(summarizeOutput.status, COPILOT_OUTPUT_STATUS.UNAVAILABLE);
  assertNoForbiddenPhrases({
    productMainline,
    workspaceState,
    briefState,
    summarizeOutput,
  });
});

test('cached-source generated evidence ids become product-owned ids without dangling refs', () => {
  const productMainline = mapReviewHandoff(cachedGeneratedReadyReviewHandoff);
  const coreEvidenceIds = new Set(cachedGeneratedReadyReviewHandoff.evidence_items.map((item) => item.evidence_item_id));

  productMainline.curated_evidence_records.forEach((record) => {
    assert.match(record.id, /^curated_evidence_record_ps__/);
    assert.equal(coreEvidenceIds.has(record.id), false);
    assert.equal(
      coreEvidenceIds.has(record.source_review_evidence_ref.evidence_item_id),
      true
    );
  });
  assertClusterEvidenceRefsResolved(productMainline);
});

test('cached-source generated review handoff outputs exclude prohibited internals', () => {
  CACHED_SOURCE_GENERATED_REVIEW_HANDOFFS.forEach((handoff) => {
    assertNoProhibitedKeys(mapReviewHandoff(handoff));
  });
});

test('cached-source generated review_priority_order remains review order only', () => {
  const productMainline = mapReviewHandoff(cachedGeneratedReadyReviewHandoff);
  const keys = collectKeys(productMainline);

  assert.equal(keys.includes('review_priority_order'), true);
  assert.equal(keys.includes('opportunity_score'), false);
  assert.equal(keys.includes('market_opportunity_score'), false);
  assert.equal(keys.includes('business_value_score'), false);
  assert.equal(productMainline.signal_clusters[0].source_review_entry_ref.review_priority_order, 1);
  assert.equal(
    productMainline.signal_clusters[0].source_review_entry_ref.review_entry_id,
    cachedGeneratedReadyReviewHandoff.review_entries[0].review_entry_id
  );
  assert.equal(productMainline.signal_clusters[0].source_ranked_entry_ref, undefined);
});
