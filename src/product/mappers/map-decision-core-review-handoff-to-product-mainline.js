const { makeProductId } = require('../utils/make-product-id');

const DECISION_CORE_REVIEW_HANDOFF_VERSION = '0.2.0-decision-core-review-handoff';
const SUPPORTED_REVIEW_HANDOFF_VERSIONS = new Set([
  DECISION_CORE_REVIEW_HANDOFF_VERSION,
]);
const ALLOWED_REVIEW_STATES = new Set([
  'ready',
  'sparse',
  'no_evidence',
  'empty',
  'blocked',
]);
const ALLOWED_RUN_STATUSES = new Set([
  'completed',
  'degraded',
  'blocked',
]);

function requireObject(value, pathName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${pathName} must be an object.`);
  }

  return value;
}

function requireString(value, pathName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${pathName} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) {
        return false;
      }

      seen.add(entry);
      return true;
    });
}

function normalizePublicSourceRefs(value) {
  return normalizeStringArray(value).filter((entry) => /^https?:\/\//i.test(entry));
}

function validateReviewHandoffVersion(handoff) {
  if (!handoff || typeof handoff !== 'object') {
    throw new Error('DecisionCoreReviewHandoff input is required.');
  }

  if (!handoff.handoff_version) {
    throw new Error('DecisionCoreReviewHandoff.handoff_version is required.');
  }

  if (!SUPPORTED_REVIEW_HANDOFF_VERSIONS.has(handoff.handoff_version)) {
    throw new Error(
      `Unsupported DecisionCoreReviewHandoff.handoff_version: ${handoff.handoff_version}`
    );
  }
}

function requireArray(value, pathName) {
  if (!Array.isArray(value)) {
    throw new Error(`${pathName} must be an array.`);
  }

  return value;
}

function buildConfidenceDisplay(confidence) {
  if (!confidence || typeof confidence !== 'object' || Array.isArray(confidence)) {
    return undefined;
  }

  const label = normalizeString(confidence.label);
  const summary = normalizeString(confidence.boundary);

  if (!label && !summary) {
    return undefined;
  }

  return {
    label,
    summary,
  };
}

function buildReviewState(handoff) {
  const reviewState = requireObject(handoff.review_state, 'DecisionCoreReviewHandoff.review_state');
  const state = requireString(reviewState.state, 'DecisionCoreReviewHandoff.review_state.state');

  if (!ALLOWED_REVIEW_STATES.has(state)) {
    throw new Error(`Unsupported DecisionCoreReviewHandoff.review_state.state: ${state}`);
  }

  return {
    state,
    reasons: normalizeStringArray(reviewState.reasons),
  };
}

function buildSourceCoverageSummary(handoff) {
  const sourceCoverage = requireObject(
    handoff.source_coverage,
    'DecisionCoreReviewHandoff.source_coverage'
  );

  return {
    source_family_count: Number(sourceCoverage.source_family_count || 0),
    public_source_ref_count: Number(sourceCoverage.public_source_ref_count || 0),
    coverage_boundary: normalizeString(sourceCoverage.coverage_boundary),
    source_families: normalizeStringArray(sourceCoverage.source_families),
  };
}

function buildTopicDraftSummary(handoff, reviewEntries, reviewState) {
  const decisionContext = requireObject(
    handoff.decision_context,
    'DecisionCoreReviewHandoff.decision_context'
  );
  const topicSeed = requireString(
    decisionContext.topic_seed,
    'DecisionCoreReviewHandoff.decision_context.topic_seed'
  );
  const firstSummary = normalizeString(reviewEntries[0]?.cluster_seed?.summary);

  if (firstSummary) {
    return firstSummary;
  }

  if (reviewState.state === 'blocked') {
    return 'Review snapshot is blocked before evidence review, so no market analysis is available.';
  }

  if (reviewState.state === 'empty') {
    return 'No reviewable signal clusters were emitted for this snapshot.';
  }

  return `Review snapshot for ${topicSeed}.`;
}

function buildTopicDraftProvenance(handoff, reviewEntries) {
  return {
    source_review_run_id: handoff.run.run_id,
    source_review_entry_ids: reviewEntries
      .map((entry) => normalizeString(entry?.review_entry_id))
      .filter(Boolean),
  };
}

function buildClusterProvenance(handoff) {
  return {
    handoff_version: handoff.handoff_version,
    source_review_run_id: handoff.run.run_id,
  };
}

function validateRun(handoff) {
  const run = requireObject(handoff.run, 'DecisionCoreReviewHandoff.run');
  const status = requireString(run.status, 'DecisionCoreReviewHandoff.run.status');

  requireString(run.run_id, 'DecisionCoreReviewHandoff.run.run_id');
  requireString(run.run_type, 'DecisionCoreReviewHandoff.run.run_type');

  if (!ALLOWED_RUN_STATUSES.has(status)) {
    throw new Error(`Unsupported DecisionCoreReviewHandoff.run.status: ${status}`);
  }
}

function buildEvidenceItemIndex(evidenceItems) {
  return evidenceItems.reduce((accumulator, evidenceItem) => {
    const evidenceItemId = requireString(
      evidenceItem?.evidence_item_id,
      'DecisionCoreReviewHandoff.evidence_items[].evidence_item_id'
    );

    if (accumulator[evidenceItemId]) {
      throw new Error(`Duplicate evidence_item_id in DecisionCoreReviewHandoff: ${evidenceItemId}`);
    }

    accumulator[evidenceItemId] = evidenceItem;
    return accumulator;
  }, {});
}

function validateEvidenceReferences(reviewEntries, evidenceItemById) {
  reviewEntries.forEach((entry) => {
    const reviewEntryId = requireString(
      entry?.review_entry_id,
      'DecisionCoreReviewHandoff.review_entries[].review_entry_id'
    );
    requireArray(
      entry.evidence_item_ids,
      `DecisionCoreReviewHandoff.review_entries[${reviewEntryId}].evidence_item_ids`
    );

    entry.evidence_item_ids.forEach((evidenceItemId) => {
      if (!evidenceItemById[evidenceItemId]) {
        throw new Error(
          `DecisionCoreReviewHandoff.review_entries evidence_item_ids references missing evidence_item: ${evidenceItemId}`
        );
      }
    });
  });
}

function buildSignalCluster(entry, context) {
  const {
    handoff,
    idPrefix,
    monitoringRunId,
    topicDraftId,
    topLevelLimitations,
  } = context;
  const reviewEntryId = requireString(
    entry.review_entry_id,
    'DecisionCoreReviewHandoff.review_entries[].review_entry_id'
  );
  const reviewPriorityOrder = Number(entry.review_priority_order);
  const safeReviewOrder = Number.isInteger(reviewPriorityOrder) && reviewPriorityOrder > 0
    ? reviewPriorityOrder
    : context.fallbackReviewOrder;
  const caveats = normalizeStringArray(entry.caveats);
  const limitations = normalizeStringArray([
    ...caveats,
    ...topLevelLimitations,
  ]);
  const clusterId = makeProductId('signal_cluster', idPrefix, [
    handoff.run.run_id,
    `review-entry-${safeReviewOrder}`,
  ]);

  return {
    cluster: {
      id: clusterId,
      parent_topic_ref: {
        topic_draft_id: topicDraftId,
      },
      monitoring_run_id: monitoringRunId,
      source_review_entry_ref: {
        review_entry_id: reviewEntryId,
        review_priority_order: safeReviewOrder,
      },
      headline: requireString(
        entry?.cluster_seed?.headline,
        'DecisionCoreReviewHandoff.review_entries[].cluster_seed.headline'
      ),
      summary: requireString(
        entry?.cluster_seed?.summary,
        'DecisionCoreReviewHandoff.review_entries[].cluster_seed.summary'
      ),
      confidence_display: buildConfidenceDisplay(entry.confidence),
      limitations,
      curated_evidence_ids: [],
      validation_hint: normalizeString(entry.next_validation_hint),
      provenance: buildClusterProvenance(handoff),
    },
    safeReviewOrder,
  };
}

function buildCuratedEvidenceRecord(evidenceItem, context) {
  const {
    handoff,
    idPrefix,
    monitoringRunId,
    signalClusterId,
    reviewEntryRef,
    topLevelLimitations,
    evidenceIndex,
  } = context;
  const evidenceItemId = requireString(
    evidenceItem.evidence_item_id,
    'DecisionCoreReviewHandoff.evidence_items[].evidence_item_id'
  );
  const publicSourceRefs = normalizePublicSourceRefs([evidenceItem.source_url]);
  const confidenceDisplay = buildConfidenceDisplay(context.confidence);
  const limitations = normalizeStringArray([
    ...context.caveats,
    ...topLevelLimitations,
  ]);

  return {
    id: makeProductId('curated_evidence_record', idPrefix, [
      handoff.run.run_id,
      `review-entry-${reviewEntryRef.review_priority_order}`,
      `evidence-${evidenceIndex + 1}`,
    ]),
    signal_cluster_id: signalClusterId,
    monitoring_run_id: monitoringRunId,
    summary: requireString(
      evidenceItem.summary,
      'DecisionCoreReviewHandoff.evidence_items[].summary'
    ),
    public_source_refs: publicSourceRefs,
    source_url: publicSourceRefs[0] || '',
    source_platform: normalizeString(evidenceItem.source_platform),
    source_title: normalizeString(evidenceItem.title),
    quote_excerpt: normalizeString(evidenceItem.quote_excerpt),
    published_at: normalizeString(evidenceItem.published_at),
    provenance_note: normalizeString(evidenceItem.provenance_note),
    confidence_display: confidenceDisplay,
    limitations,
    source_review_entry_ref: { ...reviewEntryRef },
    source_review_evidence_ref: {
      evidence_item_id: evidenceItemId,
    },
    provenance: buildClusterProvenance(handoff),
  };
}

function mapDecisionCoreReviewHandoffToProductMainline(handoff, options = {}) {
  validateReviewHandoffVersion(handoff);
  requireObject(handoff, 'DecisionCoreReviewHandoff');
  validateRun(handoff);

  const reviewState = buildReviewState(handoff);
  const sourceCoverageSummary = buildSourceCoverageSummary(handoff);
  const reviewEntries = requireArray(
    handoff.review_entries,
    'DecisionCoreReviewHandoff.review_entries'
  );
  const evidenceItems = requireArray(
    handoff.evidence_items,
    'DecisionCoreReviewHandoff.evidence_items'
  );
  const evidenceItemById = buildEvidenceItemIndex(evidenceItems);

  validateEvidenceReferences(reviewEntries, evidenceItemById);

  const importedAt = typeof options.importedAt === 'string' && options.importedAt.trim()
    ? options.importedAt
    : new Date().toISOString();
  const idPrefix = typeof options.idPrefix === 'string' && options.idPrefix.trim()
    ? options.idPrefix
    : 'ps';
  const topLevelLimitations = normalizeStringArray(handoff.limitations);
  const runId = requireString(handoff.run.run_id, 'DecisionCoreReviewHandoff.run.run_id');
  const monitoringRunId = makeProductId('monitoring_run', idPrefix, [runId]);
  const topicDraftId = makeProductId('topic_draft', idPrefix, [runId]);
  const decisionContext = requireObject(
    handoff.decision_context,
    'DecisionCoreReviewHandoff.decision_context'
  );

  const monitoringRun = {
    id: monitoringRunId,
    handoff_version: handoff.handoff_version,
    source_review_run_id: runId,
    source_review_session_id: normalizeString(handoff.run.session_id),
    review_run_type: normalizeString(handoff.run.run_type),
    review_run_status: normalizeString(handoff.run.status),
    review_state: reviewState.state,
    review_state_reasons: [...reviewState.reasons],
    ingest_status: reviewState.state === 'blocked' ? 'blocked' : 'imported',
    imported_at: importedAt,
    started_at: normalizeString(handoff.run.started_at),
    completed_at: normalizeString(handoff.run.completed_at),
  };

  const topicDraft = {
    id: topicDraftId,
    monitoring_run_id: monitoringRunId,
    lifecycle_state: reviewState.state === 'blocked' ? 'blocked' : 'draft',
    title: requireString(
      decisionContext.topic_seed,
      'DecisionCoreReviewHandoff.decision_context.topic_seed'
    ),
    summary: buildTopicDraftSummary(handoff, reviewEntries, reviewState),
    target_audience: normalizeString(decisionContext.audience),
    problem_space: normalizeString(decisionContext.problem_space),
    monitoring_intent: normalizeString(decisionContext.monitoring_intent),
    limitations_summary: topLevelLimitations.join(' '),
    provenance: buildTopicDraftProvenance(handoff, reviewEntries),
  };

  const signalClusters = [];
  const curatedEvidenceRecords = [];

  reviewEntries.forEach((entry, index) => {
    const { cluster, safeReviewOrder } = buildSignalCluster(entry, {
      handoff,
      idPrefix,
      monitoringRunId,
      topicDraftId,
      topLevelLimitations,
      fallbackReviewOrder: index + 1,
    });
    const reviewEntryRef = {
      review_entry_id: entry.review_entry_id,
      review_priority_order: safeReviewOrder,
    };
    const evidenceRecords = entry.evidence_item_ids.map((evidenceItemId, evidenceIndex) =>
      buildCuratedEvidenceRecord(evidenceItemById[evidenceItemId], {
        handoff,
        idPrefix,
        monitoringRunId,
        signalClusterId: cluster.id,
        reviewEntryRef,
        topLevelLimitations,
        confidence: entry.confidence,
        caveats: normalizeStringArray(entry.caveats),
        evidenceIndex,
      })
    );

    cluster.curated_evidence_ids = evidenceRecords.map((record) => record.id);
    signalClusters.push(cluster);
    curatedEvidenceRecords.push(...evidenceRecords);
  });

  return {
    monitoring_run: monitoringRun,
    topic_draft: topicDraft,
    review_state: reviewState,
    source_coverage_summary: sourceCoverageSummary,
    signal_clusters: signalClusters,
    curated_evidence_records: curatedEvidenceRecords,
  };
}

module.exports = {
  DECISION_CORE_REVIEW_HANDOFF_VERSION,
  SUPPORTED_REVIEW_HANDOFF_VERSIONS,
  mapDecisionCoreReviewHandoffToProductMainline,
};
