import { buildEvidenceDrawerState } from './build-evidence-drawer-state.browser.mjs';
import { buildTopicWorkspaceViewState } from './build-topic-workspace-view-state.browser.mjs';
import {
  getSavedClusters,
  getSavedEvidence,
  initialActionState,
  isClusterHidden,
  isClusterSaved,
  isClusterWatched,
} from '../actions/user-action-state.browser.mjs';

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
};

const READY_TOPIC_STATUS = 'ready';

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
    target_audience: normalizeString(safeTopicScope.target_audience),
    problem_space: normalizeString(safeTopicScope.problem_space),
    monitoring_intent: normalizeString(safeTopicScope.monitoring_intent),
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

function resolvePreliminaryCaveat(workspaceViewState, keyClusters, evidenceBackedTakeaways) {
  if (!workspaceViewState?.empty_or_sparse_state?.is_sparse) {
    return null;
  }

  if (!evidenceBackedTakeaways.length) {
    return 'This brief is preliminary because the current snapshot does not yet contain evidence-backed takeaways.';
  }

  if (keyClusters.some((cluster) => cluster.source_link_count === 0)) {
    return 'This brief is preliminary because at least one reviewable cluster has limited source-link coverage in the current snapshot.';
  }

  return 'This brief is preliminary because the current evidence basis is limited and should be treated cautiously.';
}

function compareKeyClusters(left, right) {
  return (
    Number(right.is_saved) - Number(left.is_saved)
    || Number(right.is_watched) - Number(left.is_watched)
    || right.evidence_count - left.evidence_count
    || right.headline.localeCompare(left.headline)
  );
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

      return {
        cluster_id: clusterId,
        headline: normalizeString(signalClusterSection.headline),
        summary: normalizeString(signalClusterSection.summary),
        confidence_label: normalizeString(signalClusterSection?.confidence_display?.label),
        confidence_summary: normalizeString(signalClusterSection?.confidence_display?.summary),
        evidence_count: Number(signalClusterSection.evidence_count || 0),
        source_link_count: Array.isArray(signalClusterSection.source_links)
          ? signalClusterSection.source_links.length
          : 0,
        is_saved: isClusterSaved(actionState, clusterId),
        is_watched: isClusterWatched(actionState, clusterId),
        limitations: normalizeLimitations(signalCluster.limitations),
      };
    })
    .sort(compareKeyClusters);
}

function buildEvidenceBackedTakeaways({
  topicDraft,
  signalClusters,
  curatedEvidenceRecords,
  keySignalClusters,
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

      return {
        cluster_id: cluster.cluster_id,
        headline: cluster.headline,
        takeaway_summary: cluster.summary,
        confidence_label: cluster.confidence_label,
        supporting_evidence: evidenceDrawer.evidence_items.map((item) => ({
          evidence_id: normalizeString(item.curated_evidence_record_id),
          label: normalizeString(item.label),
          summary: normalizeString(item.summary),
          source_url: normalizeString(item.url),
        })),
      };
    });
}

function buildReviewSnapshot({
  workspaceViewState,
  keySignalClusters,
  savedClusters,
  savedEvidence,
  watchedClusterCount,
  preliminaryCaveat,
}) {
  const reviewSummary = workspaceViewState.review_summary || {};
  const briefMode = preliminaryCaveat
    ? BASELINE_BRIEF_MODES.PRELIMINARY
    : BASELINE_BRIEF_MODES.STANDARD;
  const summary = preliminaryCaveat
    ? `${reviewSummary.signal_cluster_count} reviewable clusters are available, but the current evidence basis is limited enough that this brief should be treated as preliminary.`
    : `${reviewSummary.signal_cluster_count} reviewable clusters are available, supported by ${reviewSummary.curated_evidence_record_count} evidence records and ${reviewSummary.public_source_ref_count} public source links.`;

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

function buildCaveatsAndLimitations(workspaceViewState, preliminaryCaveat) {
  const workspaceLimitations = Array.isArray(workspaceViewState?.limitations_and_caveats?.workspace_limitations)
    ? normalizeLimitations(workspaceViewState.limitations_and_caveats.workspace_limitations)
    : [];

  return {
    workspace_limitations: workspaceLimitations,
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

  if (preliminaryCaveat) {
    actions.push('Treat this brief as preliminary and verify the strongest cluster again before using it as a durable roadmap input.');
  } else {
    actions.push('Reopen the strongest cluster evidence before sharing this brief more broadly or using it as a decision input.');
  }

  if (savedClusters.length || savedEvidence.length) {
    actions.push('Use saved clusters and evidence to shape the next validation pass rather than re-reading the full workspace from scratch.');
  } else {
    actions.push('Save the most decision-relevant clusters or evidence items before turning this brief into a follow-up workflow.');
  }

  if (!evidenceBackedTakeaways.length) {
    actions.push('Do not treat unsourced clusters as evidence-backed takeaways; revisit later when stronger product-visible evidence is available.');
  } else if (watchedClusterCount > 0) {
    actions.push('Keep watched clusters in follow-up monitoring so the next review can distinguish emerging signals from already-supported ones.');
  } else if (keySignalClusters.length > evidenceBackedTakeaways.length) {
    actions.push('Treat clusters without evidence-backed takeaways as monitoring candidates, not as validated findings.');
  }

  return actions;
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
    const evidenceBackedTakeaways = buildEvidenceBackedTakeaways({
      topicDraft,
      signalClusters,
      curatedEvidenceRecords,
      keySignalClusters,
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
          savedClusters,
          savedEvidence,
          watchedClusterCount,
          preliminaryCaveat,
        }),
        key_signal_clusters: keySignalClusters,
        evidence_backed_takeaways: evidenceBackedTakeaways,
        caveats_and_limitations: buildCaveatsAndLimitations(
          workspaceViewState,
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

export {
  BASELINE_BRIEF_KIND,
  BASELINE_BRIEF_MODES,
  BASELINE_BRIEF_PROTOTYPE_STATES,
  BASELINE_BRIEF_UNAVAILABLE_REASONS,
  buildBaselineBriefState,
};
