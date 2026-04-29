const { buildEvidenceDrawerState } = require('./build-evidence-drawer-state');
const { buildTopicWorkspaceViewState } = require('./build-topic-workspace-view-state');
const {
  getSavedClusters,
  getSavedEvidence,
  initialActionState,
  isClusterHidden,
  isClusterSaved,
  isClusterWatched,
  isEvidenceSaved,
} = require('../actions/user-action-state');

const BASELINE_BRIEF_KIND = 'baseline_brief';

const BASELINE_BRIEF_MODES = {
  STANDARD: 'standard',
  PRELIMINARY: 'preliminary',
};

const BASELINE_BRIEF_PROTOTYPE_STATES = {
  READY: 'ready',
  BASELINE_FAILED: 'baseline_failed',
  BASELINE_STUCK: 'baseline_stuck',
  DATA_UNAVAILABLE: 'data_unavailable',
  UNKNOWN_FIXTURE_KEY: 'unknown_fixture_key',
  UNEXPECTED_TOPIC_STATUS: 'unexpected_topic_status',
};

const BASELINE_BRIEF_UNAVAILABLE_REASONS = {
  EMPTY_WORKSPACE: 'empty_workspace',
  BASELINE_FAILED: 'baseline_failed',
  BASELINE_STUCK: 'baseline_stuck',
  DATA_UNAVAILABLE: 'data_unavailable',
  UNKNOWN_FIXTURE_KEY: 'unknown_fixture_key',
  UNEXPECTED_TOPIC_STATUS: 'unexpected_topic_status',
  REVIEW_NOT_READY: 'review_not_ready',
  REVIEW_BLOCKED: 'review_blocked',
};

const READY_TOPIC_STATUS = 'ready';
const SUPPORT_STATES = {
  EVIDENCE_GAP: 'evidence_gap',
  LIMITED_SOURCE_COVERAGE: 'limited_source_coverage',
  EVIDENCE_BACKED: 'evidence_backed',
};
const CONFIDENCE_RANKS = {
  directional: 2,
  exploratory: 1,
};

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

function normalizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function ensureObject(value, pathName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${pathName} must be an object.`);
  }

  return value;
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function lowercaseFirstCharacter(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const trimmed = value.trim().replace(/[.]+$/g, '');
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

function normalizeHeadlineSubject(headline) {
  return lowercaseFirstCharacter(headline) || 'the current review pattern remains visible';
}

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

function buildLimitationFlags(limitations) {
  const normalized = normalizeLimitations(limitations);
  const lowerCased = normalized.map((entry) => entry.toLowerCase());

  return {
    normalized,
    hasCoverageGap: includesAny(lowerCased, [
      'limited source coverage',
      'public source coverage incomplete',
      'source coverage incomplete',
    ]),
    hasThinEvidence: includesAny(lowerCased, [
      'weak evidence',
      'thin evidence basis',
    ]),
    hasContradiction: includesAny(lowerCased, [
      'contradiction present',
      'contradiction-aware',
    ]),
    hasEvidenceGap: includesAny(lowerCased, [
      'no curated evidence is available for this cluster yet',
      'no curated evidence available',
      'evidence unavailable',
    ]),
  };
}

function toUserFacingLimitation(limitation) {
  const normalized = normalizeString(limitation);
  const lowerCased = normalized.toLowerCase();

  if (!normalized) {
    return '';
  }

  if (includesAny([lowerCased], ['limited source coverage'])) {
    return 'Public source coverage is still limited in the current snapshot.';
  }

  if (includesAny([lowerCased], ['public source coverage incomplete', 'source coverage incomplete'])) {
    return 'Public source coverage is incomplete for part of the current snapshot.';
  }

  if (includesAny([lowerCased], ['weak evidence', 'thin evidence basis'])) {
    return 'Some visible support is still thin, so the current brief should be treated cautiously.';
  }

  if (includesAny([lowerCased], ['contradiction present', 'contradiction-aware'])) {
    return 'Some visible signals still pull in different directions, so the current review is not yet settled.';
  }

  if (includesAny([lowerCased], ['no curated evidence is available for this cluster yet', 'no curated evidence available', 'evidence unavailable'])) {
    return 'At least one visible cluster still has no curated evidence available in the current snapshot.';
  }

  return normalized;
}

function resolveTopicScope(topicScope = {}, productMainline = {}) {
  const safeTopicScope = topicScope && typeof topicScope === 'object' && !Array.isArray(topicScope)
    ? topicScope
    : {};
  const topicDraft = productMainline?.topic_draft && typeof productMainline.topic_draft === 'object'
    ? productMainline.topic_draft
    : {};
  const monitoringRun = productMainline?.monitoring_run && typeof productMainline.monitoring_run === 'object'
    ? productMainline.monitoring_run
    : {};

  return {
    topic_id: normalizeString(safeTopicScope.topic_id) || normalizeString(topicDraft.id),
    topic_status: normalizeString(safeTopicScope.topic_status),
    topic_name: normalizeString(safeTopicScope.topic_name) || normalizeString(topicDraft.title),
    topic_summary: normalizeString(safeTopicScope.topic_summary) || normalizeString(topicDraft.summary),
    target_audience: normalizeString(safeTopicScope.target_audience) || normalizeString(topicDraft.target_audience),
    problem_space: normalizeString(safeTopicScope.problem_space) || normalizeString(topicDraft.problem_space),
    monitoring_intent: normalizeString(safeTopicScope.monitoring_intent) || normalizeString(topicDraft.monitoring_intent),
    monitoring_run_id: normalizeString(safeTopicScope.monitoring_run_id) || normalizeString(monitoringRun.id),
  };
}

function buildEligibility({
  isEligible,
  briefMode = null,
  unavailableReason = null,
  summary,
}) {
  return {
    is_eligible: Boolean(isEligible),
    brief_mode: briefMode,
    unavailable_reason: unavailableReason,
    summary,
  };
}

function buildIneligibleBrief({ topicScope, unavailableReason, summary }) {
  return {
    brief_kind: BASELINE_BRIEF_KIND,
    topic_ref: {
      topic_id: topicScope.topic_id,
      topic_status: topicScope.topic_status,
      monitoring_run_id: topicScope.monitoring_run_id,
    },
    eligibility: buildEligibility({
      isEligible: false,
      unavailableReason,
      summary,
    }),
    sections: {
      topic_context: null,
      review_snapshot: null,
      key_signal_clusters: [],
      evidence_backed_takeaways: [],
      caveats_and_limitations: null,
      suggested_next_review_actions: [],
    },
  };
}

function formatEligibilityFromPrototypeState(topicScope, prototypeState) {
  switch (prototypeState) {
    case BASELINE_BRIEF_PROTOTYPE_STATES.BASELINE_FAILED:
      return buildIneligibleBrief({
        topicScope,
        unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.BASELINE_FAILED,
        summary: 'Initial Review did not complete successfully, so no Baseline Brief is available.',
      });
    case BASELINE_BRIEF_PROTOTYPE_STATES.BASELINE_STUCK:
      return buildIneligibleBrief({
        topicScope,
        unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.BASELINE_STUCK,
        summary: 'Initial Review stopped advancing before completion, so no Baseline Brief is available.',
      });
    case BASELINE_BRIEF_PROTOTYPE_STATES.DATA_UNAVAILABLE:
      return buildIneligibleBrief({
        topicScope,
        unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.DATA_UNAVAILABLE,
        summary: 'Prototype data is unavailable, so the Baseline Brief cannot be rendered safely.',
      });
    case BASELINE_BRIEF_PROTOTYPE_STATES.UNKNOWN_FIXTURE_KEY:
      return buildIneligibleBrief({
        topicScope,
        unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.UNKNOWN_FIXTURE_KEY,
        summary: 'The current local sample workspace is unavailable, so no Baseline Brief can be prepared.',
      });
    case BASELINE_BRIEF_PROTOTYPE_STATES.UNEXPECTED_TOPIC_STATUS:
      return buildIneligibleBrief({
        topicScope,
        unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.UNEXPECTED_TOPIC_STATUS,
        summary: 'The current local topic status is unsupported, so no Baseline Brief can be prepared safely.',
      });
    default:
      return null;
  }
}

function getSupportState({ evidenceCount, sourceLinkCount }) {
  if (evidenceCount <= 0) {
    return SUPPORT_STATES.EVIDENCE_GAP;
  }

  if (sourceLinkCount <= 0) {
    return SUPPORT_STATES.LIMITED_SOURCE_COVERAGE;
  }

  return SUPPORT_STATES.EVIDENCE_BACKED;
}

function buildAssessment(signalClusterSection, signalCluster, actionState) {
  const clusterId = normalizeString(signalClusterSection.cluster_id || signalClusterSection.id);
  const limitations = normalizeLimitations(
    Array.isArray(signalClusterSection.limitations)
      ? signalClusterSection.limitations
      : signalCluster.limitations
  );
  const limitationFlags = buildLimitationFlags(limitations);
  const evidenceCount = Number(
    signalClusterSection.evidence_count
    || signalClusterSection.evidenceCount
    || 0
  );
  const sourceLinkCount = Array.isArray(signalClusterSection.source_links)
    ? signalClusterSection.source_links.length
    : Number(
      signalClusterSection.source_link_count
      || signalClusterSection.sourceLinkCount
      || 0
    );
  const supportState = getSupportState({
    evidenceCount,
    sourceLinkCount,
  });
  const confidenceLabel = normalizeString(
    signalClusterSection?.confidence_display?.label
    || signalClusterSection.confidence_label
    || signalClusterSection.confidenceLabel
  ).toLowerCase();
  const subject = normalizeHeadlineSubject(signalClusterSection.headline);

  return {
    clusterId,
    headline: normalizeString(signalClusterSection.headline),
    rawSummary: normalizeString(signalClusterSection.summary),
    confidenceLabel,
    confidenceSummary: normalizeString(
      signalClusterSection?.confidence_display?.summary
      || signalClusterSection.confidence_summary
      || signalClusterSection.confidenceSummary
    ),
    evidenceCount,
    sourceLinkCount,
    supportState,
    subject,
    limitations,
    limitationFlags,
    isSaved: isClusterSaved(actionState, clusterId),
    isWatched: isClusterWatched(actionState, clusterId),
  };
}

function buildKeyClusterSummary(assessment) {
  if (assessment.supportState === SUPPORT_STATES.EVIDENCE_GAP) {
    return `Treat this cluster as a monitoring candidate rather than an evidence-backed takeaway. ${assessment.rawSummary}`;
  }

  if (assessment.supportState === SUPPORT_STATES.LIMITED_SOURCE_COVERAGE) {
    return `Keep this cluster in the current review because current review hints that ${assessment.subject}, but the evidence basis stays thin and public source coverage is incomplete.`;
  }

  if (assessment.confidenceLabel === 'directional') {
    return `Prioritize this cluster because current review suggests that ${assessment.subject}, with ${pluralize(assessment.evidenceCount, 'evidence record')} across ${pluralize(assessment.sourceLinkCount, 'public source link')}.`;
  }

  return `Keep this cluster high in the current review because current review hints that ${assessment.subject}, with product-visible support strong enough to track but still too narrow to treat as a settled conclusion.`;
}

function buildKeyClusterTrace(assessment) {
  if (assessment.supportState === SUPPORT_STATES.EVIDENCE_GAP) {
    return {
      trace_available: true,
      trace_kind: 'monitoring_gap',
    };
  }

  return {
    trace_available: true,
    trace_kind: 'cluster',
  };
}

function buildTakeawaySummary(assessment, preliminaryCaveat) {
  const opening = assessment.confidenceLabel === 'directional'
    ? `Current review suggests that ${assessment.subject}.`
    : `Current review hints that ${assessment.subject}.`;
  const supportSentence = assessment.supportState === SUPPORT_STATES.LIMITED_SOURCE_COVERAGE
    ? `This takeaway is currently supported by ${pluralize(assessment.evidenceCount, 'evidence record')}, but public source coverage is incomplete in the current snapshot.`
    : `This takeaway is supported by ${pluralize(assessment.evidenceCount, 'evidence record')} across ${pluralize(assessment.sourceLinkCount, 'public source link')}.`;
  const cautionSentences = [];

  if (preliminaryCaveat) {
    cautionSentences.push('Treat this as a preliminary reading rather than a settled conclusion.');
  } else if (assessment.confidenceLabel !== 'directional') {
    cautionSentences.push('Treat this as an early pattern rather than a settled conclusion.');
  }

  if (assessment.limitationFlags.hasThinEvidence && !preliminaryCaveat) {
    cautionSentences.push('Visible limitations still keep this takeaway bounded.');
  }

  return [opening, supportSentence, ...cautionSentences].join(' ');
}

function buildReviewPriorityScore(assessment) {
  const supportState = assessment.supportState || getSupportState({
    evidenceCount: Number(assessment.evidenceCount ?? assessment.evidence_count ?? 0),
    sourceLinkCount: Number(assessment.sourceLinkCount ?? assessment.source_link_count ?? 0),
  });
  const confidenceLabel = normalizeString(
    assessment.confidenceLabel
    || assessment.confidence_label
  ).toLowerCase();
  const supportRank = supportState === SUPPORT_STATES.EVIDENCE_BACKED
    ? 3
    : (supportState === SUPPORT_STATES.LIMITED_SOURCE_COVERAGE ? 2 : 1);
  const confidenceRank = CONFIDENCE_RANKS[confidenceLabel] || 0;
  const limitations = normalizeLimitations(assessment.limitations);

  return [
    supportRank,
    confidenceRank,
    Number(assessment.isSaved ?? assessment.is_saved),
    Number(assessment.isWatched ?? assessment.is_watched),
    -limitations.length,
    Number(assessment.evidenceCount ?? assessment.evidence_count ?? 0),
    Number(assessment.sourceLinkCount ?? assessment.source_link_count ?? 0),
    assessment.headline,
  ];
}

function compareAssessmentScores(left, right) {
  const leftScore = buildReviewPriorityScore(left);
  const rightScore = buildReviewPriorityScore(right);

  for (let index = 0; index < leftScore.length; index += 1) {
    if (leftScore[index] === rightScore[index]) {
      continue;
    }

    if (typeof leftScore[index] === 'string' && typeof rightScore[index] === 'string') {
      return leftScore[index].localeCompare(rightScore[index]);
    }

    return rightScore[index] - leftScore[index];
  }

  return 0;
}

function buildKeySignalClusters({
  signalClusters,
  signalClusterSections,
  actionState,
}) {
  const signalClusterById = signalClusters.reduce((accumulator, signalCluster) => {
    accumulator[signalCluster.id] = signalCluster;
    return accumulator;
  }, {});

  return signalClusterSections
    .filter((signalClusterSection) => !isClusterHidden(actionState, signalClusterSection.cluster_id))
    .map((signalClusterSection) => {
      const clusterId = signalClusterSection.cluster_id;
      const signalCluster = signalClusterById[clusterId] || {};
      const assessment = buildAssessment(signalClusterSection, signalCluster, actionState);

      return {
        cluster_id: clusterId,
        headline: assessment.headline,
        summary: buildKeyClusterSummary(assessment),
        confidence_label: assessment.confidenceLabel,
        confidence_summary: assessment.confidenceSummary,
        evidence_count: assessment.evidenceCount,
        source_link_count: assessment.sourceLinkCount,
        is_saved: assessment.isSaved,
        is_watched: assessment.isWatched,
        limitations: assessment.limitations,
        ...buildKeyClusterTrace(assessment),
      };
    })
    .sort(compareAssessmentScores);
}

function compareSupportingEvidence(actionState) {
  return (left, right) => (
    Number(isEvidenceSaved(actionState, right.curated_evidence_record_id))
    - Number(isEvidenceSaved(actionState, left.curated_evidence_record_id))
    || Number(Boolean(right.source_url)) - Number(Boolean(left.source_url))
    || left.label.localeCompare(right.label)
  );
}

function buildEvidenceBackedTakeaways({
  topicDraft,
  signalClusters,
  curatedEvidenceRecords,
  keySignalClusters,
  actionState,
  preliminaryCaveat,
}) {
  const signalClusterById = signalClusters.reduce((accumulator, signalCluster) => {
    accumulator[signalCluster.id] = signalCluster;
    return accumulator;
  }, {});

  return keySignalClusters
    .filter((cluster) => cluster.evidence_count > 0)
    .map((cluster) => {
      const signalCluster = signalClusterById[cluster.cluster_id];
      const evidenceDrawer = buildEvidenceDrawerState({
        topicDraft,
        signalCluster,
        curatedEvidenceRecords,
      });
      const assessment = buildAssessment(cluster, signalCluster, actionState);
      const supportingEvidence = evidenceDrawer.evidence_items
        .map((item) => ({
          evidence_id: normalizeString(item.curated_evidence_record_id),
          curated_evidence_record_id: normalizeString(item.curated_evidence_record_id),
          label: normalizeString(item.label),
          summary: normalizeString(item.summary),
          source_url: normalizeString(item.url),
        }))
        .sort(compareSupportingEvidence(actionState))
        .map(({ evidence_id, label, summary, source_url }, index) => ({
          evidence_id,
          label: !source_url && /^public source/i.test(label)
            ? `Evidence record ${index + 1}`
            : label,
          summary,
          source_url,
        }));

      return {
        cluster_id: cluster.cluster_id,
        supporting_cluster_id: cluster.cluster_id,
        supporting_cluster_headline: cluster.headline,
        headline: cluster.headline,
        takeaway_summary: buildTakeawaySummary(assessment, preliminaryCaveat),
        confidence_label: cluster.confidence_label,
        supporting_evidence_ids: supportingEvidence.map((item) => item.evidence_id),
        evidence_count: cluster.evidence_count,
        source_link_count: cluster.source_link_count,
        trace_available: true,
        supporting_evidence: supportingEvidence,
      };
    });
}

function buildReviewSnapshot({
  workspaceViewState,
  keySignalClusters,
  evidenceBackedTakeaways,
  savedClusters,
  savedEvidence,
  watchedClusterCount,
  preliminaryCaveat,
}) {
  const reviewSummary = workspaceViewState.review_summary || {};
  const briefMode = preliminaryCaveat
    ? BASELINE_BRIEF_MODES.PRELIMINARY
    : BASELINE_BRIEF_MODES.STANDARD;
  const monitoringCandidateCount = keySignalClusters.filter(
    (cluster) => cluster.evidence_count === 0
  ).length;
  const summary = preliminaryCaveat
    ? `This preliminary review snapshot surfaces ${pluralize(keySignalClusters.length, 'reviewable cluster')}, but only ${pluralize(evidenceBackedTakeaways.length, 'evidence-backed takeaway')} currently qualify for cautious sharing.`
    : monitoringCandidateCount > 0
      ? `This review snapshot surfaces ${pluralize(keySignalClusters.length, 'reviewable cluster')}, including ${pluralize(evidenceBackedTakeaways.length, 'evidence-backed takeaway')} and ${pluralize(monitoringCandidateCount, 'monitoring candidate')} that still needs stronger support.`
      : `This review snapshot surfaces ${pluralize(keySignalClusters.length, 'reviewable cluster')} with ${pluralize(evidenceBackedTakeaways.length, 'evidence-backed takeaway')} supported by ${pluralize(Number(reviewSummary.curated_evidence_record_count || 0), 'evidence record')} across ${pluralize(Number(reviewSummary.public_source_ref_count || 0), 'public source link')}.`;

  return {
    brief_mode: briefMode,
    summary,
    signal_cluster_count: Number(reviewSummary.signal_cluster_count || 0),
    curated_evidence_record_count: Number(reviewSummary.curated_evidence_record_count || 0),
    public_source_ref_count: Number(reviewSummary.public_source_ref_count || 0),
    directional_count: Number(reviewSummary.directional_count || 0),
    exploratory_count: Number(reviewSummary.exploratory_count || 0),
    saved_cluster_count: savedClusters.length,
    saved_evidence_count: savedEvidence.length,
    watched_cluster_count: watchedClusterCount,
    visible_cluster_count: keySignalClusters.length,
    preliminary_caveat: preliminaryCaveat,
  };
}

function buildCaveatsAndLimitations(workspaceViewState, keySignalClusters, evidenceBackedTakeaways, preliminaryCaveat) {
  const workspaceLimitations = Array.isArray(workspaceViewState?.limitations_and_caveats?.workspace_limitations)
    ? normalizeLimitations(workspaceViewState.limitations_and_caveats.workspace_limitations)
      .map(toUserFacingLimitation)
      .filter(Boolean)
    : [];
  const synthesizedLimitations = [];

  if (keySignalClusters.some((cluster) => cluster.evidence_count === 0)) {
    synthesizedLimitations.push('At least one visible cluster remains a monitoring candidate because product-visible evidence is not available in the current snapshot.');
  }

  if (keySignalClusters.some((cluster) => cluster.evidence_count > 0 && cluster.source_link_count === 0)) {
    synthesizedLimitations.push('Public source coverage remains incomplete for part of the current snapshot, so some takeaways are evidence-backed but still thin.');
  }

  if (evidenceBackedTakeaways.length < keySignalClusters.length) {
    synthesizedLimitations.push('Not every visible cluster qualifies as an evidence-backed takeaway in this brief.');
  }

  return {
    workspace_limitations: uniqueStrings([
      ...synthesizedLimitations,
      ...workspaceLimitations,
    ]),
    preliminary_caveat: preliminaryCaveat,
  };
}

function buildSuggestedNextReviewActions({
  preliminaryCaveat,
  savedClusters,
  savedEvidence,
  watchedClusterCount,
  evidenceBackedTakeaways,
  keySignalClusters,
}) {
  const actions = [];
  const evidenceGapClusterCount = keySignalClusters.filter((cluster) => cluster.evidence_count === 0).length;
  const hasOnlyEvidenceGapClusters = evidenceGapClusterCount > 0 && evidenceBackedTakeaways.length === 0;

  if (hasOnlyEvidenceGapClusters) {
    const clusterNoun = evidenceGapClusterCount === 1 ? 'this cluster' : 'these clusters';
    const takeawayNoun = evidenceGapClusterCount === 1
      ? 'an evidence-backed takeaway'
      : 'evidence-backed takeaways';

    actions.push(`Keep ${clusterNoun} as a monitoring gap until product-visible evidence becomes available.`);
    actions.push(`Collect or attach supporting evidence before promoting ${clusterNoun} into ${takeawayNoun}.`);
    actions.push(`Revisit ${clusterNoun} after curated evidence becomes available.`);

    if (savedClusters.length > 0) {
      actions.push('Use saved clusters to keep the next evidence-collection pass focused without treating them as validated market priorities.');
    }

    if (watchedClusterCount > 0) {
      actions.push('Keep watched clusters in follow-up monitoring so the next review can separate evidence gaps from better-supported findings.');
    }

    return uniqueStrings(actions);
  }

  if (evidenceBackedTakeaways.length > 0) {
    actions.push('Reopen the strongest evidence-backed cluster before sharing this brief as a decision input.');
  }

  if (savedEvidence.length > 0) {
    actions.push('Compare saved evidence against the strongest supported cluster before the next validation pass.');
  } else if (savedClusters.length > 0) {
    actions.push('Use saved clusters to focus the next validation pass without treating them as validated market priorities.');
  } else {
    actions.push('Save the most decision-relevant supported cluster or evidence item before the next review pass.');
  }

  if (watchedClusterCount > 0) {
    actions.push('Keep watched clusters in follow-up monitoring so the next review can separate emerging signals from better-supported findings.');
  }

  if (evidenceGapClusterCount > 0) {
    actions.push('Treat clusters without product-visible evidence as monitoring gaps and collect stronger evidence before promoting them into takeaways.');
  }

  if (preliminaryCaveat) {
    actions.push('Collect more evidence before sharing preliminary findings beyond the current review group.');
  }

  return uniqueStrings(actions);
}

function countWatchedClusters(actionState) {
  if (!actionState || typeof actionState !== 'object' || Array.isArray(actionState)) {
    return 0;
  }

  if (!actionState.watchedClustersById || typeof actionState.watchedClustersById !== 'object') {
    return 0;
  }

  return Object.values(actionState.watchedClustersById).filter(
    (entry) => entry && entry.status === 'active'
  ).length;
}

function resolvePreliminaryCaveat(workspaceViewState, keyClusters, evidenceBackedTakeaways) {
  if (!workspaceViewState?.empty_or_sparse_state?.is_sparse) {
    return null;
  }

  if (!evidenceBackedTakeaways.length) {
    return 'This brief is preliminary because the current snapshot does not yet contain evidence-backed takeaways.';
  }

  if (keyClusters.some((cluster) => cluster.source_link_count === 0)) {
    return 'This brief is preliminary because public source coverage is incomplete for part of the current snapshot.';
  }

  return 'This brief is preliminary because the current evidence basis is limited and should be treated cautiously.';
}

function buildBaselineBriefState({
  topicScope = {},
  productMainline,
  actionState = initialActionState(),
  prototypeState = BASELINE_BRIEF_PROTOTYPE_STATES.READY,
} = {}) {
  const resolvedTopicScope = resolveTopicScope(topicScope, productMainline);
  const prototypeEligibility = formatEligibilityFromPrototypeState(resolvedTopicScope, prototypeState);

  if (prototypeEligibility) {
    return prototypeEligibility;
  }

  if (resolvedTopicScope.topic_status && resolvedTopicScope.topic_status !== READY_TOPIC_STATUS) {
    return buildIneligibleBrief({
      topicScope: resolvedTopicScope,
      unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_NOT_READY,
      summary: 'The current topic is not review-ready, so no Baseline Brief is available yet.',
    });
  }

  try {
    ensureObject(productMainline, 'productMainline');

    const workspaceViewState = buildTopicWorkspaceViewState(productMainline);

    if (
      workspaceViewState?.review_state?.state === 'blocked'
      || workspaceViewState?.empty_or_sparse_state?.is_blocked
    ) {
      return buildIneligibleBrief({
        topicScope: resolvedTopicScope,
        unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_BLOCKED,
        summary: 'Initial Review is blocked, so no Baseline Brief is available from this handoff.',
      });
    }

    if (workspaceViewState?.empty_or_sparse_state?.is_empty) {
      return buildIneligibleBrief({
        topicScope: resolvedTopicScope,
        unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE,
        summary: 'The current snapshot does not contain reviewable signal clusters, so no Baseline Brief is available.',
      });
    }

    const topicDraft = ensureObject(productMainline.topic_draft, 'productMainline.topic_draft');
    const signalClusters = Array.isArray(productMainline.signal_clusters) ? productMainline.signal_clusters : [];
    const curatedEvidenceRecords = Array.isArray(productMainline.curated_evidence_records)
      ? productMainline.curated_evidence_records
      : [];
    const savedClusters = getSavedClusters(actionState);
    const savedEvidence = getSavedEvidence(actionState);
    const watchedClusterCount = countWatchedClusters(actionState);
    const keySignalClusters = buildKeySignalClusters({
      signalClusters,
      signalClusterSections: workspaceViewState.signal_cluster_sections || [],
      actionState,
    });
    const preliminaryCaveatSeed = workspaceViewState?.empty_or_sparse_state?.is_sparse
      ? 'preliminary'
      : null;
    const evidenceBackedTakeaways = buildEvidenceBackedTakeaways({
      topicDraft,
      signalClusters,
      curatedEvidenceRecords,
      keySignalClusters,
      actionState,
      preliminaryCaveat: preliminaryCaveatSeed,
    });
    const preliminaryCaveat = resolvePreliminaryCaveat(
      workspaceViewState,
      keySignalClusters,
      evidenceBackedTakeaways
    );
    const briefMode = preliminaryCaveat
      ? BASELINE_BRIEF_MODES.PRELIMINARY
      : BASELINE_BRIEF_MODES.STANDARD;

    return {
      brief_kind: BASELINE_BRIEF_KIND,
      topic_ref: {
        topic_id: resolvedTopicScope.topic_id,
        topic_status: resolvedTopicScope.topic_status || READY_TOPIC_STATUS,
        monitoring_run_id: resolvedTopicScope.monitoring_run_id,
      },
      eligibility: buildEligibility({
        isEligible: true,
        briefMode,
        summary: preliminaryCaveat
          ? 'Eligible for a preliminary Baseline Brief with limited-evidence caveats.'
          : 'Eligible for a standard Baseline Brief.',
      }),
      sections: {
        topic_context: {
          topic_name: resolvedTopicScope.topic_name || normalizeString(topicDraft.title),
          topic_summary: resolvedTopicScope.topic_summary || normalizeString(topicDraft.summary),
          target_audience: resolvedTopicScope.target_audience,
          problem_space: resolvedTopicScope.problem_space,
          monitoring_intent: resolvedTopicScope.monitoring_intent,
        },
        review_snapshot: buildReviewSnapshot({
          workspaceViewState,
          keySignalClusters,
          evidenceBackedTakeaways,
          savedClusters,
          savedEvidence,
          watchedClusterCount,
          preliminaryCaveat,
        }),
        key_signal_clusters: keySignalClusters,
        evidence_backed_takeaways: evidenceBackedTakeaways,
        caveats_and_limitations: buildCaveatsAndLimitations(
          workspaceViewState,
          keySignalClusters,
          evidenceBackedTakeaways,
          preliminaryCaveat
        ),
        suggested_next_review_actions: buildSuggestedNextReviewActions({
          preliminaryCaveat,
          savedClusters,
          savedEvidence,
          watchedClusterCount,
          evidenceBackedTakeaways,
          keySignalClusters,
        }),
      },
    };
  } catch (error) {
    return buildIneligibleBrief({
      topicScope: resolvedTopicScope,
      unavailableReason: BASELINE_BRIEF_UNAVAILABLE_REASONS.DATA_UNAVAILABLE,
      summary: 'Prototype data is unavailable, so the Baseline Brief cannot be rendered safely.',
    });
  }
}

module.exports = {
  BASELINE_BRIEF_KIND,
  BASELINE_BRIEF_MODES,
  BASELINE_BRIEF_PROTOTYPE_STATES,
  BASELINE_BRIEF_UNAVAILABLE_REASONS,
  buildBaselineBriefState,
};
