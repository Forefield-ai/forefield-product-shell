const { makeProductId } = require('../utils/make-product-id');

const DECISION_CORE_REVIEW_HANDOFF_V03_VERSION = '0.3.0-decision-core-review-handoff';
const GROUPED_EVIDENCE_SCHEMA_VERSION = 'grouped_evidence_v1';

const GROUPED_SECTION_IDS = Object.freeze([
  'direct_support',
  'weak_support',
  'trend_context',
  'competitive_context',
  'professional_context',
  'counter_evidence',
  'discovery_leads',
]);

const SECTION_FALLBACK_LABELS = Object.freeze({
  direct_support: 'Direct Support',
  weak_support: 'Weak Support',
  trend_context: 'Trend Context',
  competitive_context: 'Competitive Context',
  professional_context: 'Professional Context',
  counter_evidence: 'Counter Evidence',
  discovery_leads: 'Discovery Lead',
});

const URL_PATTERN = /https?:\/\/\S+/gi;

function arr(value) {
  return Array.isArray(value) ? value : [];
}

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

function normalizeString(value, maxLength = 520) {
  return String(value || '')
    .replace(URL_PATTERN, '[redacted reference]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function uniqueStrings(values, maxItems = 20, maxLength = 260) {
  const seen = new Set();

  return arr(values)
    .map((entry) => normalizeString(entry, maxLength))
    .filter(Boolean)
    .filter((entry) => {
      const key = entry.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function normalizeConfidenceDisplay(confidence) {
  if (!confidence || typeof confidence !== 'object' || Array.isArray(confidence)) {
    return undefined;
  }

  const label = normalizeString(confidence.label || confidence.confidence_label, 80);
  const summary = normalizeString(confidence.boundary || confidence.summary || confidence.confidence_boundary, 260);

  if (!label && !summary) {
    return undefined;
  }

  return {
    label,
    summary,
  };
}

function validateReviewHandoffV03(handoff) {
  requireObject(handoff, 'DecisionCoreReviewHandoffV03');

  if (handoff.handoff_version !== DECISION_CORE_REVIEW_HANDOFF_V03_VERSION) {
    throw new Error(
      `Unsupported DecisionCoreReviewHandoffV03.handoff_version: ${handoff.handoff_version}`
    );
  }

  if (
    handoff.grouped_evidence_support
    && handoff.grouped_evidence_support.schema_version
    && handoff.grouped_evidence_support.schema_version !== GROUPED_EVIDENCE_SCHEMA_VERSION
  ) {
    throw new Error(
      `Unsupported grouped evidence schema: ${handoff.grouped_evidence_support.schema_version}`
    );
  }
}

function buildSourceCoverageSummary(handoff) {
  const sourceCoverage = handoff.source_coverage
    && typeof handoff.source_coverage === 'object'
    && !Array.isArray(handoff.source_coverage)
    ? handoff.source_coverage
    : {};

  return {
    public_source_ref_count: Number(sourceCoverage.public_source_ref_count || 0),
    source_family_count: Number(sourceCoverage.source_family_count || 0),
    coverage_boundary: normalizeString(sourceCoverage.coverage_boundary, 240),
    source_families: uniqueStrings(sourceCoverage.source_families, 20, 80),
  };
}

function normalizeGroupedEvidenceItem(item, sectionId, index) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const summary = normalizeString(item.contribution_summary || item.summary || item.safe_summary, 520);

  if (!summary) {
    return null;
  }

  const labelBase = SECTION_FALLBACK_LABELS[sectionId] || 'Evidence Record';

  return {
    item_id: normalizeString(
      item.grouped_evidence_item_id
        || item.item_id
        || item.evidence_item_id
        || `${sectionId}:${index + 1}`,
      160
    ),
    label: normalizeString(item.label || `${labelBase} ${index + 1}`, 120),
    summary,
    source_family: normalizeString(item.source_family, 80),
    source_role: normalizeString(item.source_role, 80),
    output_kind: normalizeString(item.output_kind, 80),
    support_role: normalizeString(item.support_role || sectionId, 80),
    confidence_label: normalizeString(item.confidence_label || item.confidence, 80),
    counts_toward_direct_evidence: sectionId === 'direct_support'
      && item.counts_toward_direct_evidence === true,
    caveats: uniqueStrings(item.caveats, 8, 180),
  };
}

function normalizeGroupedEvidence(groupedEvidence) {
  const safeGroupedEvidence = groupedEvidence && typeof groupedEvidence === 'object' && !Array.isArray(groupedEvidence)
    ? groupedEvidence
    : {};

  return GROUPED_SECTION_IDS.reduce((accumulator, sectionId) => {
    accumulator[sectionId] = arr(safeGroupedEvidence[sectionId])
      .map((item, index) => normalizeGroupedEvidenceItem(item, sectionId, index))
      .filter(Boolean);
    return accumulator;
  }, {});
}

function normalizeTopicDraft(handoff, context) {
  const decisionContext = requireObject(handoff.decision_context, 'DecisionCoreReviewHandoffV03.decision_context');
  const topicSeed = requireString(
    decisionContext.topic_seed || decisionContext.topic_name,
    'DecisionCoreReviewHandoffV03.decision_context.topic_seed'
  );

  return {
    id: context.topicDraftId,
    monitoring_run_id: context.monitoringRunId,
    lifecycle_state: 'draft',
    title: topicSeed,
    summary: normalizeString(
      decisionContext.topic_summary
        || `Preliminary review for ${topicSeed}.`,
      520
    ),
    target_audience: normalizeString(decisionContext.audience || decisionContext.target_audience, 180),
    problem_space: normalizeString(decisionContext.problem_space, 180),
    monitoring_intent: normalizeString(decisionContext.monitoring_intent, 260),
    limitations_summary: uniqueStrings(handoff.limitations, 10, 220).join(' '),
    provenance: {
      source_kind: 'decision_core_review_handoff_v0_3_shadow',
      handoff_version: handoff.handoff_version,
      run_id: context.runId,
    },
  };
}

function normalizeReviewState(handoff) {
  if (!handoff.review_state || typeof handoff.review_state !== 'object' || Array.isArray(handoff.review_state)) {
    return undefined;
  }

  const state = normalizeString(handoff.review_state.state, 80);

  if (!state) {
    return undefined;
  }

  return {
    state,
    reasons: uniqueStrings(handoff.review_state.reasons, 10, 160),
  };
}

function mapReviewEntryToSignalCluster(entry, index, context) {
  const clusterSeed = entry.cluster_seed && typeof entry.cluster_seed === 'object'
    ? entry.cluster_seed
    : {};
  const reviewEntryId = requireString(
    entry.review_entry_id || `review_entry_${index + 1}`,
    `DecisionCoreReviewHandoffV03.review_entries[${index}].review_entry_id`
  );
  const clusterId = makeProductId('signal_cluster', context.idPrefix, [
    context.runId,
    reviewEntryId,
  ]);
  const groupedEvidence = normalizeGroupedEvidence(entry.grouped_evidence);

  return {
    id: clusterId,
    parent_topic_ref: {
      topic_draft_id: context.topicDraftId,
    },
    monitoring_run_id: context.monitoringRunId,
    source_review_entry_ref: {
      review_entry_id: reviewEntryId,
    },
    headline: requireString(
      clusterSeed.headline || entry.title,
      `DecisionCoreReviewHandoffV03.review_entries[${index}].cluster_seed.headline`
    ),
    summary: requireString(
      clusterSeed.summary || entry.summary,
      `DecisionCoreReviewHandoffV03.review_entries[${index}].cluster_seed.summary`
    ),
    confidence_display: normalizeConfidenceDisplay(entry.confidence),
    limitations: uniqueStrings([
      ...arr(entry.caveats),
      ...arr(context.topLevelLimitations),
    ], 12, 220),
    grouped_evidence: groupedEvidence,
    grouped_evidence_caveats: uniqueStrings([
      'This is a preliminary review.',
      'Discovery leads are follow-up leads, not evidence yet.',
      'Trend context does not prove user demand by itself.',
      'Direct evidence count only includes Direct Support.',
    ], 8, 180),
    curated_evidence_ids: [],
    provenance: {
      source_kind: 'decision_core_review_handoff_v0_3_shadow',
      handoff_version: context.handoffVersion,
      review_entry_id: reviewEntryId,
    },
  };
}

function buildMonitoringRun(handoff, context) {
  const run = handoff.run && typeof handoff.run === 'object' && !Array.isArray(handoff.run)
    ? handoff.run
    : {};

  return {
    id: context.monitoringRunId,
    handoff_version: handoff.handoff_version,
    source_bundle_id: context.runId,
    source_bundle_status: normalizeString(run.status || 'shadow', 80),
    review_run_status: normalizeString(run.status || 'completed', 80),
    ingest_status: 'imported',
    imported_at: context.importedAt,
  };
}

function mapDecisionCoreReviewHandoffV03ToProductMainline(handoff, options = {}) {
  validateReviewHandoffV03(handoff);

  const run = handoff.run && typeof handoff.run === 'object' && !Array.isArray(handoff.run)
    ? handoff.run
    : {};
  const runId = requireString(
    run.run_id || handoff.review_run_id || 'review-handoff-v0-3-shadow',
    'DecisionCoreReviewHandoffV03.run.run_id'
  );
  const idPrefix = normalizeString(options.idPrefix, 40) || 'ps';
  const importedAt = normalizeString(options.importedAt, 80) || new Date().toISOString();
  const monitoringRunId = makeProductId('monitoring_run', idPrefix, [runId]);
  const topicDraftId = makeProductId('topic_draft', idPrefix, [runId]);
  const topLevelLimitations = uniqueStrings(handoff.limitations, 12, 220);
  const context = {
    handoffVersion: handoff.handoff_version,
    idPrefix,
    importedAt,
    monitoringRunId,
    runId,
    topicDraftId,
    topLevelLimitations,
  };
  const reviewEntries = arr(handoff.review_entries);

  if (!reviewEntries.length) {
    throw new Error('DecisionCoreReviewHandoffV03.review_entries must contain at least one entry.');
  }

  return {
    monitoring_run: buildMonitoringRun(handoff, context),
    topic_draft: normalizeTopicDraft(handoff, context),
    review_state: normalizeReviewState(handoff),
    source_coverage_summary: buildSourceCoverageSummary(handoff),
    signal_clusters: reviewEntries.map((entry, index) =>
      mapReviewEntryToSignalCluster(requireObject(entry, `review_entries[${index}]`), index, context)
    ),
    curated_evidence_records: [],
  };
}

module.exports = {
  DECISION_CORE_REVIEW_HANDOFF_V03_VERSION,
  GROUPED_EVIDENCE_SCHEMA_VERSION,
  mapDecisionCoreReviewHandoffV03ToProductMainline,
};
