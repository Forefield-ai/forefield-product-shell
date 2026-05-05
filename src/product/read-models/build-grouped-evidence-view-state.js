const GROUPED_EVIDENCE_SECTION_ORDER = Object.freeze([
  'direct_support',
  'counter_evidence',
  'weak_support',
  'trend_context',
  'competitive_context',
  'professional_context',
  'discovery_leads',
]);

const GROUPED_EVIDENCE_SECTION_CONFIG = Object.freeze({
  direct_support: {
    title: 'Direct Support',
    role_description: 'Evidence that may directly support the selected signal.',
    is_direct_evidence: true,
    default_expanded: true,
    caveat_label: 'Counts only when marked as direct support.',
  },
  counter_evidence: {
    title: 'Counter Evidence',
    role_description: 'Evidence that weakens, contradicts, or qualifies the selected signal.',
    is_direct_evidence: false,
    default_expanded: true,
    caveat_label: 'Preserved separately and not counted as direct support.',
  },
  weak_support: {
    title: 'Weak Support',
    role_description: 'Directional or reaction-level support that needs stronger corroboration.',
    is_direct_evidence: false,
    default_expanded: false,
    caveat_label: 'Contextual support only.',
  },
  trend_context: {
    title: 'Trend Context',
    role_description: 'Trend or attention context around the selected signal.',
    is_direct_evidence: false,
    default_expanded: false,
    caveat_label: 'Trend context is not direct evidence.',
  },
  competitive_context: {
    title: 'Competitive Context',
    role_description: 'Vendor, competitor, or alternative context related to the signal.',
    is_direct_evidence: false,
    default_expanded: false,
    caveat_label: 'Competitive context is not user demand evidence.',
  },
  professional_context: {
    title: 'Professional Context',
    role_description: 'Professional or workplace context that may inform interpretation.',
    is_direct_evidence: false,
    default_expanded: false,
    caveat_label: 'Professional context is not direct evidence by default.',
  },
  discovery_leads: {
    title: 'Discovery Leads',
    role_description: 'Follow-up leads that may point to discussions to inspect later.',
    is_direct_evidence: false,
    default_expanded: false,
    caveat_label: 'Follow-up leads, not evidence yet.',
  },
});

const FORBIDDEN_GROUPED_EVIDENCE_KEYS = Object.freeze([
  'api_key',
  'author_id',
  'chain_of_thought',
  'domain_identifier',
  'private_id',
  'profile_id',
  'profile_url',
  'prompt',
  'provider_response',
  'raw_forum_text',
  'raw_provider_response',
  'raw_snippet',
  'raw_source_payload',
  'raw_source_text',
  'raw_text',
  'source_url',
  'target_url',
  'url',
]);

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeString(value, maxLength = 320) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeStringArray(value, maxItems = 12, maxLength = 180) {
  const seen = new Set();

  return arr(value)
    .map((entry) => normalizeString(entry, maxLength))
    .filter(Boolean)
    .filter((entry) => {
      const key = entry.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasForbiddenKey(value) {
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenKey(item));
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Object.entries(value).some(([key, entry]) => (
    FORBIDDEN_GROUPED_EVIDENCE_KEYS.includes(key) || hasForbiddenKey(entry)
  ));
}

function hasForbiddenValue(value) {
  if (typeof value === 'string') {
    return /https?:\/\//i.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenValue(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((entry) => hasForbiddenValue(entry));
  }

  return false;
}

function isSafeGroupedEvidenceItem(item) {
  return isPlainObject(item) && !hasForbiddenKey(item) && !hasForbiddenValue(item);
}

function normalizeGroupedEvidenceItem(item, sectionId, index) {
  if (!isSafeGroupedEvidenceItem(item)) {
    return null;
  }

  const config = GROUPED_EVIDENCE_SECTION_CONFIG[sectionId];
  const itemId = normalizeString(
    item.item_id
      || item.grouped_evidence_item_id
      || item.evidence_item_id
      || item.contribution_id
      || `${sectionId}_${index + 1}`,
    160
  );
  const summary = normalizeString(
    item.summary
      || item.contribution_summary
      || item.description
      || item.safe_summary,
    420
  );

  if (!summary) {
    return null;
  }

  return {
    id: itemId || `${sectionId}_${index + 1}`,
    label: normalizeString(item.label || `${config.title} ${index + 1}`, 120),
    summary,
    source_family: normalizeString(item.source_family, 80),
    source_role: normalizeString(item.source_role, 80),
    support_role: normalizeString(item.support_role, 80),
    confidence_label: normalizeString(item.confidence_label || item.confidence, 80),
    counts_toward_direct_evidence: sectionId === 'direct_support'
      && item.counts_toward_direct_evidence === true,
    caveats: normalizeStringArray(item.caveats, 8, 180),
  };
}

function getGroupedEvidence(signalCluster) {
  if (!isPlainObject(signalCluster)) {
    return null;
  }

  if (isPlainObject(signalCluster.grouped_evidence)) {
    return signalCluster.grouped_evidence;
  }

  if (isPlainObject(signalCluster.grouped_evidence_sections)) {
    return signalCluster.grouped_evidence_sections;
  }

  return null;
}

function buildFallbackDirectSupportItems(curatedEvidenceRecords) {
  return arr(curatedEvidenceRecords)
    .filter((record) => isPlainObject(record))
    .map((record, index) => ({
      id: normalizeString(record.id || `fallback_direct_support_${index + 1}`, 160),
      label: `Public source ${index + 1}`,
      summary: normalizeString(record.summary || 'No summary is available for this source yet.', 420),
      source_family: normalizeString(record.source_platform, 80),
      source_role: '',
      support_role: 'direct_support',
      confidence_label: normalizeString(record.confidence_display?.label, 80),
      counts_toward_direct_evidence: true,
      caveats: normalizeStringArray(record.limitations, 8, 180),
    }));
}

function buildGroupedEvidenceSections(groupedEvidence, fallbackItems = []) {
  return GROUPED_EVIDENCE_SECTION_ORDER.map((sectionId) => {
    const config = GROUPED_EVIDENCE_SECTION_CONFIG[sectionId];
    const rawItems = sectionId === 'direct_support' && !groupedEvidence
      ? fallbackItems
      : arr(groupedEvidence?.[sectionId]);
    const items = rawItems
      .map((item, index) => normalizeGroupedEvidenceItem(item, sectionId, index))
      .filter(Boolean);

    return {
      section_id: sectionId,
      title: config.title,
      role_description: config.role_description,
      items,
      count: items.length,
      is_direct_evidence: config.is_direct_evidence,
      default_expanded: config.default_expanded,
      caveat_label: config.caveat_label,
    };
  });
}

function buildGroupedEvidenceViewState({ signalCluster, curatedEvidenceRecords = [] } = {}) {
  if (!isPlainObject(signalCluster)) {
    throw new Error('buildGroupedEvidenceViewState requires signalCluster.');
  }

  const groupedEvidence = getGroupedEvidence(signalCluster);
  const hasGroupedEvidence = isPlainObject(groupedEvidence);
  const relevantEvidenceRecords = arr(curatedEvidenceRecords).filter(
    (record) => record && record.signal_cluster_id === signalCluster.id
  );
  const fallbackDirectSupportItems = hasGroupedEvidence
    ? []
    : buildFallbackDirectSupportItems(relevantEvidenceRecords);
  const groupedEvidenceSections = buildGroupedEvidenceSections(
    hasGroupedEvidence ? groupedEvidence : null,
    fallbackDirectSupportItems
  );
  const directEvidenceSection = groupedEvidenceSections.find(
    (section) => section.section_id === 'direct_support'
  );
  const directEvidenceCount = arr(directEvidenceSection?.items).filter(
    (item) => item.counts_toward_direct_evidence === true
  ).length;
  const totalGroupedEvidenceCount = groupedEvidenceSections.reduce(
    (sum, section) => sum + section.count,
    0
  );

  return {
    groupedEvidenceSections,
    directEvidenceCount,
    totalGroupedEvidenceCount,
    hasGroupedEvidence,
    fallbackMode: !hasGroupedEvidence,
    evidenceCaveats: normalizeStringArray([
      ...(Array.isArray(signalCluster.grouped_evidence_caveats) ? signalCluster.grouped_evidence_caveats : []),
      ...(hasGroupedEvidence ? [] : ['Using v0.2 flat evidence fallback.']),
    ], 12, 180),
  };
}

module.exports = {
  GROUPED_EVIDENCE_SECTION_CONFIG,
  GROUPED_EVIDENCE_SECTION_ORDER,
  buildGroupedEvidenceViewState,
};
