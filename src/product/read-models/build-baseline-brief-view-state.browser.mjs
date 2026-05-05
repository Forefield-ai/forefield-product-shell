const SECTION_ORDER = Object.freeze([
  'direct_support',
  'weak_support',
  'trend_context',
  'competitive_context',
  'professional_context',
  'counter_evidence',
  'discovery_leads',
]);

const SECTION_TITLES = Object.freeze({
  direct_support: 'Direct Support',
  weak_support: 'Weak Support',
  trend_context: 'Trend Context',
  competitive_context: 'Competitive Context',
  professional_context: 'Professional Context',
  counter_evidence: 'Counter Evidence',
  discovery_leads: 'Discovery Leads',
});

const SEMANTIC_CAVEATS = Object.freeze([
  'Discovery leads are not evidence yet.',
  'Trend context does not prove user demand.',
  'Competitive/vendor context does not prove user demand by itself.',
  'Direct evidence count only includes Direct Support.',
  'Counter evidence is preserved separately from direct support.',
]);

const URL_PATTERN = /https?:\/\/\S+/gi;

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeString(value, maxLength = 520) {
  return String(value || '')
    .replace(URL_PATTERN, '[redacted reference]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeStringArray(value, maxItems = 12, maxLength = 220) {
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

function uniqueStrings(values) {
  return normalizeStringArray(values, values.length || 12, 260);
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getDrawerForCluster(evidenceDrawersByClusterId, workspaceViewState, clusterId) {
  if (isPlainObject(evidenceDrawersByClusterId?.[clusterId])) {
    return evidenceDrawersByClusterId[clusterId];
  }

  const selectedDrawer = workspaceViewState?.selected_evidence_drawer;
  const selectedClusterId = selectedDrawer?.signal_cluster_ref?.signal_cluster_id;

  return selectedClusterId === clusterId ? selectedDrawer : null;
}

function sectionById(drawerState, sectionId) {
  return arr(drawerState?.grouped_evidence_sections).find(
    (section) => section?.section_id === sectionId
  ) || null;
}

function buildClusterBrief(clusterSection, drawerState) {
  const groupedSummary = drawerState?.grouped_evidence_summary || null;
  const counterSection = sectionById(drawerState, 'counter_evidence');
  const discoverySection = sectionById(drawerState, 'discovery_leads');
  const fallbackEvidenceCount = arr(drawerState?.evidence_items).length || Number(clusterSection.evidence_count || 0);

  return {
    clusterId: normalizeString(clusterSection.cluster_id, 160),
    title: normalizeString(clusterSection.headline || 'Untitled signal cluster', 180),
    summary: normalizeString(clusterSection.summary, 520),
    reviewLabel: normalizeString(clusterSection?.confidence_display?.label, 80),
    directEvidenceCount: groupedSummary
      ? Number(groupedSummary.direct_evidence_count || 0)
      : fallbackEvidenceCount,
    counterEvidenceCount: counterSection ? Number(counterSection.count || 0) : 0,
    discoveryLeadCount: discoverySection ? Number(discoverySection.count || 0) : 0,
    totalGroupedEvidenceCount: groupedSummary
      ? Number(groupedSummary.total_grouped_evidence_count || 0)
      : fallbackEvidenceCount,
    hasGroupedEvidence: Boolean(groupedSummary?.has_grouped_evidence),
    fallbackMode: !groupedSummary?.has_grouped_evidence,
    caveats: normalizeStringArray([
      ...arr(clusterSection.limitations),
      ...arr(groupedSummary?.evidence_caveats),
    ], 10, 220),
  };
}

function normalizeHighlightItem(item) {
  return {
    label: normalizeString(item?.label || 'Evidence highlight', 120),
    summary: normalizeString(item?.summary, 520),
    caveats: normalizeStringArray(item?.caveats, 6, 180),
  };
}

function buildFallbackDirectSupportSection(clusterBrief, drawerState) {
  const items = arr(drawerState?.evidence_items)
    .map((item, index) => normalizeHighlightItem({
      label: item?.label || `Direct Support ${index + 1}`,
      summary: item?.summary,
      caveats: [],
    }))
    .filter((item) => item.summary);

  if (!items.length) {
    return null;
  }

  return {
    sectionId: 'direct_support',
    title: SECTION_TITLES.direct_support,
    clusterId: clusterBrief.clusterId,
    clusterTitle: clusterBrief.title,
    isDirectEvidence: true,
    caveatLabel: 'Counts only as v0.2 flat evidence fallback.',
    items,
    count: items.length,
    fallbackMode: true,
  };
}

function buildEvidenceHighlightsForCluster(clusterBrief, drawerState) {
  const groupedSections = arr(drawerState?.grouped_evidence_sections);

  if (!groupedSections.length) {
    const fallbackSection = buildFallbackDirectSupportSection(clusterBrief, drawerState);
    return fallbackSection ? [fallbackSection] : [];
  }

  return SECTION_ORDER.map((sectionId) => {
    const section = groupedSections.find((entry) => entry?.section_id === sectionId);
    const items = arr(section?.items)
      .map(normalizeHighlightItem)
      .filter((item) => item.summary);

    if (!items.length) {
      return null;
    }

    return {
      sectionId,
      title: normalizeString(section?.title || SECTION_TITLES[sectionId], 120),
      clusterId: clusterBrief.clusterId,
      clusterTitle: clusterBrief.title,
      isDirectEvidence: sectionId === 'direct_support',
      caveatLabel: normalizeString(section?.caveat_label, 180),
      items,
      count: items.length,
      fallbackMode: false,
    };
  }).filter(Boolean);
}

function summarizeBaselineBriefSections(briefViewState) {
  const highlights = arr(briefViewState?.evidenceHighlights);
  const countsBySection = SECTION_ORDER.reduce((accumulator, sectionId) => {
    accumulator[sectionId] = 0;
    return accumulator;
  }, {});

  highlights.forEach((section) => {
    if (section?.sectionId && Object.prototype.hasOwnProperty.call(countsBySection, section.sectionId)) {
      countsBySection[section.sectionId] += Number(section.count || 0);
    }
  });

  return {
    cluster_count: arr(briefViewState?.clusterBriefs).length,
    evidence_highlight_count: highlights.reduce((sum, section) => sum + Number(section.count || 0), 0),
    direct_evidence_count: countsBySection.direct_support,
    counter_evidence_count: countsBySection.counter_evidence,
    discovery_lead_count: countsBySection.discovery_leads,
    counts_by_section: countsBySection,
  };
}

function renderBullet(label, value) {
  const safeValue = normalizeString(value, 700);

  return safeValue ? `- ${label}: ${safeValue}` : '';
}

function buildBaselineBriefMarkdown(briefViewState = {}) {
  const lines = [];
  const topicSummary = briefViewState.topicSummary || {};
  const reviewOutcome = briefViewState.reviewOutcome || {};
  const clusterBriefs = arr(briefViewState.clusterBriefs);
  const evidenceHighlights = arr(briefViewState.evidenceHighlights);
  const caveats = arr(briefViewState.caveats);

  lines.push('# Baseline Brief');
  lines.push('');
  lines.push('## Topic');
  lines.push(renderBullet('Topic name', topicSummary.topicName || 'Current topic'));
  lines.push(renderBullet('Topic summary', topicSummary.summary));
  lines.push(renderBullet('Monitoring intent', topicSummary.monitoringIntent));
  lines.push('');

  lines.push('## Review Summary');
  lines.push(renderBullet('Outcome', reviewOutcome.summary || 'Current review snapshot is available.'));
  lines.push(renderBullet('Generated from', briefViewState.generatedFrom?.label || 'TopicWorkspace view state'));
  lines.push(renderBullet('Grouped evidence mode', briefViewState.hasGroupedEvidence ? 'Grouped evidence available as additive intake.' : 'Using v0.2 flat evidence fallback.'));
  lines.push('');

  lines.push('## Key Signal Clusters');
  if (clusterBriefs.length) {
    clusterBriefs.forEach((cluster) => {
      lines.push(`### ${normalizeString(cluster.title, 180) || 'Signal cluster'}`);
      lines.push(renderBullet('Summary', cluster.summary));
      lines.push(renderBullet('Review label', cluster.reviewLabel));
      lines.push(renderBullet('Direct evidence count', String(Number(cluster.directEvidenceCount || 0))));
      lines.push(renderBullet('Counter evidence count', String(Number(cluster.counterEvidenceCount || 0))));
      lines.push(renderBullet('Discovery lead count', String(Number(cluster.discoveryLeadCount || 0))));
      if (arr(cluster.caveats).length) {
        lines.push(renderBullet('Caveats', cluster.caveats.join('; ')));
      }
      lines.push('');
    });
  } else {
    lines.push('- No signal clusters are available for this brief.');
    lines.push('');
  }

  lines.push('## Evidence Highlights');
  if (evidenceHighlights.length) {
    SECTION_ORDER.forEach((sectionId) => {
      const sections = evidenceHighlights.filter((section) => section.sectionId === sectionId);

      if (!sections.length) {
        return;
      }

      lines.push(`### ${SECTION_TITLES[sectionId]}`);
      sections.forEach((section) => {
        lines.push(`- ${normalizeString(section.clusterTitle, 180)}`);
        arr(section.items).forEach((item) => {
          lines.push(`  - ${normalizeString(item.summary, 520)}`);
        });
        if (section.caveatLabel) {
          lines.push(`  - Caveat: ${normalizeString(section.caveatLabel, 180)}`);
        }
      });
      lines.push('');
    });
  } else {
    lines.push('- No evidence highlights are available for this brief.');
    lines.push('');
  }

  lines.push('## Caveats');
  caveats.forEach((caveat) => {
    lines.push(`- ${normalizeString(caveat, 260)}`);
  });

  return lines
    .filter((line) => line !== '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function buildBaselineBriefViewState({
  workspaceViewState,
  evidenceDrawersByClusterId = {},
  briefState = null,
} = {}) {
  if (!isPlainObject(workspaceViewState)) {
    throw new Error('buildBaselineBriefViewState requires workspaceViewState.');
  }

  const topicDraftSummary = workspaceViewState.topic_draft_summary || {};
  const reviewSnapshot = briefState?.sections?.review_snapshot || {};
  const clusterSections = arr(workspaceViewState.signal_cluster_sections);
  const clusterBriefs = [];
  const evidenceHighlights = [];

  clusterSections.forEach((clusterSection) => {
    const clusterId = clusterSection?.cluster_id;
    const drawerState = getDrawerForCluster(evidenceDrawersByClusterId, workspaceViewState, clusterId);
    const clusterBrief = buildClusterBrief(clusterSection, drawerState);

    clusterBriefs.push(clusterBrief);
    evidenceHighlights.push(...buildEvidenceHighlightsForCluster(clusterBrief, drawerState));
  });

  const hasGroupedEvidence = clusterBriefs.some((cluster) => cluster.hasGroupedEvidence);
  const sectionSummary = summarizeBaselineBriefSections({
    clusterBriefs,
    evidenceHighlights,
  });
  const counterEvidenceItems = evidenceHighlights
    .filter((section) => section.sectionId === 'counter_evidence')
    .flatMap((section) => arr(section.items).map((item) => ({
      clusterTitle: section.clusterTitle,
      summary: item.summary,
    })));
  const discoveryLeadCount = sectionSummary.discovery_lead_count;
  const caveats = uniqueStrings([
    ...SEMANTIC_CAVEATS,
    ...arr(workspaceViewState?.limitations_and_caveats?.workspace_limitations),
    ...clusterBriefs.flatMap((cluster) => cluster.caveats),
  ]);
  const baseState = {
    briefTitle: 'Baseline Brief',
    topicSummary: {
      topicName: normalizeString(topicDraftSummary.title || 'Current topic', 180),
      summary: normalizeString(topicDraftSummary.summary, 520),
      monitoringIntent: normalizeString(topicDraftSummary.monitoring_intent || ''),
    },
    reviewOutcome: {
      summary: normalizeString(
        reviewSnapshot.summary
          || `Current review includes ${pluralize(clusterBriefs.length, 'signal cluster')}.`,
        700
      ),
      signalClusterCount: Number(workspaceViewState?.review_summary?.signal_cluster_count || clusterBriefs.length),
      directEvidenceCount: sectionSummary.direct_evidence_count,
      counterEvidenceCount: sectionSummary.counter_evidence_count,
      discoveryLeadCount,
    },
    generatedFrom: {
      kind: 'topic_workspace_view_state',
      label: 'TopicWorkspace view state and grouped evidence read-model',
      handoffVersion: normalizeString(workspaceViewState?.workspace_header?.handoff_version, 120),
    },
    clusterBriefs,
    evidenceHighlights,
    counterEvidenceSummary: {
      count: counterEvidenceItems.length,
      items: counterEvidenceItems,
      preserved: counterEvidenceItems.length > 0,
    },
    discoveryLeadNote: {
      count: discoveryLeadCount,
      label: 'Discovery leads are follow-up leads, not evidence yet.',
    },
    caveats,
    hasGroupedEvidence,
    fallbackMode: !hasGroupedEvidence,
    sectionSummary,
  };
  const markdown = buildBaselineBriefMarkdown(baseState);

  return {
    ...baseState,
    markdown,
    copyableMarkdown: markdown,
  };
}

export {
  buildBaselineBriefMarkdown,
  buildBaselineBriefViewState,
  summarizeBaselineBriefSections,
};
