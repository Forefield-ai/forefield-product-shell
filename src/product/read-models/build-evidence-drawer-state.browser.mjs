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

function buildDrawerEvidenceItemId(curatedEvidenceRecord, index) {
  if (
    typeof curatedEvidenceRecord.id === 'string'
    && curatedEvidenceRecord.id.startsWith('curated_evidence_record_')
  ) {
    return curatedEvidenceRecord.id.replace(
      'curated_evidence_record_',
      'drawer_evidence_item_'
    );
  }

  return `drawer_evidence_item_${index + 1}`;
}

function buildEvidenceDrawerState({ topicDraft, signalCluster, curatedEvidenceRecords }) {
  if (!topicDraft || typeof topicDraft !== 'object') {
    throw new Error('buildEvidenceDrawerState requires topicDraft.');
  }

  if (!signalCluster || typeof signalCluster !== 'object') {
    throw new Error('buildEvidenceDrawerState requires signalCluster.');
  }

  if (!Array.isArray(curatedEvidenceRecords)) {
    throw new Error('buildEvidenceDrawerState requires curatedEvidenceRecords array.');
  }

  const relevantEvidenceRecords = curatedEvidenceRecords.filter(
    (record) => record && record.signal_cluster_id === signalCluster.id
  );

  const evidenceItems = relevantEvidenceRecords.map((record, index) => ({
    id: buildDrawerEvidenceItemId(record, index),
    curated_evidence_record_id: record.id,
    label: `Public source ${index + 1}`,
    url: Array.isArray(record.public_source_refs) ? record.public_source_refs[0] : undefined,
    summary: record.summary,
  }));

  return {
    topic_ref: {
      topic_draft_id: topicDraft.id,
    },
    signal_cluster_ref: {
      signal_cluster_id: signalCluster.id,
    },
    display_summary: {
      headline: signalCluster.headline,
      summary: signalCluster.summary,
    },
    confidence_display: signalCluster.confidence_display,
    limitations: signalCluster.limitations,
    source_links: uniqueStrings(
      relevantEvidenceRecords.flatMap((record) =>
        Array.isArray(record.public_source_refs) ? record.public_source_refs : []
      )
    ),
    evidence_items: evidenceItems,
  };
}

export {
  buildEvidenceDrawerState,
};
