const ALLOWED_ACTIVE_SECTIONS = new Set([
  'summary',
  'clusters',
  'evidence',
]);

function ensureState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('WorkspaceInteractionState state must be an object.');
  }

  return state;
}

function ensureClusterId(clusterId) {
  if (typeof clusterId !== 'string' || !clusterId.trim()) {
    throw new Error('clusterId must be a non-empty string.');
  }

  return clusterId.trim();
}

function ensureSectionId(sectionId) {
  if (typeof sectionId !== 'string' || !ALLOWED_ACTIVE_SECTIONS.has(sectionId)) {
    throw new Error(`sectionId must be one of: ${Array.from(ALLOWED_ACTIVE_SECTIONS).join(', ')}`);
  }

  return sectionId;
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

function initialWorkspaceInteractionState() {
  return {
    selected_cluster_id: null,
    drawer_state: 'closed',
    drawer_cluster_id: null,
    active_section: 'clusters',
    expanded_cluster_ids: [],
  };
}

function selectCluster(state, clusterId) {
  const currentState = ensureState(state);
  const safeClusterId = ensureClusterId(clusterId);

  return {
    ...currentState,
    selected_cluster_id: safeClusterId,
  };
}

function openEvidenceDrawer(state, clusterId) {
  const currentState = ensureState(state);
  const safeClusterId = ensureClusterId(clusterId);

  return {
    ...currentState,
    selected_cluster_id: safeClusterId,
    drawer_state: 'open',
    drawer_cluster_id: safeClusterId,
  };
}

function closeEvidenceDrawer(state) {
  const currentState = ensureState(state);

  return {
    ...currentState,
    drawer_state: 'closed',
    drawer_cluster_id: null,
  };
}

function toggleClusterExpanded(state, clusterId) {
  const currentState = ensureState(state);
  const safeClusterId = ensureClusterId(clusterId);
  const expandedClusterIds = Array.isArray(currentState.expanded_cluster_ids)
    ? currentState.expanded_cluster_ids
    : [];
  const nextExpandedClusterIds = expandedClusterIds.includes(safeClusterId)
    ? expandedClusterIds.filter((id) => id !== safeClusterId)
    : uniqueStrings([...expandedClusterIds, safeClusterId]);

  return {
    ...currentState,
    expanded_cluster_ids: nextExpandedClusterIds,
  };
}

function setActiveSection(state, sectionId) {
  const currentState = ensureState(state);
  const safeSectionId = ensureSectionId(sectionId);

  return {
    ...currentState,
    active_section: safeSectionId,
  };
}

module.exports = {
  initialWorkspaceInteractionState,
  selectCluster,
  openEvidenceDrawer,
  closeEvidenceDrawer,
  toggleClusterExpanded,
  setActiveSection,
};
