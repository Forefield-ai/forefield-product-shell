const minimalProductMainline = require('../../../fixtures/product/product-mainline.sample.json');
const richProductMainline = require('../../../fixtures/product/rich-product-mainline.sample.json');
const { makeProductId } = require('../../product/utils/make-product-id');

function ensureObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value;
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value;
}

function uniqueStrings(values) {
  const seen = new Set();

  return values.filter((value) => {
    if (typeof value !== 'string' || !value.trim() || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function normalizeLimitations(limitations) {
  if (!Array.isArray(limitations)) {
    return [];
  }

  return limitations
    .filter((entry) => typeof entry === 'string' && entry.trim())
    .map((entry) => entry.trim());
}

function countConfidenceLabel(signalClusters, label) {
  return signalClusters.filter((signalCluster) => {
    const confidenceLabel = signalCluster?.confidence_display?.label;
    return typeof confidenceLabel === 'string' && confidenceLabel.toLowerCase() === label;
  }).length;
}

function buildEmptyOrSparseState(signalClusters, curatedEvidenceRecords) {
  const publicSourceRefCount = curatedEvidenceRecords.reduce((sum, record) => {
    const refs = Array.isArray(record?.public_source_refs)
      ? record.public_source_refs.filter((ref) => typeof ref === 'string' && /^https?:\/\//i.test(ref))
      : [];

    return sum + refs.length;
  }, 0);
  const reasons = [];

  if (signalClusters.length === 0) {
    reasons.push('no_signal_clusters');
  }

  if (curatedEvidenceRecords.length === 0) {
    reasons.push('no_curated_evidence_records');
  }

  if (publicSourceRefCount === 0) {
    reasons.push('no_public_source_refs');
  }

  return {
    is_empty: signalClusters.length === 0,
    is_sparse: reasons.length > 0,
    reasons,
  };
}

function buildSourceCoverageSummary(signalClusters, curatedEvidenceRecords) {
  const allPublicSourceRefs = curatedEvidenceRecords.flatMap((record) =>
    Array.isArray(record?.public_source_refs) ? record.public_source_refs : []
  );

  return {
    public_source_ref_count: allPublicSourceRefs.length,
    unique_public_source_ref_count: uniqueStrings(allPublicSourceRefs).length,
    cluster_coverage: signalClusters.map((signalCluster) => {
      const relevantEvidenceRecords = curatedEvidenceRecords.filter(
        (record) => record && record.signal_cluster_id === signalCluster.id
      );
      const clusterSourceLinks = uniqueStrings(
        relevantEvidenceRecords.flatMap((record) =>
          Array.isArray(record.public_source_refs) ? record.public_source_refs : []
        )
      );

      return {
        cluster_id: signalCluster.id,
        evidence_count: relevantEvidenceRecords.length,
        public_source_ref_count: relevantEvidenceRecords.reduce((sum, record) => {
          const refs = Array.isArray(record?.public_source_refs) ? record.public_source_refs : [];
          return sum + refs.length;
        }, 0),
        unique_public_source_ref_count: clusterSourceLinks.length,
      };
    }),
  };
}

function buildFallbackMonitoringRun(topic, monitoringRun) {
  if (monitoringRun && typeof monitoringRun === 'object') {
    return monitoringRun;
  }

  const timestamp = typeof topic?.updated_at === 'string' && topic.updated_at.trim()
    ? topic.updated_at
    : typeof topic?.created_at === 'string' && topic.created_at.trim()
      ? topic.created_at
      : new Date().toISOString();

  return {
    id: makeProductId('monitoring_run', 'rt', [topic.id, 'workspace']),
    topic_id: topic.id,
    workspace_id: topic.workspace_id,
    status: topic.status || 'draft',
    stage_label: 'Preparing Initial Topic Map',
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function resolveWorkspaceFixture(productMainline) {
  if (productMainline !== undefined) {
    return ensureObject(productMainline, 'productMainline');
  }

  return richProductMainline;
}

function buildLocalTopicWorkspaceData({
  topic,
  monitoringRun,
  productMainline,
} = {}) {
  const safeTopic = ensureObject(topic, 'topic');
  const safeMonitoringRun = buildFallbackMonitoringRun(safeTopic, monitoringRun);
  const safeProductMainline = resolveWorkspaceFixture(productMainline);
  ensureObject(safeProductMainline.monitoring_run, 'productMainline.monitoring_run');
  const fixtureTopicDraft = ensureObject(safeProductMainline.topic_draft, 'productMainline.topic_draft');
  const fixtureSignalClusters = ensureArray(safeProductMainline.signal_clusters, 'productMainline.signal_clusters');
  const fixtureCuratedEvidenceRecords = ensureArray(
    safeProductMainline.curated_evidence_records,
    'productMainline.curated_evidence_records'
  );

  const curatedEvidenceRecords = fixtureCuratedEvidenceRecords.map((record, index) => {
    const publicSourceRefs = uniqueStrings(
      Array.isArray(record?.public_source_refs) ? record.public_source_refs : []
    );

    return {
      id: record.id,
      workspace_id: safeTopic.workspace_id,
      topic_id: safeTopic.id,
      monitoring_run_id: safeMonitoringRun.id,
      signal_cluster_id: record.signal_cluster_id,
      title: `Public source ${index + 1}`,
      summary: typeof record.summary === 'string' ? record.summary : '',
      public_source_refs: publicSourceRefs,
      source_url: publicSourceRefs[0] || '',
      confidence_display: record.confidence_display || null,
      limitations: normalizeLimitations(record.limitations),
      why_included: typeof record.summary === 'string' ? record.summary : '',
      status: 'active',
    };
  });

  const signalClusters = fixtureSignalClusters.map((signalCluster) => {
    const relevantEvidenceRecords = curatedEvidenceRecords.filter(
      (record) => record.signal_cluster_id === signalCluster.id
    );
    const uniquePublicSourceRefs = uniqueStrings(
      relevantEvidenceRecords.flatMap((record) => record.public_source_refs)
    );

    return {
      id: signalCluster.id,
      workspace_id: safeTopic.workspace_id,
      topic_id: safeTopic.id,
      monitoring_run_id: safeMonitoringRun.id,
      headline: typeof signalCluster.headline === 'string' ? signalCluster.headline : '',
      summary: typeof signalCluster.summary === 'string' ? signalCluster.summary : '',
      confidence_display: signalCluster.confidence_display || null,
      limitations: normalizeLimitations(signalCluster.limitations),
      ...(signalCluster.grouped_evidence ? { grouped_evidence: signalCluster.grouped_evidence } : {}),
      ...(Array.isArray(signalCluster.grouped_evidence_caveats)
        ? { grouped_evidence_caveats: normalizeLimitations(signalCluster.grouped_evidence_caveats) }
        : {}),
      curated_evidence_ids: Array.isArray(signalCluster.curated_evidence_ids)
        ? signalCluster.curated_evidence_ids.filter((entry) => typeof entry === 'string' && entry.trim())
        : relevantEvidenceRecords.map((record) => record.id),
      evidence_count: relevantEvidenceRecords.length,
      source_count: uniquePublicSourceRefs.length,
      status: 'active',
      created_at: safeMonitoringRun.updated_at || safeMonitoringRun.created_at,
    };
  });

  const sourceCoverageSummary = buildSourceCoverageSummary(signalClusters, curatedEvidenceRecords);
  const emptyOrSparseState = buildEmptyOrSparseState(signalClusters, curatedEvidenceRecords);
  const signalClusterIds = signalClusters.map((signalCluster) => signalCluster.id);

  return {
    workspace_id: safeTopic.workspace_id,
    topic_id: safeTopic.id,
    monitoring_run_id: safeMonitoringRun.id,
    topic: {
      ...safeTopic,
    },
    monitoring_run: {
      ...safeMonitoringRun,
    },
    initial_topic_map: {
      id: makeProductId('initial_topic_map', 'rt', [safeTopic.id, safeMonitoringRun.id]),
      workspace_id: safeTopic.workspace_id,
      topic_id: safeTopic.id,
      monitoring_run_id: safeMonitoringRun.id,
      review_summary: {
        title: fixtureTopicDraft.title,
        summary: fixtureTopicDraft.summary,
        limitations_summary: fixtureTopicDraft.limitations_summary,
        signal_cluster_count: signalClusters.length,
        curated_evidence_record_count: curatedEvidenceRecords.length,
        public_source_ref_count: sourceCoverageSummary.public_source_ref_count,
        directional_count: countConfidenceLabel(signalClusters, 'directional'),
        exploratory_count: countConfidenceLabel(signalClusters, 'exploratory'),
      },
      source_coverage_summary: sourceCoverageSummary,
      signal_cluster_ids: signalClusterIds,
      empty_or_sparse_state: emptyOrSparseState,
      created_at: safeMonitoringRun.updated_at || safeMonitoringRun.created_at,
    },
    signal_clusters: signalClusters,
    curated_evidence_records: curatedEvidenceRecords,
  };
}

function buildProductMainlineCompatibilityPayload(workspaceData, options = {}) {
  const safeWorkspaceData = ensureObject(workspaceData, 'workspaceData');
  const safeTopic = ensureObject(safeWorkspaceData.topic, 'workspaceData.topic');
  const safeMonitoringRun = ensureObject(safeWorkspaceData.monitoring_run, 'workspaceData.monitoring_run');
  const safeInitialTopicMap = ensureObject(safeWorkspaceData.initial_topic_map, 'workspaceData.initial_topic_map');
  const signalClusters = ensureArray(safeWorkspaceData.signal_clusters, 'workspaceData.signal_clusters');
  const curatedEvidenceRecords = ensureArray(
    safeWorkspaceData.curated_evidence_records,
    'workspaceData.curated_evidence_records'
  );
  const compatibilitySource = resolveWorkspaceFixture(options.productMainline);
  const compatibilityMonitoringRun = ensureObject(
    compatibilitySource.monitoring_run,
    'options.productMainline.monitoring_run'
  );
  const compatibilityTopicDraft = ensureObject(
    compatibilitySource.topic_draft,
    'options.productMainline.topic_draft'
  );

  return {
    monitoring_run: {
      id: safeMonitoringRun.id,
      handoff_version: compatibilityMonitoringRun.handoff_version,
      source_bundle_id: compatibilityMonitoringRun.source_bundle_id,
      source_bundle_status: compatibilityMonitoringRun.source_bundle_status,
      ingest_status: compatibilityMonitoringRun.ingest_status,
      imported_at: compatibilityMonitoringRun.imported_at,
    },
    topic_draft: {
      id: compatibilityTopicDraft.id,
      monitoring_run_id: safeMonitoringRun.id,
      lifecycle_state: compatibilityTopicDraft.lifecycle_state || safeTopic.status,
      title: compatibilityTopicDraft.title || safeInitialTopicMap.review_summary?.title || safeTopic.topic_name,
      summary: compatibilityTopicDraft.summary || safeInitialTopicMap.review_summary?.summary || safeTopic.topic_summary,
      limitations_summary: compatibilityTopicDraft.limitations_summary
        || safeInitialTopicMap.review_summary?.limitations_summary
        || '',
    },
    signal_clusters: signalClusters.map((signalCluster) => ({
      id: signalCluster.id,
      monitoring_run_id: safeMonitoringRun.id,
      headline: signalCluster.headline,
      summary: signalCluster.summary,
      confidence_display: signalCluster.confidence_display,
      limitations: signalCluster.limitations,
      ...(signalCluster.grouped_evidence ? { grouped_evidence: signalCluster.grouped_evidence } : {}),
      ...(Array.isArray(signalCluster.grouped_evidence_caveats)
        ? { grouped_evidence_caveats: signalCluster.grouped_evidence_caveats }
        : {}),
      curated_evidence_ids: signalCluster.curated_evidence_ids,
    })),
    curated_evidence_records: curatedEvidenceRecords.map((record) => ({
      id: record.id,
      signal_cluster_id: record.signal_cluster_id,
      monitoring_run_id: safeMonitoringRun.id,
      summary: record.summary,
      public_source_refs: record.public_source_refs,
      confidence_display: record.confidence_display,
      limitations: record.limitations,
    })),
  };
}

module.exports = {
  buildLocalTopicWorkspaceData,
  buildProductMainlineCompatibilityPayload,
  defaultWorkspaceFixtures: Object.freeze({
    minimal: minimalProductMainline,
    rich: richProductMainline,
  }),
};
