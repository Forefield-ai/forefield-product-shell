const ACTION_TYPES = {
  WATCH_CLUSTER: 'watch_cluster',
  UNWATCH_CLUSTER: 'unwatch_cluster',
  SAVE_CLUSTER: 'save_cluster',
  UNSAVE_CLUSTER: 'unsave_cluster',
  SAVE_EVIDENCE: 'save_evidence',
  UNSAVE_EVIDENCE: 'unsave_evidence',
  HIDE_CLUSTER: 'hide_cluster',
  UNDO_HIDE_CLUSTER: 'undo_hide_cluster',
};

const TARGET_TYPES = {
  CLUSTER: 'cluster',
  EVIDENCE: 'evidence',
};

const SAVED_TYPES = {
  CLUSTER: 'cluster',
  EVIDENCE: 'evidence',
};

function ensureNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function ensureState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('User action state must be an object.');
  }

  if (!Array.isArray(state.userActions)) {
    throw new Error('User action state userActions must be an array.');
  }

  if (!Array.isArray(state.savedItems)) {
    throw new Error('User action state savedItems must be an array.');
  }

  if (!state.watchedClustersById || typeof state.watchedClustersById !== 'object' || Array.isArray(state.watchedClustersById)) {
    throw new Error('User action state watchedClustersById must be an object.');
  }

  if (!state.hiddenClustersById || typeof state.hiddenClustersById !== 'object' || Array.isArray(state.hiddenClustersById)) {
    throw new Error('User action state hiddenClustersById must be an object.');
  }

  return state;
}

function ensureLocalTopicId(localTopicId) {
  return ensureNonEmptyString(localTopicId, 'localTopicId');
}

function ensureClusterId(clusterId) {
  return ensureNonEmptyString(clusterId, 'clusterId');
}

function ensureEvidenceId(evidenceId) {
  return ensureNonEmptyString(evidenceId, 'evidenceId');
}

function ensureMetadata(metadata) {
  if (metadata === undefined) {
    return undefined;
  }

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('metadata must be an object when provided.');
  }

  return metadata;
}

function ensureTimestamp(options = {}) {
  if (typeof options.now === 'string' && options.now.trim()) {
    return options.now.trim();
  }

  return new Date().toISOString();
}

function sanitizeSnapshotText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function sanitizeSourceLinksSnapshot(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => typeof entry === 'string' && entry.trim())
    .map((entry) => entry.trim());
}

function slugifyIdPart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item';
}

function createActionId(actionType, localTopicId, targetId, createdAt) {
  return `local_action__${slugifyIdPart(localTopicId)}__${slugifyIdPart(actionType)}__${slugifyIdPart(targetId)}__${createdAt.replace(/[^0-9]/g, '').slice(0, 14)}`;
}

function createSavedItemId(savedType, localTopicId, sourceObjectId) {
  return `local_saved_item__${slugifyIdPart(savedType)}__${slugifyIdPart(localTopicId)}__${slugifyIdPart(sourceObjectId)}`;
}

function createUserAction({
  actionType,
  targetType,
  targetId,
  localTopicId,
  clusterId,
  evidenceId,
  createdAt,
  metadata,
}) {
  const action = {
    id: createActionId(actionType, localTopicId, targetId, createdAt),
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    local_topic_id: localTopicId,
    created_at: createdAt,
  };

  if (clusterId) {
    action.cluster_id = clusterId;
  }

  if (evidenceId) {
    action.evidence_id = evidenceId;
  }

  if (metadata !== undefined) {
    action.metadata = metadata;
  }

  return action;
}

function appendUserAction(state, userAction) {
  return {
    ...state,
    userActions: [...state.userActions, userAction],
  };
}

function upsertSavedItem(savedItems, nextSavedItem) {
  const existingIndex = savedItems.findIndex((item) => item.id === nextSavedItem.id);

  if (existingIndex === -1) {
    return [...savedItems, nextSavedItem];
  }

  return savedItems.map((item, index) => (index === existingIndex ? nextSavedItem : item));
}

function getSavedItemIndex(savedItems, savedType, localTopicId, sourceObjectId) {
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeSourceObjectId = ensureNonEmptyString(sourceObjectId, 'sourceObjectId');
  const savedItemId = createSavedItemId(savedType, safeLocalTopicId, safeSourceObjectId);

  return savedItems.findIndex((item) => item.id === savedItemId);
}

function initialActionState() {
  return {
    userActions: [],
    savedItems: [],
    watchedClustersById: {},
    hiddenClustersById: {},
  };
}

function watchCluster(state, { localTopicId, clusterId, metadata } = {}, options = {}) {
  const currentState = ensureState(state);
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeClusterId = ensureClusterId(clusterId);
  const safeMetadata = ensureMetadata(metadata);
  const now = ensureTimestamp(options);

  const nextState = {
    ...currentState,
    watchedClustersById: {
      ...currentState.watchedClustersById,
      [safeClusterId]: {
        cluster_id: safeClusterId,
        watched_at: now,
        status: 'active',
      },
    },
  };

  return appendUserAction(nextState, createUserAction({
    actionType: ACTION_TYPES.WATCH_CLUSTER,
    targetType: TARGET_TYPES.CLUSTER,
    targetId: safeClusterId,
    localTopicId: safeLocalTopicId,
    clusterId: safeClusterId,
    createdAt: now,
    metadata: safeMetadata,
  }));
}

function unwatchCluster(state, { localTopicId, clusterId, metadata } = {}, options = {}) {
  const currentState = ensureState(state);
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeClusterId = ensureClusterId(clusterId);
  const safeMetadata = ensureMetadata(metadata);
  const now = ensureTimestamp(options);
  const existing = currentState.watchedClustersById[safeClusterId];

  const nextState = {
    ...currentState,
    watchedClustersById: {
      ...currentState.watchedClustersById,
      [safeClusterId]: {
        cluster_id: safeClusterId,
        watched_at: existing?.watched_at || now,
        status: 'removed',
      },
    },
  };

  return appendUserAction(nextState, createUserAction({
    actionType: ACTION_TYPES.UNWATCH_CLUSTER,
    targetType: TARGET_TYPES.CLUSTER,
    targetId: safeClusterId,
    localTopicId: safeLocalTopicId,
    clusterId: safeClusterId,
    createdAt: now,
    metadata: safeMetadata,
  }));
}

function saveCluster(
  state,
  {
    localTopicId,
    clusterId,
    titleSnapshot = '',
    summarySnapshot = '',
    sourceLinksSnapshot = [],
    metadata,
  } = {},
  options = {}
) {
  const currentState = ensureState(state);
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeClusterId = ensureClusterId(clusterId);
  const safeMetadata = ensureMetadata(metadata);
  const now = ensureTimestamp(options);
  const nextSavedItem = {
    id: createSavedItemId(SAVED_TYPES.CLUSTER, safeLocalTopicId, safeClusterId),
    saved_type: SAVED_TYPES.CLUSTER,
    source_object_id: safeClusterId,
    local_topic_id: safeLocalTopicId,
    cluster_id: safeClusterId,
    saved_at: now,
    title_snapshot: sanitizeSnapshotText(titleSnapshot),
    summary_snapshot: sanitizeSnapshotText(summarySnapshot),
    source_links_snapshot: sanitizeSourceLinksSnapshot(sourceLinksSnapshot),
    status: 'active',
  };

  const nextState = {
    ...currentState,
    savedItems: upsertSavedItem(currentState.savedItems, nextSavedItem),
  };

  return appendUserAction(nextState, createUserAction({
    actionType: ACTION_TYPES.SAVE_CLUSTER,
    targetType: TARGET_TYPES.CLUSTER,
    targetId: safeClusterId,
    localTopicId: safeLocalTopicId,
    clusterId: safeClusterId,
    createdAt: now,
    metadata: safeMetadata,
  }));
}

function unsaveCluster(state, { localTopicId, clusterId, metadata } = {}, options = {}) {
  const currentState = ensureState(state);
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeClusterId = ensureClusterId(clusterId);
  const safeMetadata = ensureMetadata(metadata);
  const now = ensureTimestamp(options);
  const savedItemId = createSavedItemId(SAVED_TYPES.CLUSTER, safeLocalTopicId, safeClusterId);
  const existingIndex = getSavedItemIndex(currentState.savedItems, SAVED_TYPES.CLUSTER, safeLocalTopicId, safeClusterId);
  const existing = existingIndex >= 0 ? currentState.savedItems[existingIndex] : null;
  const nextSavedItem = existing
    ? {
      ...existing,
      status: 'removed',
    }
    : {
      id: savedItemId,
      saved_type: SAVED_TYPES.CLUSTER,
      source_object_id: safeClusterId,
      local_topic_id: safeLocalTopicId,
      cluster_id: safeClusterId,
      saved_at: now,
      title_snapshot: '',
      summary_snapshot: '',
      source_links_snapshot: [],
      status: 'removed',
    };

  const nextState = {
    ...currentState,
    savedItems: upsertSavedItem(currentState.savedItems, nextSavedItem),
  };

  return appendUserAction(nextState, createUserAction({
    actionType: ACTION_TYPES.UNSAVE_CLUSTER,
    targetType: TARGET_TYPES.CLUSTER,
    targetId: safeClusterId,
    localTopicId: safeLocalTopicId,
    clusterId: safeClusterId,
    createdAt: now,
    metadata: safeMetadata,
  }));
}

function saveEvidence(
  state,
  {
    localTopicId,
    clusterId,
    evidenceId,
    titleSnapshot = '',
    summarySnapshot = '',
    sourceLinksSnapshot = [],
    metadata,
  } = {},
  options = {}
) {
  const currentState = ensureState(state);
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeClusterId = ensureClusterId(clusterId);
  const safeEvidenceId = ensureEvidenceId(evidenceId);
  const safeMetadata = ensureMetadata(metadata);
  const now = ensureTimestamp(options);
  const nextSavedItem = {
    id: createSavedItemId(SAVED_TYPES.EVIDENCE, safeLocalTopicId, safeEvidenceId),
    saved_type: SAVED_TYPES.EVIDENCE,
    source_object_id: safeEvidenceId,
    local_topic_id: safeLocalTopicId,
    cluster_id: safeClusterId,
    saved_at: now,
    title_snapshot: sanitizeSnapshotText(titleSnapshot),
    summary_snapshot: sanitizeSnapshotText(summarySnapshot),
    source_links_snapshot: sanitizeSourceLinksSnapshot(sourceLinksSnapshot),
    status: 'active',
  };

  const nextState = {
    ...currentState,
    savedItems: upsertSavedItem(currentState.savedItems, nextSavedItem),
  };

  return appendUserAction(nextState, createUserAction({
    actionType: ACTION_TYPES.SAVE_EVIDENCE,
    targetType: TARGET_TYPES.EVIDENCE,
    targetId: safeEvidenceId,
    localTopicId: safeLocalTopicId,
    clusterId: safeClusterId,
    evidenceId: safeEvidenceId,
    createdAt: now,
    metadata: safeMetadata,
  }));
}

function unsaveEvidence(
  state,
  {
    localTopicId,
    clusterId,
    evidenceId,
    metadata,
  } = {},
  options = {}
) {
  const currentState = ensureState(state);
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeClusterId = ensureClusterId(clusterId);
  const safeEvidenceId = ensureEvidenceId(evidenceId);
  const safeMetadata = ensureMetadata(metadata);
  const now = ensureTimestamp(options);
  const savedItemId = createSavedItemId(SAVED_TYPES.EVIDENCE, safeLocalTopicId, safeEvidenceId);
  const existingIndex = getSavedItemIndex(currentState.savedItems, SAVED_TYPES.EVIDENCE, safeLocalTopicId, safeEvidenceId);
  const existing = existingIndex >= 0 ? currentState.savedItems[existingIndex] : null;
  const nextSavedItem = existing
    ? {
      ...existing,
      status: 'removed',
      cluster_id: existing.cluster_id || safeClusterId,
    }
    : {
      id: savedItemId,
      saved_type: SAVED_TYPES.EVIDENCE,
      source_object_id: safeEvidenceId,
      local_topic_id: safeLocalTopicId,
      cluster_id: safeClusterId,
      saved_at: now,
      title_snapshot: '',
      summary_snapshot: '',
      source_links_snapshot: [],
      status: 'removed',
    };

  const nextState = {
    ...currentState,
    savedItems: upsertSavedItem(currentState.savedItems, nextSavedItem),
  };

  return appendUserAction(nextState, createUserAction({
    actionType: ACTION_TYPES.UNSAVE_EVIDENCE,
    targetType: TARGET_TYPES.EVIDENCE,
    targetId: safeEvidenceId,
    localTopicId: safeLocalTopicId,
    clusterId: safeClusterId,
    evidenceId: safeEvidenceId,
    createdAt: now,
    metadata: safeMetadata,
  }));
}

function hideCluster(state, { localTopicId, clusterId, metadata } = {}, options = {}) {
  const currentState = ensureState(state);
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeClusterId = ensureClusterId(clusterId);
  const safeMetadata = ensureMetadata(metadata);
  const now = ensureTimestamp(options);

  const nextState = {
    ...currentState,
    hiddenClustersById: {
      ...currentState.hiddenClustersById,
      [safeClusterId]: {
        cluster_id: safeClusterId,
        hidden_at: now,
        status: 'hidden',
      },
    },
  };

  return appendUserAction(nextState, createUserAction({
    actionType: ACTION_TYPES.HIDE_CLUSTER,
    targetType: TARGET_TYPES.CLUSTER,
    targetId: safeClusterId,
    localTopicId: safeLocalTopicId,
    clusterId: safeClusterId,
    createdAt: now,
    metadata: safeMetadata,
  }));
}

function undoHideCluster(state, { localTopicId, clusterId, metadata } = {}, options = {}) {
  const currentState = ensureState(state);
  const safeLocalTopicId = ensureLocalTopicId(localTopicId);
  const safeClusterId = ensureClusterId(clusterId);
  const safeMetadata = ensureMetadata(metadata);
  const now = ensureTimestamp(options);
  const existing = currentState.hiddenClustersById[safeClusterId];

  const nextState = {
    ...currentState,
    hiddenClustersById: {
      ...currentState.hiddenClustersById,
      [safeClusterId]: {
        cluster_id: safeClusterId,
        hidden_at: existing?.hidden_at || now,
        status: 'visible',
      },
    },
  };

  return appendUserAction(nextState, createUserAction({
    actionType: ACTION_TYPES.UNDO_HIDE_CLUSTER,
    targetType: TARGET_TYPES.CLUSTER,
    targetId: safeClusterId,
    localTopicId: safeLocalTopicId,
    clusterId: safeClusterId,
    createdAt: now,
    metadata: safeMetadata,
  }));
}

function isClusterWatched(state, clusterId) {
  const currentState = ensureState(state);
  const safeClusterId = ensureClusterId(clusterId);

  return currentState.watchedClustersById[safeClusterId]?.status === 'active';
}

function isClusterSaved(state, clusterId) {
  const currentState = ensureState(state);
  const safeClusterId = ensureClusterId(clusterId);

  return currentState.savedItems.some((item) => (
    item.saved_type === SAVED_TYPES.CLUSTER
    && item.source_object_id === safeClusterId
    && item.status === 'active'
  ));
}

function isEvidenceSaved(state, evidenceId) {
  const currentState = ensureState(state);
  const safeEvidenceId = ensureEvidenceId(evidenceId);

  return currentState.savedItems.some((item) => (
    item.saved_type === SAVED_TYPES.EVIDENCE
    && item.source_object_id === safeEvidenceId
    && item.status === 'active'
  ));
}

function isClusterHidden(state, clusterId) {
  const currentState = ensureState(state);
  const safeClusterId = ensureClusterId(clusterId);

  return currentState.hiddenClustersById[safeClusterId]?.status === 'hidden';
}

function getActiveSavedItems(state) {
  const currentState = ensureState(state);

  return currentState.savedItems.filter((item) => item.status === 'active');
}

function getSavedClusters(state) {
  return getActiveSavedItems(state).filter((item) => item.saved_type === SAVED_TYPES.CLUSTER);
}

function getSavedEvidence(state) {
  return getActiveSavedItems(state).filter((item) => item.saved_type === SAVED_TYPES.EVIDENCE);
}

module.exports = {
  initialActionState,
  watchCluster,
  unwatchCluster,
  saveCluster,
  unsaveCluster,
  saveEvidence,
  unsaveEvidence,
  hideCluster,
  undoHideCluster,
  isClusterWatched,
  isClusterSaved,
  isEvidenceSaved,
  isClusterHidden,
  getActiveSavedItems,
  getSavedClusters,
  getSavedEvidence,
};
