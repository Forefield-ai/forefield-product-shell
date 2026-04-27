const { makeProductId } = require('../utils/make-product-id');

const SUPPORTED_HANDOFF_VERSIONS = new Set([
  '0.1.0-decision-core-boundary-handoff-v1',
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

  return value;
}

function requireRankedEntries(handoff) {
  if (!Array.isArray(handoff.ranked_entries)) {
    throw new Error('DecisionCoreBoundaryHandoff.ranked_entries must be an array.');
  }

  if (!handoff.ranked_entries.length) {
    throw new Error('DecisionCoreBoundaryHandoff.ranked_entries must contain at least one entry.');
  }

  return handoff.ranked_entries;
}

function normalizeLimitations(limitations) {
  if (!Array.isArray(limitations)) {
    return [];
  }

  return limitations
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizePublicSourceRefs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value
    .filter((entry) => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => /^https?:\/\//i.test(entry))
    .filter((entry) => {
      if (seen.has(entry)) {
        return false;
      }

      seen.add(entry);
      return true;
    });
}

function mapConfidenceDisplay(confidenceSummary) {
  if (!confidenceSummary || typeof confidenceSummary !== 'object') {
    return undefined;
  }

  const label = typeof confidenceSummary.confidence_label === 'string'
    ? confidenceSummary.confidence_label.trim()
    : '';
  const summary = typeof confidenceSummary.confidence_boundary === 'string'
    ? confidenceSummary.confidence_boundary.trim()
    : '';

  if (!label && !summary) {
    return undefined;
  }

  return {
    label,
    summary,
  };
}

function summarizePublicSourceRef(url) {
  if (/reddit/i.test(url)) {
    return 'Public discussion thread included in the curated evidence set.';
  }

  if (/youtube/i.test(url)) {
    return 'Public comments source included in the curated evidence set.';
  }

  return 'Public source included in the curated evidence set.';
}

function buildTopicDraftProvenance(bundleId, rankedEntries) {
  return {
    source_bundle_id: bundleId,
    source_ranked_entry_ranks: rankedEntries.map((entry, index) => {
      const rank = Number(entry?.rank);
      return Number.isFinite(rank) && rank > 0 ? rank : index + 1;
    }),
  };
}

function buildClusterProvenance(handoffVersion, bundleId) {
  return {
    handoff_version: handoffVersion,
    source_bundle_id: bundleId,
  };
}

function validateHandoffVersion(handoff) {
  if (!handoff || typeof handoff !== 'object') {
    throw new Error('DecisionCoreBoundaryHandoff input is required.');
  }

  if (!handoff.handoff_version) {
    throw new Error('DecisionCoreBoundaryHandoff.handoff_version is required.');
  }

  if (!SUPPORTED_HANDOFF_VERSIONS.has(handoff.handoff_version)) {
    throw new Error(
      `Unsupported DecisionCoreBoundaryHandoff.handoff_version: ${handoff.handoff_version}`
    );
  }
}

function buildSignalCluster(entry, context) {
  const {
    bundleId,
    handoffVersion,
    idPrefix,
    monitoringRunId,
    topicDraftId,
    topLevelLimitations,
  } = context;
  const rank = Number(entry.rank);
  const safeRank = Number.isFinite(rank) && rank > 0 ? rank : context.fallbackRank;
  const clusterId = makeProductId('signal_cluster', idPrefix, [bundleId, `r${safeRank}`]);
  const confidenceDisplay = mapConfidenceDisplay(entry.confidence_summary);
  const entryLimitations = normalizeLimitations(entry.limitations);
  const limitations = entryLimitations.length ? entryLimitations : topLevelLimitations;

  return {
    cluster: {
      id: clusterId,
      parent_topic_ref: {
        topic_draft_id: topicDraftId,
      },
      monitoring_run_id: monitoringRunId,
      source_ranked_entry_ref: {
        rank: safeRank,
      },
      headline: requireString(entry?.decision_summary?.problem, 'ranked_entry.decision_summary.problem'),
      summary: requireString(
        entry?.decision_summary?.why_it_matters,
        'ranked_entry.decision_summary.why_it_matters'
      ),
      confidence_display: confidenceDisplay,
      limitations,
      curated_evidence_ids: [],
      provenance: buildClusterProvenance(handoffVersion, bundleId),
    },
    safeRank,
  };
}

function buildCuratedEvidenceRecords(entry, context) {
  const {
    bundleId,
    handoffVersion,
    idPrefix,
    monitoringRunId,
    signalClusterId,
    topLevelLimitations,
    safeRank,
  } = context;
  const confidenceDisplay = mapConfidenceDisplay(entry.confidence_summary);
  const entryLimitations = normalizeLimitations(entry.limitations);
  const limitations = entryLimitations.length ? entryLimitations : topLevelLimitations;
  const publicSourceRefs = normalizePublicSourceRefs(entry?.provenance?.public_source_refs);

  return publicSourceRefs.map((url, index) => ({
    id: makeProductId('curated_evidence_record', idPrefix, [bundleId, `r${safeRank}`, `s${index + 1}`]),
    signal_cluster_id: signalClusterId,
    monitoring_run_id: monitoringRunId,
    summary: summarizePublicSourceRef(url),
    public_source_refs: [url],
    confidence_display: confidenceDisplay,
    limitations,
    source_ranked_entry_ref: {
      rank: safeRank,
    },
    provenance: buildClusterProvenance(handoffVersion, bundleId),
  }));
}

function mapDecisionCoreHandoffToProductMainline(handoff, options = {}) {
  validateHandoffVersion(handoff);
  requireObject(handoff, 'DecisionCoreBoundaryHandoff');

  const bundleId = requireString(handoff.bundle_id, 'DecisionCoreBoundaryHandoff.bundle_id');
  const bundleStatus = requireString(
    handoff.bundle_status,
    'DecisionCoreBoundaryHandoff.bundle_status'
  );
  const rankedEntries = requireRankedEntries(handoff);
  const importedAt = typeof options.importedAt === 'string' && options.importedAt.trim()
    ? options.importedAt
    : new Date().toISOString();
  const idPrefix = typeof options.idPrefix === 'string' && options.idPrefix.trim()
    ? options.idPrefix
    : 'ps';
  const topLevelLimitations = normalizeLimitations(handoff.limitations);
  const monitoringRunId = makeProductId('monitoring_run', idPrefix, [bundleId]);
  const topicDraftId = makeProductId('topic_draft', idPrefix, [bundleId]);
  const firstEntry = rankedEntries[0];

  const monitoringRun = {
    id: monitoringRunId,
    handoff_version: handoff.handoff_version,
    source_bundle_id: bundleId,
    source_bundle_status: bundleStatus,
    ingest_status: 'imported',
    imported_at: importedAt,
  };

  const topicDraft = {
    id: topicDraftId,
    monitoring_run_id: monitoringRunId,
    lifecycle_state: 'draft',
    title: requireString(
      firstEntry?.decision_summary?.problem,
      'ranked_entries[0].decision_summary.problem'
    ),
    summary: requireString(
      firstEntry?.decision_summary?.why_it_matters,
      'ranked_entries[0].decision_summary.why_it_matters'
    ),
    limitations_summary: topLevelLimitations.join(' '),
    provenance: buildTopicDraftProvenance(bundleId, rankedEntries),
  };

  const signalClusters = [];
  const curatedEvidenceRecords = [];

  rankedEntries.forEach((entry, index) => {
    const { cluster, safeRank } = buildSignalCluster(entry, {
      bundleId,
      handoffVersion: handoff.handoff_version,
      idPrefix,
      monitoringRunId,
      topicDraftId,
      topLevelLimitations,
      fallbackRank: index + 1,
    });

    const evidenceRecords = buildCuratedEvidenceRecords(entry, {
      bundleId,
      handoffVersion: handoff.handoff_version,
      idPrefix,
      monitoringRunId,
      signalClusterId: cluster.id,
      topLevelLimitations,
      safeRank,
    });

    cluster.curated_evidence_ids = evidenceRecords.map((record) => record.id);
    signalClusters.push(cluster);
    curatedEvidenceRecords.push(...evidenceRecords);
  });

  return {
    monitoring_run: monitoringRun,
    topic_draft: topicDraft,
    signal_clusters: signalClusters,
    curated_evidence_records: curatedEvidenceRecords,
  };
}

module.exports = {
  SUPPORTED_HANDOFF_VERSIONS,
  mapDecisionCoreHandoffToProductMainline,
};
