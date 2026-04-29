import { buildEvidenceDrawerState } from './build-evidence-drawer-state.browser.mjs';

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

function normalizeReviewState(reviewState) {
  if (!reviewState || typeof reviewState !== 'object' || Array.isArray(reviewState)) {
    return null;
  }

  const state = typeof reviewState.state === 'string' ? reviewState.state.trim() : '';

  if (!state) {
    return null;
  }

  return {
    state,
    reasons: normalizeLimitations(reviewState.reasons),
  };
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

function buildEmptyOrSparseState(signalClusters, curatedEvidenceRecords, reviewState = null) {
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

  if (!reviewState) {
    return {
      is_empty: signalClusters.length === 0,
      is_sparse: reasons.length > 0,
      reasons,
    };
  }

  const explicitReasons = uniqueStrings([
    ...reasons,
    ...reviewState.reasons,
  ]);
  const isBlocked = reviewState.state === 'blocked';
  const isEmpty = reviewState.state === 'empty' || (!isBlocked && signalClusters.length === 0);
  const isSparse = !isBlocked && (
    reviewState.state === 'sparse'
    || reviewState.state === 'no_evidence'
    || isEmpty
    || reasons.length > 0
  );

  return {
    state: reviewState.state,
    is_empty: isEmpty,
    is_sparse: isSparse,
    is_blocked: isBlocked,
    reasons,
    explicit_reasons: explicitReasons,
  };
}

function buildSourceCoverageStrip(signalClusters, curatedEvidenceRecords, sourceCoverageSummary = null) {
  const allPublicSourceRefs = curatedEvidenceRecords.flatMap((record) =>
    Array.isArray(record?.public_source_refs) ? record.public_source_refs : []
  );
  const baseCoverage = {
    public_source_ref_count: allPublicSourceRefs.length,
    unique_public_source_ref_count: uniqueStrings(allPublicSourceRefs).length,
  };

  if (sourceCoverageSummary && typeof sourceCoverageSummary === 'object' && !Array.isArray(sourceCoverageSummary)) {
    baseCoverage.public_source_ref_count = Number(sourceCoverageSummary.public_source_ref_count || 0);
    baseCoverage.source_family_count = Number(sourceCoverageSummary.source_family_count || 0);
    baseCoverage.coverage_boundary = typeof sourceCoverageSummary.coverage_boundary === 'string'
      ? sourceCoverageSummary.coverage_boundary
      : '';
    baseCoverage.source_families = normalizeLimitations(sourceCoverageSummary.source_families);
  }

  return {
    ...baseCoverage,
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
  const explicitReviewState = normalizeReviewState(productMainline.review_state);
  const sourceCoverageSummary = productMainline.source_coverage_summary
    && typeof productMainline.source_coverage_summary === 'object'
    && !Array.isArray(productMainline.source_coverage_summary)
    ? productMainline.source_coverage_summary
    : null;

  const signalClusterSections = signalClusters.map((signalCluster) =>
    buildClusterSection(signalCluster, curatedEvidenceRecords)
  );
  const sourceCoverageStrip = buildSourceCoverageStrip(
    signalClusters,
    curatedEvidenceRecords,
    sourceCoverageSummary
  );
  const selectedEvidenceDrawer = buildSelectedEvidenceDrawer(
    topicDraft,
    signalClusters,
    curatedEvidenceRecords,
    options
  );
  const workspaceHeader = {
    workspace_title: topicDraft.title,
    draft_state_label: topicDraft.lifecycle_state,
    monitoring_run_id: monitoringRun.id,
    source_bundle_id: monitoringRun.source_bundle_id,
    source_bundle_status: monitoringRun.source_bundle_status,
    handoff_version: monitoringRun.handoff_version,
    imported_at: monitoringRun.imported_at,
  };
  const reviewSummary = {
    signal_cluster_count: signalClusters.length,
    curated_evidence_record_count: curatedEvidenceRecords.length,
    public_source_ref_count: sourceCoverageStrip.public_source_ref_count,
    directional_count: countConfidenceLabel(signalClusters, 'directional'),
    exploratory_count: countConfidenceLabel(signalClusters, 'exploratory'),
  };

  if (explicitReviewState) {
    workspaceHeader.review_state = explicitReviewState.state;
    workspaceHeader.review_run_status = monitoringRun.review_run_status;
    reviewSummary.review_state = explicitReviewState.state;
    reviewSummary.source_family_count = sourceCoverageStrip.source_family_count;
    reviewSummary.coverage_boundary = sourceCoverageStrip.coverage_boundary;
  }

  const viewState = {
    workspace_header: workspaceHeader,
    topic_draft_summary: {
      topic_draft_id: topicDraft.id,
      title: topicDraft.title,
      summary: topicDraft.summary,
      limitations_summary: topicDraft.limitations_summary,
    },
    review_summary: reviewSummary,
    source_coverage_strip: sourceCoverageStrip,
    signal_cluster_sections: signalClusterSections,
    selected_evidence_drawer: selectedEvidenceDrawer,
    limitations_and_caveats: buildLimitationsAndCaveats(topicDraft, signalClusters),
    empty_or_sparse_state: buildEmptyOrSparseState(
      signalClusters,
      curatedEvidenceRecords,
      explicitReviewState
    ),
  };

  if (explicitReviewState) {
    viewState.review_state = explicitReviewState;
  }

  return viewState;
}

export {
  buildTopicWorkspaceViewState,
};
