const {
  BASELINE_BRIEF_PROTOTYPE_STATES,
  BASELINE_BRIEF_UNAVAILABLE_REASONS,
  buildBaselineBriefState,
} = require('../read-models/build-baseline-brief-state');
const { initialActionState } = require('../actions/user-action-state');

const COPILOT_GUIDED_ACTIONS_KIND = 'copilot_guided_actions';

const COPILOT_ACTION_IDS = {
  EXPLAIN_CLUSTER: 'explain_cluster',
  EXPLAIN_BRIEF_TAKEAWAY_SUPPORT: 'explain_brief_takeaway_support',
  SUMMARIZE_CAVEATS: 'summarize_caveats',
  GENERATE_VALIDATION_QUESTIONS: 'generate_validation_questions',
  SUGGEST_WHAT_TO_WATCH_NEXT: 'suggest_what_to_watch_next',
};

const COPILOT_INPUT_TYPES = {
  SIGNAL_CLUSTER: 'signal_cluster',
  BASELINE_BRIEF_TAKEAWAY: 'baseline_brief_takeaway',
  WORKSPACE_CONTEXT: 'workspace_context',
};

const COPILOT_WORKSPACE_STATES = {
  RICH: 'rich',
  SPARSE: 'sparse',
  NO_EVIDENCE: 'no_evidence',
  EMPTY: 'empty',
  BASELINE_FAILED: 'baseline_failed',
  BASELINE_STUCK: 'baseline_stuck',
  DATA_UNAVAILABLE: 'data_unavailable',
  UNKNOWN_FIXTURE_KEY: 'unknown_fixture_key',
  UNEXPECTED_TOPIC_STATUS: 'unexpected_topic_status',
  REVIEW_NOT_READY: 'review_not_ready',
  REVIEW_BLOCKED: 'review_blocked',
};

const COPILOT_OUTPUT_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
};

const COPILOT_OUTPUT_SHAPE = {
  kind: 'guided_action_response',
  required_fields: [
    'status',
    'preliminary',
    'what_this_currently_supports',
    'what_remains_limited',
    'what_to_validate_next',
  ],
  optional_fields: [
    'trace_refs',
    'unavailable_reason',
    'unavailable_message',
  ],
};

const COPILOT_ALLOWED_DATA_SOURCES = {
  TOPIC: 'topic',
  SIGNAL_CLUSTER: 'signal_cluster',
  CURATED_EVIDENCE: 'curated_evidence',
  EVIDENCE_DRAWER_VISIBLE_FIELDS: 'evidence_drawer_visible_fields',
  USER_ACTION_STATE: 'user_action_state',
  BASELINE_BRIEF: 'baseline_brief',
  BRIEF_TRACE_METADATA: 'brief_trace_metadata',
  REVIEW_SUMMARY: 'review_summary',
  SOURCE_COVERAGE: 'source_coverage',
  CAVEATS: 'caveats',
};

const COPILOT_FORBIDDEN_CLAIMS = [
  'market sizing',
  'demand certainty',
  'purchase intent',
  'opportunity ranking',
  'competitor strategy claims',
  'trend acceleration without time metadata',
  'source metadata invention',
  'hallucinated citations',
  'unsupported gtm / pricing / roadmap recommendations',
  'rewriting brief into stronger claims',
];

const ACTION_CONTRACT_DEFINITIONS = [
  {
    action_id: COPILOT_ACTION_IDS.EXPLAIN_CLUSTER,
    display_name: 'Explain this cluster',
    input_type: COPILOT_INPUT_TYPES.SIGNAL_CLUSTER,
    required_input_fields: ['cluster_id'],
    allowed_data_sources: [
      COPILOT_ALLOWED_DATA_SOURCES.TOPIC,
      COPILOT_ALLOWED_DATA_SOURCES.SIGNAL_CLUSTER,
      COPILOT_ALLOWED_DATA_SOURCES.CURATED_EVIDENCE,
      COPILOT_ALLOWED_DATA_SOURCES.EVIDENCE_DRAWER_VISIBLE_FIELDS,
      COPILOT_ALLOWED_DATA_SOURCES.USER_ACTION_STATE,
      COPILOT_ALLOWED_DATA_SOURCES.CAVEATS,
    ],
    output_shape: COPILOT_OUTPUT_SHAPE,
    availability_rules: {
      allowed_workspace_states: [
        COPILOT_WORKSPACE_STATES.RICH,
        COPILOT_WORKSPACE_STATES.SPARSE,
        COPILOT_WORKSPACE_STATES.NO_EVIDENCE,
      ],
      requires_visible_cluster: true,
    },
    state_specific_constraints: {
      [COPILOT_WORKSPACE_STATES.SPARSE]: 'Use preliminary language and keep evidence limits visible.',
      [COPILOT_WORKSPACE_STATES.NO_EVIDENCE]: 'Explain the monitoring gap and do not convert it into an evidence-backed claim.',
    },
    forbidden_claims: COPILOT_FORBIDDEN_CLAIMS,
    trace_behavior: {
      mode: 'cluster_context',
      supports_evidence_handoff: true,
      supports_monitoring_gap_handoff: true,
    },
  },
  {
    action_id: COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT,
    display_name: 'Explain why this Brief takeaway is supported',
    input_type: COPILOT_INPUT_TYPES.BASELINE_BRIEF_TAKEAWAY,
    required_input_fields: ['cluster_id'],
    allowed_data_sources: [
      COPILOT_ALLOWED_DATA_SOURCES.TOPIC,
      COPILOT_ALLOWED_DATA_SOURCES.BASELINE_BRIEF,
      COPILOT_ALLOWED_DATA_SOURCES.BRIEF_TRACE_METADATA,
      COPILOT_ALLOWED_DATA_SOURCES.CURATED_EVIDENCE,
      COPILOT_ALLOWED_DATA_SOURCES.EVIDENCE_DRAWER_VISIBLE_FIELDS,
      COPILOT_ALLOWED_DATA_SOURCES.CAVEATS,
    ],
    output_shape: COPILOT_OUTPUT_SHAPE,
    availability_rules: {
      allowed_workspace_states: [
        COPILOT_WORKSPACE_STATES.RICH,
        COPILOT_WORKSPACE_STATES.SPARSE,
      ],
      requires_traceable_takeaway: true,
    },
    state_specific_constraints: {
      [COPILOT_WORKSPACE_STATES.SPARSE]: 'Retain preliminary / limited-evidence wording and do not imply complete support.',
    },
    forbidden_claims: COPILOT_FORBIDDEN_CLAIMS,
    trace_behavior: {
      mode: 'brief_takeaway_support',
      requires_trace_metadata: true,
      supports_evidence_handoff: true,
    },
  },
  {
    action_id: COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS,
    display_name: 'Summarize caveats / limitations',
    input_type: COPILOT_INPUT_TYPES.WORKSPACE_CONTEXT,
    required_input_fields: [],
    allowed_data_sources: [
      COPILOT_ALLOWED_DATA_SOURCES.TOPIC,
      COPILOT_ALLOWED_DATA_SOURCES.BASELINE_BRIEF,
      COPILOT_ALLOWED_DATA_SOURCES.REVIEW_SUMMARY,
      COPILOT_ALLOWED_DATA_SOURCES.SOURCE_COVERAGE,
      COPILOT_ALLOWED_DATA_SOURCES.CAVEATS,
      COPILOT_ALLOWED_DATA_SOURCES.BRIEF_TRACE_METADATA,
    ],
    output_shape: COPILOT_OUTPUT_SHAPE,
    availability_rules: {
      allowed_workspace_states: [
        COPILOT_WORKSPACE_STATES.RICH,
        COPILOT_WORKSPACE_STATES.SPARSE,
        COPILOT_WORKSPACE_STATES.NO_EVIDENCE,
      ],
    },
    state_specific_constraints: {
      [COPILOT_WORKSPACE_STATES.SPARSE]: 'Keep limited-evidence language visible instead of collapsing it into a weak-demand interpretation.',
      [COPILOT_WORKSPACE_STATES.NO_EVIDENCE]: 'Frame missing support as an evidence gap, not a negative demand signal.',
    },
    forbidden_claims: COPILOT_FORBIDDEN_CLAIMS,
    trace_behavior: {
      mode: 'aggregate_caveat_summary',
      requires_trace_metadata: false,
    },
  },
  {
    action_id: COPILOT_ACTION_IDS.GENERATE_VALIDATION_QUESTIONS,
    display_name: 'Generate validation questions',
    input_type: COPILOT_INPUT_TYPES.SIGNAL_CLUSTER,
    required_input_fields: ['cluster_id'],
    allowed_data_sources: [
      COPILOT_ALLOWED_DATA_SOURCES.TOPIC,
      COPILOT_ALLOWED_DATA_SOURCES.SIGNAL_CLUSTER,
      COPILOT_ALLOWED_DATA_SOURCES.CURATED_EVIDENCE,
      COPILOT_ALLOWED_DATA_SOURCES.EVIDENCE_DRAWER_VISIBLE_FIELDS,
      COPILOT_ALLOWED_DATA_SOURCES.USER_ACTION_STATE,
      COPILOT_ALLOWED_DATA_SOURCES.CAVEATS,
    ],
    output_shape: COPILOT_OUTPUT_SHAPE,
    availability_rules: {
      allowed_workspace_states: [
        COPILOT_WORKSPACE_STATES.RICH,
        COPILOT_WORKSPACE_STATES.SPARSE,
        COPILOT_WORKSPACE_STATES.NO_EVIDENCE,
      ],
      requires_visible_cluster: true,
    },
    state_specific_constraints: {
      [COPILOT_WORKSPACE_STATES.SPARSE]: 'Keep questions validation-oriented and preliminary.',
      [COPILOT_WORKSPACE_STATES.NO_EVIDENCE]: 'Focus on questions that would surface support, not on questions that assume support already exists.',
    },
    forbidden_claims: COPILOT_FORBIDDEN_CLAIMS,
    trace_behavior: {
      mode: 'cluster_context',
      supports_evidence_handoff: true,
      supports_monitoring_gap_handoff: true,
    },
  },
  {
    action_id: COPILOT_ACTION_IDS.SUGGEST_WHAT_TO_WATCH_NEXT,
    display_name: 'Suggest what to watch next',
    input_type: COPILOT_INPUT_TYPES.WORKSPACE_CONTEXT,
    required_input_fields: [],
    allowed_data_sources: [
      COPILOT_ALLOWED_DATA_SOURCES.TOPIC,
      COPILOT_ALLOWED_DATA_SOURCES.BASELINE_BRIEF,
      COPILOT_ALLOWED_DATA_SOURCES.USER_ACTION_STATE,
      COPILOT_ALLOWED_DATA_SOURCES.REVIEW_SUMMARY,
      COPILOT_ALLOWED_DATA_SOURCES.SOURCE_COVERAGE,
      COPILOT_ALLOWED_DATA_SOURCES.CAVEATS,
    ],
    output_shape: COPILOT_OUTPUT_SHAPE,
    availability_rules: {
      allowed_workspace_states: [
        COPILOT_WORKSPACE_STATES.RICH,
        COPILOT_WORKSPACE_STATES.SPARSE,
        COPILOT_WORKSPACE_STATES.NO_EVIDENCE,
      ],
    },
    state_specific_constraints: {
      [COPILOT_WORKSPACE_STATES.SPARSE]: 'Treat this as a watchlist for further validation, not as a ranked market view.',
      [COPILOT_WORKSPACE_STATES.NO_EVIDENCE]: 'Keep monitoring-gap language and focus on what evidence would be needed next.',
    },
    forbidden_claims: COPILOT_FORBIDDEN_CLAIMS,
    trace_behavior: {
      mode: 'workspace_monitoring',
      supports_evidence_handoff: false,
      supports_monitoring_gap_handoff: true,
    },
  },
];

function normalizeString(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function uniqueStrings(values) {
  const seen = new Set();

  return values.filter((value) => {
    const normalized = normalizeString(value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function ensureObject(value, pathName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${pathName} must be an object.`);
  }

  return value;
}

function buildTopicRef(topicScope, briefState) {
  return {
    topic_id: normalizeString(briefState?.topic_ref?.topic_id || topicScope?.topic_id),
    topic_status: normalizeString(briefState?.topic_ref?.topic_status || topicScope?.topic_status),
    monitoring_run_id: normalizeString(
      briefState?.topic_ref?.monitoring_run_id || topicScope?.monitoring_run_id
    ),
  };
}

function buildStateSummary(workspaceState, briefState) {
  switch (workspaceState) {
    case COPILOT_WORKSPACE_STATES.RICH:
      return 'Copilot guided actions are available for the current review-ready workspace.';
    case COPILOT_WORKSPACE_STATES.SPARSE:
      return 'Copilot guided actions are available, but outputs must stay preliminary because the current evidence basis is limited.';
    case COPILOT_WORKSPACE_STATES.NO_EVIDENCE:
      return 'Copilot guided actions are available only for monitoring-gap explanation and follow-up validation because no evidence-backed takeaways exist in the current snapshot.';
    case COPILOT_WORKSPACE_STATES.EMPTY:
      return 'Copilot guided actions are unavailable because the current snapshot does not contain reviewable signal clusters.';
    case COPILOT_WORKSPACE_STATES.BASELINE_FAILED:
      return 'Copilot guided actions are unavailable because Initial Review did not complete successfully.';
    case COPILOT_WORKSPACE_STATES.BASELINE_STUCK:
      return 'Copilot guided actions are unavailable because Initial Review stopped advancing before completion.';
    case COPILOT_WORKSPACE_STATES.UNKNOWN_FIXTURE_KEY:
      return 'Copilot guided actions are unavailable because the current local sample workspace is unavailable.';
    case COPILOT_WORKSPACE_STATES.UNEXPECTED_TOPIC_STATUS:
      return 'Copilot guided actions are unavailable because the current local topic status is unsupported.';
    case COPILOT_WORKSPACE_STATES.REVIEW_NOT_READY:
      return 'Copilot guided actions are unavailable because the current topic is not review-ready.';
    case COPILOT_WORKSPACE_STATES.REVIEW_BLOCKED:
      return 'Copilot guided actions are unavailable because Initial Review is blocked for the current handoff.';
    case COPILOT_WORKSPACE_STATES.DATA_UNAVAILABLE:
    default:
      return briefState?.eligibility?.summary
        || 'Copilot guided actions are unavailable because prototype data cannot be rendered safely.';
  }
}

function mapUnavailableReasonToWorkspaceState(unavailableReason) {
  switch (unavailableReason) {
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE:
      return COPILOT_WORKSPACE_STATES.EMPTY;
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.BASELINE_FAILED:
      return COPILOT_WORKSPACE_STATES.BASELINE_FAILED;
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.BASELINE_STUCK:
      return COPILOT_WORKSPACE_STATES.BASELINE_STUCK;
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.UNKNOWN_FIXTURE_KEY:
      return COPILOT_WORKSPACE_STATES.UNKNOWN_FIXTURE_KEY;
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.UNEXPECTED_TOPIC_STATUS:
      return COPILOT_WORKSPACE_STATES.UNEXPECTED_TOPIC_STATUS;
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_NOT_READY:
      return COPILOT_WORKSPACE_STATES.REVIEW_NOT_READY;
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_BLOCKED:
      return COPILOT_WORKSPACE_STATES.REVIEW_BLOCKED;
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.DATA_UNAVAILABLE:
    default:
      return COPILOT_WORKSPACE_STATES.DATA_UNAVAILABLE;
  }
}

function resolveWorkspaceState(briefState) {
  if (!briefState?.eligibility?.is_eligible) {
    return mapUnavailableReasonToWorkspaceState(briefState?.eligibility?.unavailable_reason);
  }

  const keySignalClusters = Array.isArray(briefState?.sections?.key_signal_clusters)
    ? briefState.sections.key_signal_clusters
    : [];
  const evidenceBackedTakeaways = Array.isArray(briefState?.sections?.evidence_backed_takeaways)
    ? briefState.sections.evidence_backed_takeaways
    : [];

  if (
    keySignalClusters.length > 0
    && evidenceBackedTakeaways.length === 0
    && keySignalClusters.every((cluster) => cluster.trace_kind === 'monitoring_gap')
  ) {
    return COPILOT_WORKSPACE_STATES.NO_EVIDENCE;
  }

  if (briefState?.eligibility?.brief_mode === 'preliminary') {
    return COPILOT_WORKSPACE_STATES.SPARSE;
  }

  return COPILOT_WORKSPACE_STATES.RICH;
}

function buildCopilotContext({
  topicScope = {},
  productMainline,
  actionState = initialActionState(),
  prototypeState = BASELINE_BRIEF_PROTOTYPE_STATES.READY,
  briefState = null,
} = {}) {
  ensureObject(topicScope, 'topicScope');

  const resolvedBriefState = briefState || buildBaselineBriefState({
    topicScope,
    productMainline,
    actionState,
    prototypeState,
  });
  const workspaceState = resolveWorkspaceState(resolvedBriefState);
  const keySignalClusters = Array.isArray(resolvedBriefState?.sections?.key_signal_clusters)
    ? resolvedBriefState.sections.key_signal_clusters
    : [];
  const evidenceBackedTakeaways = Array.isArray(resolvedBriefState?.sections?.evidence_backed_takeaways)
    ? resolvedBriefState.sections.evidence_backed_takeaways
    : [];
  const reviewSnapshot = resolvedBriefState?.sections?.review_snapshot || {};
  const caveats = resolvedBriefState?.sections?.caveats_and_limitations || {};

  return {
    topic_ref: buildTopicRef(topicScope, resolvedBriefState),
    topic_context: resolvedBriefState?.sections?.topic_context || null,
    brief_state: resolvedBriefState,
    workspace_state: workspaceState,
    summary: buildStateSummary(workspaceState, resolvedBriefState),
    preliminary: workspaceState === COPILOT_WORKSPACE_STATES.SPARSE
      || workspaceState === COPILOT_WORKSPACE_STATES.NO_EVIDENCE,
    key_signal_clusters: keySignalClusters,
    evidence_backed_takeaways: evidenceBackedTakeaways,
    review_snapshot: reviewSnapshot,
    caveats_and_limitations: caveats,
  };
}

function buildAvailabilitySummary(action, context, isAvailable, unavailableReason) {
  if (isAvailable) {
    if (context.workspace_state === COPILOT_WORKSPACE_STATES.SPARSE) {
      return `${action.display_name} is available, but it must keep preliminary / limited-evidence language visible.`;
    }

    if (context.workspace_state === COPILOT_WORKSPACE_STATES.NO_EVIDENCE) {
      return `${action.display_name} is available only for monitoring-gap explanation and evidence-collection follow-up.`;
    }

    return `${action.display_name} is available for the current review-ready workspace.`;
  }

  switch (unavailableReason) {
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE:
      return 'This action is unavailable because the current snapshot does not contain reviewable signal clusters.';
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.BASELINE_FAILED:
      return 'This action is unavailable because Initial Review did not complete successfully.';
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.BASELINE_STUCK:
      return 'This action is unavailable because Initial Review stopped advancing before completion.';
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.UNKNOWN_FIXTURE_KEY:
      return 'This action is unavailable because the current local sample workspace is unavailable.';
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.UNEXPECTED_TOPIC_STATUS:
      return 'This action is unavailable because the current local topic status is unsupported.';
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_NOT_READY:
      return 'This action is unavailable because the current topic is not review-ready.';
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.REVIEW_BLOCKED:
      return 'This action is unavailable because Initial Review is blocked for the current handoff.';
    case BASELINE_BRIEF_UNAVAILABLE_REASONS.DATA_UNAVAILABLE:
    default:
      return 'This action is unavailable because the current prototype data cannot be used safely.';
  }
}

function buildActionAvailability(contract, context) {
  const allowedStates = contract.availability_rules.allowed_workspace_states || [];
  const isAvailable = allowedStates.includes(context.workspace_state);
  const unavailableReason = isAvailable
    ? null
    : (
      context.brief_state?.eligibility?.unavailable_reason
      || (context.workspace_state === COPILOT_WORKSPACE_STATES.EMPTY
        ? BASELINE_BRIEF_UNAVAILABLE_REASONS.EMPTY_WORKSPACE
        : BASELINE_BRIEF_UNAVAILABLE_REASONS.DATA_UNAVAILABLE)
    );

  return {
    is_available: isAvailable,
    unavailable_reason: unavailableReason,
    summary: buildAvailabilitySummary(contract, context, isAvailable, unavailableReason),
  };
}

function buildCopilotGuidedActionsState({
  topicScope = {},
  productMainline,
  actionState = initialActionState(),
  prototypeState = BASELINE_BRIEF_PROTOTYPE_STATES.READY,
  briefState = null,
} = {}) {
  const context = buildCopilotContext({
    topicScope,
    productMainline,
    actionState,
    prototypeState,
    briefState,
  });

  return {
    kind: COPILOT_GUIDED_ACTIONS_KIND,
    topic_ref: context.topic_ref,
    workspace_state: context.workspace_state,
    summary: context.summary,
    actions: ACTION_CONTRACT_DEFINITIONS.map((contract) => ({
      action_id: contract.action_id,
      display_name: contract.display_name,
      input_type: contract.input_type,
      required_input_fields: [...contract.required_input_fields],
      allowed_data_sources: [...contract.allowed_data_sources],
      output_shape: contract.output_shape,
      availability_rules: contract.availability_rules,
      state_specific_constraints: contract.state_specific_constraints,
      forbidden_claims: [...contract.forbidden_claims],
      trace_behavior: contract.trace_behavior,
      availability: buildActionAvailability(contract, context),
    })),
  };
}

function buildSafeUnavailableMessage(context) {
  switch (context.workspace_state) {
    case COPILOT_WORKSPACE_STATES.EMPTY:
      return 'The current snapshot does not contain enough reviewable signal for this Copilot action.';
    case COPILOT_WORKSPACE_STATES.BASELINE_FAILED:
      return 'Initial Review did not complete successfully, so this Copilot action cannot generate market analysis.';
    case COPILOT_WORKSPACE_STATES.BASELINE_STUCK:
      return 'Initial Review stopped advancing before completion, so this Copilot action cannot generate market analysis.';
    case COPILOT_WORKSPACE_STATES.UNKNOWN_FIXTURE_KEY:
      return 'The current local sample workspace is unavailable, so this Copilot action cannot run safely.';
    case COPILOT_WORKSPACE_STATES.UNEXPECTED_TOPIC_STATUS:
      return 'The current local topic status is unsupported, so this Copilot action cannot run safely.';
    case COPILOT_WORKSPACE_STATES.REVIEW_NOT_READY:
      return 'The current topic is not review-ready, so this Copilot action cannot run yet.';
    case COPILOT_WORKSPACE_STATES.REVIEW_BLOCKED:
      return 'Initial Review is blocked, so this Copilot action cannot generate market analysis.';
    case COPILOT_WORKSPACE_STATES.DATA_UNAVAILABLE:
    default:
      return 'Prototype data is unavailable, so this Copilot action cannot render safely.';
  }
}

function buildUnavailableActionOutput(contract, context, unavailableReason, inputRef = null, unavailableMessage = null) {
  const safeMessage = unavailableMessage || buildSafeUnavailableMessage(context);

  return {
    action_id: contract.action_id,
    display_name: contract.display_name,
    status: COPILOT_OUTPUT_STATUS.UNAVAILABLE,
    preliminary: false,
    input_ref: inputRef,
    what_this_currently_supports: null,
    what_remains_limited: safeMessage,
    what_to_validate_next: [],
    trace_refs: [],
    unavailable_reason: unavailableReason,
    unavailable_message: safeMessage,
  };
}

function buildClusterTraceRef(cluster) {
  return {
    ref_kind: 'signal_cluster',
    cluster_id: cluster.cluster_id,
    headline: cluster.headline,
    trace_kind: cluster.trace_kind || 'cluster',
  };
}

function buildEvidenceTraceRef(takeaway) {
  return {
    ref_kind: 'evidence_support',
    supporting_cluster_id: takeaway.supporting_cluster_id,
    evidence_ids: Array.isArray(takeaway.supporting_evidence_ids)
      ? takeaway.supporting_evidence_ids
      : [],
    evidence_count: Number(takeaway.evidence_count || 0),
    source_link_count: Number(takeaway.source_link_count || 0),
  };
}

function formatSupportSentence(cluster, { preliminary }) {
  const subject = normalizeString(cluster.headline).replace(/[.]+$/g, '');
  const opening = cluster.confidence_label === 'directional'
    ? `Current review suggests that ${subject.charAt(0).toLowerCase()}${subject.slice(1)}.`
    : `Current review hints that ${subject.charAt(0).toLowerCase()}${subject.slice(1)}.`;

  if (cluster.trace_kind === 'monitoring_gap') {
    return `This cluster remains visible in the current review, but it should be treated as a monitoring gap rather than an evidence-backed finding. ${opening}`;
  }

  if (preliminary || Number(cluster.source_link_count || 0) === 0) {
    return `${opening} Current product-visible support includes ${pluralize(Number(cluster.evidence_count || 0), 'evidence record')}, but public source coverage remains incomplete in the current snapshot.`;
  }

  return `${opening} Current product-visible support includes ${pluralize(Number(cluster.evidence_count || 0), 'evidence record')} across ${pluralize(Number(cluster.source_link_count || 0), 'public source link')}.`;
}

function formatClusterLimitations(cluster, context) {
  const limitations = Array.isArray(cluster.limitations)
    ? cluster.limitations
    : [];
  const workspaceLimitations = Array.isArray(context.caveats_and_limitations?.workspace_limitations)
    ? context.caveats_and_limitations.workspace_limitations
    : [];

  if (cluster.trace_kind === 'monitoring_gap') {
    return 'No product-visible evidence is available in the current snapshot, so Copilot cannot turn this cluster into an evidence-backed claim.';
  }

  if (context.workspace_state === COPILOT_WORKSPACE_STATES.SPARSE) {
    return 'This output remains preliminary because the current evidence basis is limited and the visible support should be treated cautiously.';
  }

  if (limitations.length) {
    return limitations[0];
  }

  if (workspaceLimitations.length) {
    return workspaceLimitations[0];
  }

  return 'The current output stays bounded to visible review evidence and should not be treated as a market conclusion.';
}

function findKeyCluster(context, clusterId) {
  return context.key_signal_clusters.find((cluster) => cluster.cluster_id === clusterId) || null;
}

function findTakeaway(context, clusterId) {
  return context.evidence_backed_takeaways.find((takeaway) => takeaway.cluster_id === clusterId) || null;
}

function buildExplainClusterOutput(contract, context, input) {
  const clusterId = normalizeString(input?.cluster_id);
  const cluster = findKeyCluster(context, clusterId);

  if (!cluster) {
    return buildUnavailableActionOutput(
      contract,
      context,
      'input_not_available',
      { cluster_id: clusterId },
      'This cluster is not available in the current review context, so Copilot cannot explain it safely.'
    );
  }

  const isMonitoringGap = cluster.trace_kind === 'monitoring_gap';
  const nextSteps = isMonitoringGap
    ? [
      'Keep this cluster as a monitoring gap until curated evidence becomes available.',
      'Collect or attach supporting evidence before promoting this cluster into an evidence-backed takeaway.',
    ]
    : [
      cluster.is_saved
        ? 'Use the current saved cluster as a review focus, but do not treat the saved state as market validation.'
        : 'Reopen this cluster in Workspace and compare the visible evidence before sharing it more broadly.',
      cluster.is_watched
        ? 'Keep the watched state focused on follow-up validation rather than on market certainty.'
        : 'Treat this as a review checkpoint and verify whether the next evidence pass strengthens or weakens the current pattern.',
    ];

  return {
    action_id: contract.action_id,
    display_name: contract.display_name,
    status: COPILOT_OUTPUT_STATUS.AVAILABLE,
    preliminary: context.preliminary,
    input_ref: { cluster_id: cluster.cluster_id },
    what_this_currently_supports: formatSupportSentence(cluster, context),
    what_remains_limited: formatClusterLimitations(cluster, context),
    what_to_validate_next: uniqueStrings(nextSteps),
    trace_refs: [buildClusterTraceRef(cluster)],
  };
}

function buildExplainBriefTakeawaySupportOutput(contract, context, input) {
  const clusterId = normalizeString(input?.cluster_id);
  const takeaway = findTakeaway(context, clusterId);

  if (!takeaway) {
    return buildUnavailableActionOutput(
      contract,
      context,
      'input_not_available',
      { cluster_id: clusterId },
      'No evidence-backed Brief takeaway is available for this cluster in the current review context.'
    );
  }

  const limitedSupport = Number(takeaway.source_link_count || 0) === 0 || context.preliminary;
  const supportSentence = limitedSupport
    ? `This Brief takeaway is grounded in the supporting cluster "${takeaway.supporting_cluster_headline}" and ${pluralize(Number(takeaway.evidence_count || 0), 'evidence record')}, but public source coverage remains incomplete in the current snapshot.`
    : `This Brief takeaway is grounded in the supporting cluster "${takeaway.supporting_cluster_headline}" and ${pluralize(Number(takeaway.evidence_count || 0), 'evidence record')} across ${pluralize(Number(takeaway.source_link_count || 0), 'public source link')}.`;
  const limitedSentence = context.preliminary
    ? 'Treat this explanation as preliminary because the current brief still carries limited-evidence caveats.'
    : 'The takeaway remains bounded to product-visible evidence and should not be upgraded into a stronger market claim.';

  return {
    action_id: contract.action_id,
    display_name: contract.display_name,
    status: COPILOT_OUTPUT_STATUS.AVAILABLE,
    preliminary: context.preliminary,
    input_ref: { cluster_id: takeaway.cluster_id },
    what_this_currently_supports: supportSentence,
    what_remains_limited: limitedSentence,
    what_to_validate_next: uniqueStrings([
      'Open the supporting cluster and review its caveats before repeating this takeaway outside the current review group.',
      'Compare the visible supporting evidence against the takeaway wording to confirm it has not become stronger than the current evidence basis.',
    ]),
    trace_refs: [
      buildClusterTraceRef({
        cluster_id: takeaway.supporting_cluster_id,
        headline: takeaway.supporting_cluster_headline,
        trace_kind: 'cluster',
      }),
      buildEvidenceTraceRef(takeaway),
    ],
  };
}

function buildSummarizeCaveatsOutput(contract, context) {
  const workspaceLimitations = Array.isArray(context.caveats_and_limitations?.workspace_limitations)
    ? context.caveats_and_limitations.workspace_limitations
    : [];
  const topCaveats = workspaceLimitations.slice(0, 3);
  const limitationSummary = topCaveats.length
    ? topCaveats.join(' ')
    : 'The current review still needs caveat-aware interpretation.';
  const traceRefs = context.key_signal_clusters
    .filter((cluster) => cluster.trace_kind === 'monitoring_gap' || Number(cluster.source_link_count || 0) === 0)
    .slice(0, 2)
    .map(buildClusterTraceRef);

  return {
    action_id: contract.action_id,
    display_name: contract.display_name,
    status: COPILOT_OUTPUT_STATUS.AVAILABLE,
    preliminary: context.preliminary,
    input_ref: null,
    what_this_currently_supports: context.preliminary
      ? 'The current review supports only a cautious, preliminary reading of visible patterns.'
      : 'The current review supports limited, evidence-bounded interpretation of visible clusters.',
    what_remains_limited: limitationSummary,
    what_to_validate_next: uniqueStrings([
      context.workspace_state === COPILOT_WORKSPACE_STATES.NO_EVIDENCE
        ? 'Treat clusters without product-visible evidence as monitoring gaps rather than as supported findings.'
        : 'Revisit the strongest supported cluster alongside its visible caveats before sharing conclusions more broadly.',
      context.preliminary
        ? 'Collect more evidence before treating preliminary findings as stable.'
        : 'Keep caveats visible when converting this review into saved notes or a Baseline Brief.',
    ]),
    trace_refs: traceRefs,
  };
}

function buildValidationQuestions(cluster, context) {
  if (cluster.trace_kind === 'monitoring_gap') {
    return [
      `What product-visible evidence would be needed to confirm whether "${cluster.headline}" reflects more than a monitoring gap?`,
      `Which follow-up source or curated evidence record would most directly test the current cluster summary?`,
    ];
  }

  if (context.preliminary) {
    return [
      `Which follow-up question would best test whether "${cluster.headline}" remains visible beyond the current limited evidence set?`,
      'What would have to change in the next evidence pass before this pattern could be treated as more than preliminary?',
    ];
  }

  return [
    `Which visible caveat most needs confirmation before "${cluster.headline}" is repeated as a stronger takeaway?`,
    'What new evidence would most effectively test whether the current supported pattern keeps holding?',
  ];
}

function buildGenerateValidationQuestionsOutput(contract, context, input) {
  const clusterId = normalizeString(input?.cluster_id);
  const cluster = findKeyCluster(context, clusterId);

  if (!cluster) {
    return buildUnavailableActionOutput(
      contract,
      context,
      'input_not_available',
      { cluster_id: clusterId },
      'This cluster is not available in the current review context, so Copilot cannot generate validation questions safely.'
    );
  }

  return {
    action_id: contract.action_id,
    display_name: contract.display_name,
    status: COPILOT_OUTPUT_STATUS.AVAILABLE,
    preliminary: context.preliminary,
    input_ref: { cluster_id: cluster.cluster_id },
    what_this_currently_supports: cluster.trace_kind === 'monitoring_gap'
      ? 'The current review keeps this cluster visible as a monitoring gap worth testing.'
      : formatSupportSentence(cluster, context),
    what_remains_limited: formatClusterLimitations(cluster, context),
    what_to_validate_next: buildValidationQuestions(cluster, context),
    trace_refs: [buildClusterTraceRef(cluster)],
  };
}

function buildSuggestWhatToWatchNextOutput(contract, context) {
  const savedClusters = context.key_signal_clusters.filter((cluster) => cluster.is_saved);
  const watchedClusters = context.key_signal_clusters.filter((cluster) => cluster.is_watched);
  const monitoringGaps = context.key_signal_clusters.filter((cluster) => cluster.trace_kind === 'monitoring_gap');
  const supportedClusters = context.key_signal_clusters.filter((cluster) => cluster.trace_kind === 'cluster');
  const nextSteps = [];

  if (savedClusters.length > 0) {
    nextSteps.push(`Keep saved clusters in focus as current review emphasis, not as proof that they matter more than other visible signals: ${savedClusters.map((cluster) => cluster.headline).join('; ')}.`);
  } else if (supportedClusters.length > 0) {
    nextSteps.push(`Recheck the strongest supported cluster next: ${supportedClusters[0].headline}.`);
  }

  if (watchedClusters.length > 0) {
    nextSteps.push(`Continue monitoring watched clusters for follow-up validation: ${watchedClusters.map((cluster) => cluster.headline).join('; ')}.`);
  }

  if (monitoringGaps.length > 0) {
    nextSteps.push(`Treat monitoring gaps as evidence-collection candidates before promoting them into takeaways: ${monitoringGaps.map((cluster) => cluster.headline).join('; ')}.`);
  }

  if (context.preliminary) {
    nextSteps.push('Collect more evidence before treating current preliminary signals as stable review conclusions.');
  }

  if (!nextSteps.length) {
    nextSteps.push('Revisit the current review after the next evidence pass to see whether visible support strengthens or weakens.');
  }

  return {
    action_id: contract.action_id,
    display_name: contract.display_name,
    status: COPILOT_OUTPUT_STATUS.AVAILABLE,
    preliminary: context.preliminary,
    input_ref: null,
    what_this_currently_supports: context.workspace_state === COPILOT_WORKSPACE_STATES.NO_EVIDENCE
      ? 'The current review can still identify what to monitor next, even though it does not yet support evidence-backed takeaways.'
      : 'The current review can still point to the next validation targets without turning them into market rankings.',
    what_remains_limited: context.workspace_state === COPILOT_WORKSPACE_STATES.NO_EVIDENCE
      ? 'No product-visible evidence is available for the current monitoring-gap clusters, so watch-next guidance cannot be treated as supported demand analysis.'
      : 'Saved and watched states reflect user emphasis only; they do not increase evidence strength or market certainty.',
    what_to_validate_next: uniqueStrings(nextSteps),
    trace_refs: uniqueStrings([
      ...savedClusters.map((cluster) => cluster.cluster_id),
      ...watchedClusters.map((cluster) => cluster.cluster_id),
      ...monitoringGaps.map((cluster) => cluster.cluster_id),
    ]).map((clusterId) => {
      const cluster = findKeyCluster(context, clusterId);
      return cluster ? buildClusterTraceRef(cluster) : null;
    }).filter(Boolean),
  };
}

function buildAvailableActionOutput(contract, context, input) {
  switch (contract.action_id) {
    case COPILOT_ACTION_IDS.EXPLAIN_CLUSTER:
      return buildExplainClusterOutput(contract, context, input);
    case COPILOT_ACTION_IDS.EXPLAIN_BRIEF_TAKEAWAY_SUPPORT:
      return buildExplainBriefTakeawaySupportOutput(contract, context, input);
    case COPILOT_ACTION_IDS.SUMMARIZE_CAVEATS:
      return buildSummarizeCaveatsOutput(contract, context);
    case COPILOT_ACTION_IDS.GENERATE_VALIDATION_QUESTIONS:
      return buildGenerateValidationQuestionsOutput(contract, context, input);
    case COPILOT_ACTION_IDS.SUGGEST_WHAT_TO_WATCH_NEXT:
      return buildSuggestWhatToWatchNextOutput(contract, context);
    default:
      throw new Error(`Unsupported Copilot action: ${contract.action_id}`);
  }
}

function buildCopilotGuidedActionMockOutput({
  topicScope = {},
  productMainline,
  actionState = initialActionState(),
  prototypeState = BASELINE_BRIEF_PROTOTYPE_STATES.READY,
  briefState = null,
  actionId,
  input = {},
} = {}) {
  const context = buildCopilotContext({
    topicScope,
    productMainline,
    actionState,
    prototypeState,
    briefState,
  });
  const contract = ACTION_CONTRACT_DEFINITIONS.find((entry) => entry.action_id === actionId);

  if (!contract) {
    throw new Error(`Unknown Copilot action id: ${actionId}`);
  }

  const availability = buildActionAvailability(contract, context);

  if (!availability.is_available) {
    return buildUnavailableActionOutput(
      contract,
      context,
      availability.unavailable_reason,
      input && typeof input === 'object' ? { ...input } : null
    );
  }

  return buildAvailableActionOutput(contract, context, input);
}

module.exports = {
  COPILOT_GUIDED_ACTIONS_KIND,
  COPILOT_ACTION_IDS,
  COPILOT_INPUT_TYPES,
  COPILOT_WORKSPACE_STATES,
  COPILOT_OUTPUT_STATUS,
  COPILOT_OUTPUT_SHAPE,
  COPILOT_ALLOWED_DATA_SOURCES,
  COPILOT_FORBIDDEN_CLAIMS,
  buildCopilotGuidedActionsState,
  buildCopilotGuidedActionMockOutput,
};
