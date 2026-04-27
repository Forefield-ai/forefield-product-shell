const { buildEvidenceDrawerState } = require('./build-evidence-drawer-state');

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

  return uniqueStrings(
    limitations
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

function ensureObject(value, pathName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${pathName} must be an object.`);
  }

  return value;
}

function ensureArray(value, pathName) {
  if (!Array.isArray(value)) {
    throw new Error(`${pathName} must be an array.`);
  }

  return value;
}

function buildClusterSection(signalCluster, curatedEvidenceRecords) {
  const relevantEvidenceRecords = curatedEvidenceRecords.filter(
    (record) => record && record.signal_cluster_id === signalCluster.id
  );
  const sourceLinks = uniqueStrings(
    relevantEvidenceRecords.flatMap((record) =>
      Array.isArray(record.public_source_refs) ? record.public_source_refs : []
    )
  );
  const limitations = normalizeLimitations(signalCluster.limitations);

  return {
    cluster_id: signalCluster.id,
    headline: signalCluster.headline,
    summary: signalCluster.summary,
    confidence_display: signalCluster.confidence_display,
    limitations,
    evidence_count: relevantEvidenceRecords.length,
    source_links: sourceLinks,
    drawer_available: relevantEvidenceRecords.length > 0,
  };
}

function countConfidenceLabel(signalClusters, label) {
  return signalClusters.filter((signalCluster) => {
    const confidenceLabel = signalCluster?.confidence_display?.label;
    return typeof confidenceLabel === 'string' && confidenceLabel.toLowerCase() === label;
  }).length;
}

function buildLimitationsAndCaveats(topicDraft, signalClusters) {
  const clusterLimitations = uniqueStrings(
    signalClusters.flatMap((signalCluster) => normalizeLimitations(signalCluster.limitations))
  );
  const workspaceLimitations = clusterLimitations.length
    ? clusterLimitations
    : (typeof topicDraft.limitations_summary === 'string' && topicDraft.limitations_summary.trim()
      ? [topicDraft.limitations_summary.trim()]
      : []);

  return {
    workspace_limitations: workspaceLimitations,
    cluster_caveats: signalClusters
      .map((signalCluster) => ({
        cluster_id: signalCluster.id,
        limitations: normalizeLimitations(signalCluster.limitations),
      }))
      .filter((entry) => entry.limitations.length > 0),
  };
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

function buildSourceCoverageStrip(signalClusters, curatedEvidenceRecords) {
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

function buildSelectedEvidenceDrawer(topicDraft, signalClusters, curatedEvidenceRecords, options) {
  if (!options.selectedClusterId) {
    return null;
  }

  const selectedSignalCluster = signalClusters.find(
    (signalCluster) => signalCluster.id === options.selectedClusterId
  );

  if (!selectedSignalCluster) {
    throw new Error(`Selected signal cluster not found: ${options.selectedClusterId}`);
  }

  return buildEvidenceDrawerState({
    topicDraft,
    signalCluster: selectedSignalCluster,
    curatedEvidenceRecords,
  });
}

function buildTopicWorkspaceViewState(productMainline, options = {}) {
  ensureObject(productMainline, 'productMainline');

  const monitoringRun = ensureObject(productMainline.monitoring_run, 'productMainline.monitoring_run');
  const topicDraft = ensureObject(productMainline.topic_draft, 'productMainline.topic_draft');
  const signalClusters = ensureArray(productMainline.signal_clusters, 'productMainline.signal_clusters');
  const curatedEvidenceRecords = ensureArray(
    productMainline.curated_evidence_records,
    'productMainline.curated_evidence_records'
  );

  const signalClusterSections = signalClusters.map((signalCluster) =>
    buildClusterSection(signalCluster, curatedEvidenceRecords)
  );
  const sourceCoverageStrip = buildSourceCoverageStrip(signalClusters, curatedEvidenceRecords);
  const selectedEvidenceDrawer = buildSelectedEvidenceDrawer(
    topicDraft,
    signalClusters,
    curatedEvidenceRecords,
    options
  );

  return {
    workspace_header: {
      workspace_title: topicDraft.title,
      draft_state_label: topicDraft.lifecycle_state,
      monitoring_run_id: monitoringRun.id,
      source_bundle_id: monitoringRun.source_bundle_id,
      source_bundle_status: monitoringRun.source_bundle_status,
      handoff_version: monitoringRun.handoff_version,
      imported_at: monitoringRun.imported_at,
    },
    topic_draft_summary: {
      topic_draft_id: topicDraft.id,
      title: topicDraft.title,
      summary: topicDraft.summary,
      limitations_summary: topicDraft.limitations_summary,
    },
    review_summary: {
      signal_cluster_count: signalClusters.length,
      curated_evidence_record_count: curatedEvidenceRecords.length,
      public_source_ref_count: sourceCoverageStrip.public_source_ref_count,
      directional_count: countConfidenceLabel(signalClusters, 'directional'),
      exploratory_count: countConfidenceLabel(signalClusters, 'exploratory'),
    },
    source_coverage_strip: sourceCoverageStrip,
    signal_cluster_sections: signalClusterSections,
    selected_evidence_drawer: selectedEvidenceDrawer,
    limitations_and_caveats: buildLimitationsAndCaveats(topicDraft, signalClusters),
    empty_or_sparse_state: buildEmptyOrSparseState(signalClusters, curatedEvidenceRecords),
  };
}

module.exports = {
  buildTopicWorkspaceViewState,
};
