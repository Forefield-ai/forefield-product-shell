const DEFAULT_SIGNAL_FOCUS = [
  'pain_point',
  'unmet_need',
  'workaround',
  'competitor_dissatisfaction',
  'switching_signal',
  'emerging_use_case',
];

function ensureInput(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('generateLocalTopicDraftFromInput requires a non-empty input string.');
  }

  return input.trim();
}

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createTopicName(trimmedInput) {
  const normalized = trimmedInput.replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  const candidate = normalized.length > 72
    ? `${normalized.slice(0, 69).trim()}...`
    : normalized;

  return toTitleCase(candidate);
}

function inferTargetAudience(trimmedInput) {
  const lowerInput = trimmedInput.toLowerCase();

  if (/(developer|engineer|technical)/i.test(lowerInput)) {
    return 'Developers and technical teams';
  }

  if (/(marketing|marketer|growth)/i.test(lowerInput)) {
    return 'Marketing and growth teams';
  }

  if (/(sales|seller|revenue)/i.test(lowerInput)) {
    return 'Revenue and go-to-market teams';
  }

  if (/(founder|startup|small team|smaller team)/i.test(lowerInput)) {
    return 'Founders and lean operating teams';
  }

  if (/(community|creator|customer support)/i.test(lowerInput)) {
    return 'Community, support, and customer-facing teams';
  }

  return 'Product, research, and operations teams';
}

function createProblemSpace(topicName) {
  return `Track recurring demand, friction, and alternatives around ${topicName.toLowerCase()}.`;
}

function createMonitoringIntent(topicName) {
  return `Use this local demo topic to monitor whether recurring public demand around "${topicName}" looks strong enough for an initial review workspace.`;
}

function createTopicSummary(topicName) {
  return `Local demo draft for "${topicName}". This summary is generated from your input with a deterministic template and does not represent live research.`;
}

function inferCompetitorsAlternatives(trimmedInput) {
  const matches = trimmedInput.match(/\bvs\.?\s+([^.!,;]+)/i);

  if (!matches || !matches[1]) {
    return [];
  }

  return matches[1]
    .split(/,|\/| and /i)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function generateLocalTopicDraftFromInput(input) {
  const trimmedInput = ensureInput(input);
  const topicName = createTopicName(trimmedInput);

  return {
    original_input: trimmedInput,
    topic_summary: createTopicSummary(topicName),
    topic_name: topicName,
    target_audience: inferTargetAudience(trimmedInput),
    problem_space: createProblemSpace(topicName),
    monitoring_intent: createMonitoringIntent(topicName),
    signal_focus: [...DEFAULT_SIGNAL_FOCUS],
    competitors_alternatives: inferCompetitorsAlternatives(trimmedInput),
  };
}

module.exports = {
  DEFAULT_SIGNAL_FOCUS,
  generateLocalTopicDraftFromInput,
};
