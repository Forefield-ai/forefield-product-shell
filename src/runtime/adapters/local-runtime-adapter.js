const { makeProductId } = require('../../product/utils/make-product-id');
const {
  getActiveSavedItems,
  hideCluster,
  initialActionState,
  saveCluster,
  saveEvidence,
  undoHideCluster,
  unsaveCluster,
  unsaveEvidence,
  unwatchCluster,
  watchCluster,
} = require('../../product/actions/user-action-state');
const { generateLocalTopicDraftFromInput } = require('../../ui/flow/generate-local-topic-draft');
const { createDemoUserContext } = require('../session/current-user-context');
const {
  RUNTIME_MODES,
  assertCanonicalRuntimePayload,
} = require('../contracts/runtime-adapter-contract');
const {
  buildLocalTopicWorkspaceData,
} = require('../workspace/local-workspace-payload');

function cloneValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function ensureNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function ensureTimestamp(options = {}) {
  if (typeof options.now === 'string' && options.now.trim()) {
    return options.now.trim();
  }

  return new Date().toISOString();
}

function ensureUserContext(userContext) {
  if (!userContext || typeof userContext !== 'object' || Array.isArray(userContext)) {
    throw new Error('userContext must be an object.');
  }

  return {
    user_id: ensureNonEmptyString(userContext.user_id, 'userContext.user_id'),
    workspace_id: ensureNonEmptyString(userContext.workspace_id, 'userContext.workspace_id'),
    mode: ensureNonEmptyString(userContext.mode || 'demo', 'userContext.mode'),
  };
}

function ensureDraftArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value.map((entry) => String(entry).trim()).filter(Boolean);
}

function ensureTopicDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new Error('Topic draft must be an object.');
  }

  return {
    original_input: ensureNonEmptyString(draft.original_input, 'draft.original_input'),
    topic_summary: ensureNonEmptyString(draft.topic_summary, 'draft.topic_summary'),
    topic_name: ensureNonEmptyString(draft.topic_name, 'draft.topic_name'),
    target_audience: ensureNonEmptyString(draft.target_audience, 'draft.target_audience'),
    problem_space: ensureNonEmptyString(draft.problem_space, 'draft.problem_space'),
    monitoring_intent: ensureNonEmptyString(draft.monitoring_intent, 'draft.monitoring_intent'),
    signal_focus: ensureDraftArray(draft.signal_focus, 'draft.signal_focus'),
    competitors_alternatives: Array.isArray(draft.competitors_alternatives)
      ? draft.competitors_alternatives.map((entry) => String(entry).trim()).filter(Boolean)
      : [],
  };
}

function ensureTopic(topic) {
  if (!topic || typeof topic !== 'object' || Array.isArray(topic)) {
    throw new Error('Topic must be an object.');
  }

  return {
    id: ensureNonEmptyString(topic.id, 'topic.id'),
    workspace_id: ensureNonEmptyString(topic.workspace_id, 'topic.workspace_id'),
    created_by: ensureNonEmptyString(topic.created_by, 'topic.created_by'),
    topic_name: ensureNonEmptyString(topic.topic_name, 'topic.topic_name'),
    topic_summary: ensureNonEmptyString(topic.topic_summary, 'topic.topic_summary'),
    status: ensureNonEmptyString(topic.status, 'topic.status'),
    created_at: ensureNonEmptyString(topic.created_at, 'topic.created_at'),
    updated_at: ensureNonEmptyString(topic.updated_at, 'topic.updated_at'),
  };
}

function ensureSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return {
      titleSnapshot: '',
      summarySnapshot: '',
      sourceLinksSnapshot: [],
    };
  }

  const titleValue = typeof snapshot.titleSnapshot === 'string'
    ? snapshot.titleSnapshot
    : typeof snapshot.title_snapshot === 'string'
      ? snapshot.title_snapshot
      : '';
  const summaryValue = typeof snapshot.summarySnapshot === 'string'
    ? snapshot.summarySnapshot
    : typeof snapshot.summary_snapshot === 'string'
      ? snapshot.summary_snapshot
      : '';
  const sourceLinksValue = Array.isArray(snapshot.sourceLinksSnapshot)
    ? snapshot.sourceLinksSnapshot
    : Array.isArray(snapshot.source_links_snapshot)
      ? snapshot.source_links_snapshot
      : [];

  return {
    titleSnapshot: titleValue.trim(),
    summarySnapshot: summaryValue.trim(),
    sourceLinksSnapshot: sourceLinksValue
      .filter((entry) => typeof entry === 'string' && entry.trim())
      .map((entry) => entry.trim()),
  };
}

function ensureActionStateFactory(factory) {
  if (factory === undefined) {
    return initialActionState;
  }

  if (typeof factory !== 'function') {
    throw new Error('actionStateFactory must be a function when provided.');
  }

  return factory;
}

function buildTopicRecord(context, draft, options = {}) {
  const now = ensureTimestamp(options);
  const topicId = typeof options.topicId === 'string' && options.topicId.trim()
    ? options.topicId.trim()
    : makeProductId('topic', 'rt', [context.workspace_id, draft.topic_name, now.replace(/[^0-9]/g, '').slice(0, 14)]);

  return {
    id: topicId,
    workspace_id: context.workspace_id,
    created_by: context.user_id,
    topic_name: draft.topic_name,
    topic_summary: draft.topic_summary,
    status: typeof options.status === 'string' && options.status.trim() ? options.status.trim() : 'draft',
    created_at: now,
    updated_at: now,
  };
}

function buildMonitoringRun(topic, options = {}) {
  const now = ensureTimestamp(options);
  const runId = typeof options.runId === 'string' && options.runId.trim()
    ? options.runId.trim()
    : makeProductId('monitoring_run', 'rt', [topic.id, now.replace(/[^0-9]/g, '').slice(0, 14)]);

  return {
    id: runId,
    topic_id: topic.id,
    workspace_id: topic.workspace_id,
    status: typeof options.status === 'string' && options.status.trim() ? options.status.trim() : 'building',
    stage_label: typeof options.stageLabel === 'string' && options.stageLabel.trim()
      ? options.stageLabel.trim()
      : 'Preparing Initial Topic Map',
    created_at: now,
    updated_at: now,
  };
}

function createLocalRuntimeAdapter(options = {}) {
  const context = ensureUserContext(options.userContext || createDemoUserContext());
  const actionStateFactory = ensureActionStateFactory(options.actionStateFactory);
  const topicDraftGenerator = typeof options.topicDraftGenerator === 'function'
    ? options.topicDraftGenerator
    : generateLocalTopicDraftFromInput;
  const initialTopics = Array.isArray(options.initialTopics) ? options.initialTopics.map((topic) => ensureTopic(topic)) : [];
  const initialActionStateByTopicId = options.initialActionStateByTopicId && typeof options.initialActionStateByTopicId === 'object'
    ? options.initialActionStateByTopicId
    : {};
  const state = {
    context,
    topicsById: {},
    topicOrder: [],
    runsById: {},
    activeRunIdByTopicId: {},
    actionStateByTopicId: {},
  };

  initialTopics.forEach((topic) => {
    state.topicsById[topic.id] = cloneValue(topic);
    state.topicOrder.push(topic.id);
  });

  Object.keys(initialActionStateByTopicId).forEach((topicId) => {
    state.actionStateByTopicId[topicId] = cloneValue(initialActionStateByTopicId[topicId]);
  });

  state.topicOrder.forEach((topicId) => {
    if (!state.actionStateByTopicId[topicId]) {
      state.actionStateByTopicId[topicId] = cloneValue(actionStateFactory());
    }
  });

  function ensureTopicId(topicId) {
    return ensureNonEmptyString(topicId, 'topicId');
  }

  function ensureExistingTopic(topicId) {
    const safeTopicId = ensureTopicId(topicId);
    const topic = state.topicsById[safeTopicId];

    if (!topic) {
      throw new Error(`Unknown topicId: ${safeTopicId}`);
    }

    return topic;
  }

  function ensureActionState(topicId) {
    const safeTopicId = ensureTopicId(topicId);

    if (!state.actionStateByTopicId[safeTopicId]) {
      state.actionStateByTopicId[safeTopicId] = cloneValue(actionStateFactory());
    }

    return state.actionStateByTopicId[safeTopicId];
  }

  function commitActionState(topicId, nextState) {
    state.actionStateByTopicId[topicId] = cloneValue(nextState);

    return assertCanonicalRuntimePayload(cloneValue(state.actionStateByTopicId[topicId]));
  }

  function findSavedEvidenceItem(topicId, evidenceId) {
    const safeTopicId = ensureTopicId(topicId);
    const safeEvidenceId = ensureNonEmptyString(evidenceId, 'evidenceId');
    const currentState = ensureActionState(safeTopicId);

    return currentState.savedItems.find((item) => (
      item.saved_type === 'evidence'
      && item.source_object_id === safeEvidenceId
    )) || null;
  }

  const adapter = {
    mode: RUNTIME_MODES.LOCAL,
    session: {
      getCurrentContext() {
        return assertCanonicalRuntimePayload(cloneValue(state.context));
      },
    },
    topics: {
      createTopicDraft(input) {
        const draft = ensureTopicDraft(topicDraftGenerator(ensureNonEmptyString(input, 'input')));

        return assertCanonicalRuntimePayload(cloneValue(draft));
      },
      confirmTopicDraft(draft, confirmOptions = {}) {
        const safeDraft = ensureTopicDraft(draft);
        const topic = buildTopicRecord(state.context, safeDraft, confirmOptions);

        state.topicsById[topic.id] = cloneValue(topic);
        state.topicOrder = [topic.id, ...state.topicOrder.filter((existingId) => existingId !== topic.id)];
        ensureActionState(topic.id);

        return assertCanonicalRuntimePayload(cloneValue(topic));
      },
      listTopics() {
        const topics = state.topicOrder
          .map((topicId) => state.topicsById[topicId])
          .filter(Boolean)
          .map((topic) => cloneValue(topic));

        return assertCanonicalRuntimePayload(topics);
      },
      getTopic(topicId) {
        const topic = state.topicsById[ensureTopicId(topicId)];

        if (!topic) {
          return null;
        }

        return assertCanonicalRuntimePayload(cloneValue(topic));
      },
    },
    runs: {
      startInitialReview(topicId, runOptions = {}) {
        const topic = ensureExistingTopic(topicId);
        const run = buildMonitoringRun(topic, runOptions);

        state.runsById[run.id] = cloneValue(run);
        state.activeRunIdByTopicId[topic.id] = run.id;
        state.topicsById[topic.id] = {
          ...topic,
          status: run.status,
          updated_at: run.updated_at,
        };

        return assertCanonicalRuntimePayload(cloneValue(run));
      },
      getRunStatus(runId) {
        const safeRunId = ensureNonEmptyString(runId, 'runId');
        const run = state.runsById[safeRunId];

        if (!run) {
          return null;
        }

        return assertCanonicalRuntimePayload(cloneValue(run));
      },
    },
    workspace: {
      getTopicWorkspace(topicId, workspaceOptions = {}) {
        const topic = ensureExistingTopic(topicId);
        const activeRunId = state.activeRunIdByTopicId[topic.id];
        const monitoringRun = activeRunId ? state.runsById[activeRunId] || null : null;
        const workspaceData = buildLocalTopicWorkspaceData({
          topic,
          monitoringRun,
          productMainline: workspaceOptions.productMainline,
        });

        return assertCanonicalRuntimePayload(cloneValue(workspaceData));
      },
      listSavedItems(topicId) {
        ensureExistingTopic(topicId);
        const currentState = ensureActionState(topicId);
        const savedItems = getActiveSavedItems(currentState).map((item) => cloneValue(item));

        return assertCanonicalRuntimePayload(savedItems);
      },
    },
    actions: {
      watchCluster(topicId, clusterId, actionOptions = {}) {
        ensureExistingTopic(topicId);
        const nextState = watchCluster(ensureActionState(topicId), {
          localTopicId: topicId,
          clusterId,
          metadata: actionOptions.metadata,
        }, actionOptions);

        return commitActionState(topicId, nextState);
      },
      unwatchCluster(topicId, clusterId, actionOptions = {}) {
        ensureExistingTopic(topicId);
        const nextState = unwatchCluster(ensureActionState(topicId), {
          localTopicId: topicId,
          clusterId,
          metadata: actionOptions.metadata,
        }, actionOptions);

        return commitActionState(topicId, nextState);
      },
      saveCluster(topicId, clusterId, snapshot = {}, actionOptions = {}) {
        ensureExistingTopic(topicId);
        const safeSnapshot = ensureSnapshot(snapshot);
        const nextState = saveCluster(ensureActionState(topicId), {
          localTopicId: topicId,
          clusterId,
          titleSnapshot: safeSnapshot.titleSnapshot,
          summarySnapshot: safeSnapshot.summarySnapshot,
          sourceLinksSnapshot: safeSnapshot.sourceLinksSnapshot,
          metadata: actionOptions.metadata,
        }, actionOptions);

        return commitActionState(topicId, nextState);
      },
      unsaveCluster(topicId, clusterId, actionOptions = {}) {
        ensureExistingTopic(topicId);
        const nextState = unsaveCluster(ensureActionState(topicId), {
          localTopicId: topicId,
          clusterId,
          metadata: actionOptions.metadata,
        }, actionOptions);

        return commitActionState(topicId, nextState);
      },
      saveEvidence(topicId, clusterId, evidenceId, snapshot = {}, actionOptions = {}) {
        ensureExistingTopic(topicId);
        const safeSnapshot = ensureSnapshot(snapshot);
        const nextState = saveEvidence(ensureActionState(topicId), {
          localTopicId: topicId,
          clusterId,
          evidenceId,
          titleSnapshot: safeSnapshot.titleSnapshot,
          summarySnapshot: safeSnapshot.summarySnapshot,
          sourceLinksSnapshot: safeSnapshot.sourceLinksSnapshot,
          metadata: actionOptions.metadata,
        }, actionOptions);

        return commitActionState(topicId, nextState);
      },
      unsaveEvidence(topicId, evidenceId, actionOptions = {}) {
        ensureExistingTopic(topicId);
        const existingSavedEvidence = findSavedEvidenceItem(topicId, evidenceId);

        if (!existingSavedEvidence || !existingSavedEvidence.cluster_id) {
          throw new Error(`Cannot unsave evidence without existing cluster context for evidenceId: ${ensureNonEmptyString(evidenceId, 'evidenceId')}`);
        }

        const nextState = unsaveEvidence(ensureActionState(topicId), {
          localTopicId: topicId,
          clusterId: existingSavedEvidence.cluster_id,
          evidenceId,
          metadata: actionOptions.metadata,
        }, actionOptions);

        return commitActionState(topicId, nextState);
      },
      hideCluster(topicId, clusterId, actionOptions = {}) {
        ensureExistingTopic(topicId);
        const nextState = hideCluster(ensureActionState(topicId), {
          localTopicId: topicId,
          clusterId,
          metadata: actionOptions.metadata,
        }, actionOptions);

        return commitActionState(topicId, nextState);
      },
      undoHideCluster(topicId, clusterId, actionOptions = {}) {
        ensureExistingTopic(topicId);
        const nextState = undoHideCluster(ensureActionState(topicId), {
          localTopicId: topicId,
          clusterId,
          metadata: actionOptions.metadata,
        }, actionOptions);

        return commitActionState(topicId, nextState);
      },
    },
  };

  return adapter;
}

module.exports = {
  createLocalRuntimeAdapter,
};
