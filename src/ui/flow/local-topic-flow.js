const SCREEN_IDS = {
  HOME: 'home',
  TOPIC_DRAFT_GENERATION: 'topic_draft_generation',
  TOPIC_DRAFT_CONFIRMATION: 'topic_draft_confirmation',
  BASELINE_BUILDING: 'baseline_building',
  TOPIC_WORKSPACE: 'topic_workspace',
  TOPIC_LIST: 'topic_list',
};

const TOPIC_STATUSES = {
  DRAFT: 'draft',
  BUILDING: 'building',
  READY: 'ready',
};

const DRAFT_GENERATION_STAGES = [
  'Understanding your intent',
  'Structuring your Topic',
  'Preparing Topic Draft',
];

const BASELINE_BUILDING_STAGES = [
  'Mapping the discussion space',
  'Collecting public conversations',
  'Extracting demand signals',
  'Validating recurring patterns',
  'Preparing your Initial Topic Map',
];

const LOCAL_BASELINE_SCENARIO_KEYS = {
  DEFAULT: 'default',
  FAILED: 'baseline_failed',
  STUCK: 'baseline_stuck',
};

const LOCAL_BASELINE_SCENARIOS = Object.freeze({
  [LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT]: Object.freeze({
    key: LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT,
    outcome: 'success',
    terminal_stage_index: BASELINE_BUILDING_STAGES.length - 1,
    auto_complete: true,
  }),
  [LOCAL_BASELINE_SCENARIO_KEYS.FAILED]: Object.freeze({
    key: LOCAL_BASELINE_SCENARIO_KEYS.FAILED,
    outcome: 'failed',
    terminal_stage_index: BASELINE_BUILDING_STAGES.length - 1,
    auto_complete: false,
  }),
  [LOCAL_BASELINE_SCENARIO_KEYS.STUCK]: Object.freeze({
    key: LOCAL_BASELINE_SCENARIO_KEYS.STUCK,
    outcome: 'stuck',
    terminal_stage_index: Math.max(BASELINE_BUILDING_STAGES.length - 2, 0),
    auto_complete: false,
  }),
});

function ensureDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new Error('Local topic flow requires a draft object.');
  }

  if (typeof draft.topic_name !== 'string' || !draft.topic_name.trim()) {
    throw new Error('Local topic draft requires a non-empty topic_name.');
  }

  if (typeof draft.original_input !== 'string' || !draft.original_input.trim()) {
    throw new Error('Local topic draft requires a non-empty original_input.');
  }

  return draft;
}

function ensureFixtureKey(fixtureKey) {
  if (typeof fixtureKey !== 'string' || !fixtureKey.trim()) {
    throw new Error('Local topic flow requires a non-empty fixtureKey.');
  }

  return fixtureKey.trim();
}

function ensureStatus(status) {
  const values = Object.values(TOPIC_STATUSES);

  if (typeof status !== 'string' || !values.includes(status)) {
    throw new Error(`Local topic status must be one of: ${values.join(', ')}`);
  }

  return status;
}

function normalizeBaselineStageIndex(index) {
  if (!Number.isInteger(index)) {
    return 0;
  }

  if (index < 0) {
    return 0;
  }

  const maxIndex = Math.max(BASELINE_BUILDING_STAGES.length - 1, 0);

  if (index > maxIndex) {
    return maxIndex;
  }

  return index;
}

function getLocalBaselineScenario(fixtureKey) {
  if (typeof fixtureKey === 'string' && fixtureKey.trim()) {
    const normalizedFixtureKey = fixtureKey.trim();

    if (Object.prototype.hasOwnProperty.call(LOCAL_BASELINE_SCENARIOS, normalizedFixtureKey)) {
      return LOCAL_BASELINE_SCENARIOS[normalizedFixtureKey];
    }
  }

  return LOCAL_BASELINE_SCENARIOS[LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT];
}

function resolveNextBaselineStageIndex({ currentStageIndex = 0, fixtureKey } = {}) {
  const scenario = getLocalBaselineScenario(fixtureKey);
  const safeStageIndex = normalizeBaselineStageIndex(currentStageIndex);
  const terminalStageIndex = normalizeBaselineStageIndex(scenario.terminal_stage_index);

  if (safeStageIndex < terminalStageIndex) {
    return safeStageIndex + 1;
  }

  return safeStageIndex;
}

function shouldAutoCompleteBaselineBuild({ currentStageIndex = 0, fixtureKey } = {}) {
  const scenario = getLocalBaselineScenario(fixtureKey);
  const safeStageIndex = normalizeBaselineStageIndex(currentStageIndex);
  const terminalStageIndex = normalizeBaselineStageIndex(scenario.terminal_stage_index);

  return Boolean(scenario.auto_complete) && safeStageIndex >= terminalStageIndex;
}

function slugifyTopicIdPart(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'topic';
}

function createLocalTopicRecord({
  draft,
  fixtureKey,
  status = TOPIC_STATUSES.DRAFT,
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
  id,
} = {}) {
  const safeDraft = ensureDraft(draft);
  const safeFixtureKey = ensureFixtureKey(fixtureKey);
  const safeStatus = ensureStatus(status);
  const safeCreatedAt = typeof createdAt === 'string' && createdAt.trim()
    ? createdAt
    : new Date().toISOString();
  const safeUpdatedAt = typeof updatedAt === 'string' && updatedAt.trim()
    ? updatedAt
    : safeCreatedAt;
  const safeId = id || `local_topic__${slugifyTopicIdPart(safeDraft.topic_name)}__${safeCreatedAt.replace(/[^0-9]/g, '').slice(0, 14)}`;

  return {
    id: safeId,
    originalInput: safeDraft.original_input,
    draft: safeDraft,
    status: safeStatus,
    fixtureKey: safeFixtureKey,
    createdAt: safeCreatedAt,
    updatedAt: safeUpdatedAt,
  };
}

function updateLocalTopicRecord(topicRecord, patch = {}, updatedAt = new Date().toISOString()) {
  if (!topicRecord || typeof topicRecord !== 'object' || Array.isArray(topicRecord)) {
    throw new Error('updateLocalTopicRecord requires a topic record object.');
  }

  const nextTopic = {
    ...topicRecord,
    ...patch,
    updatedAt,
  };

  if (patch.draft) {
    ensureDraft(patch.draft);
    nextTopic.originalInput = patch.draft.original_input;
  }

  if (patch.fixtureKey) {
    nextTopic.fixtureKey = ensureFixtureKey(patch.fixtureKey);
  }

  if (patch.status) {
    nextTopic.status = ensureStatus(patch.status);
  }

  return nextTopic;
}

function updateLocalTopicStatus(topicRecord, status, updatedAt = new Date().toISOString()) {
  return updateLocalTopicRecord(topicRecord, { status }, updatedAt);
}

module.exports = {
  SCREEN_IDS,
  TOPIC_STATUSES,
  DRAFT_GENERATION_STAGES,
  BASELINE_BUILDING_STAGES,
  LOCAL_BASELINE_SCENARIO_KEYS,
  getLocalBaselineScenario,
  resolveNextBaselineStageIndex,
  shouldAutoCompleteBaselineBuild,
  createLocalTopicRecord,
  updateLocalTopicRecord,
  updateLocalTopicStatus,
};
