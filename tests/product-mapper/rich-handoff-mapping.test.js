const test = require('node:test');
const assert = require('node:assert/strict');

const richHandoffFixture = require('../../fixtures/external/decision-core/rich-decision-core-boundary-handoff.sample.json');
const {
  SUPPORTED_HANDOFF_VERSIONS,
  mapDecisionCoreHandoffToProductMainline,
} = require('../../src/product/mappers/map-decision-core-handoff-to-product-mainline');
const {
  buildEvidenceDrawerState,
} = require('../../src/product/read-models/build-evidence-drawer-state');

const FIXED_IMPORTED_AT = '2026-04-27T00:00:00Z';
const PROHIBITED_KEYS = new Set([
  'OpportunitySet',
  'OpportunityCard',
  'OpportunityScore',
  'ClaimTrace',
  'opportunity_score',
  'raw_refs',
  'raw_trace_refs',
  'claim_candidate_id',
  'analysis_packets',
  'corroboration_record',
  'support_entries',
  'contradiction_entries',
  'weak_context_entries',
  'internal_decision_core',
  'decision_band',
  'claim_id',
  'opportunity_id',
  'review_priority',
]);

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, keys));
    return keys;
  }

  if (!value || typeof value !== 'object') {
    return keys;
  }

  Object.keys(value).forEach((key) => {
    keys.push(key);
    collectKeys(value[key], keys);
  });

  return keys;
}

function collectProductIds(mainline) {
  return [
    mainline.monitoring_run.id,
    mainline.topic_draft.id,
    ...mainline.signal_clusters.map((cluster) => cluster.id),
    ...mainline.curated_evidence_records.map((record) => record.id),
  ];
}

function countPublicSourceRefs(handoff) {
  return handoff.ranked_entries.reduce((sum, entry) => {
    const refs = Array.isArray(entry?.provenance?.public_source_refs)
      ? entry.provenance.public_source_refs.filter((ref) => /^https?:\/\//i.test(ref))
      : [];

    return sum + refs.length;
  }, 0);
}

function findDecisionCoreInternalValues(handoff) {
  return handoff.ranked_entries
    .flatMap((entry) => [
      entry?.internal_decision_core?.decision_core_refs?.claim_id,
      entry?.internal_decision_core?.decision_core_refs?.opportunity_id,
    ])
    .filter(Boolean);
}

test('rich fixture loads, uses a supported handoff version, and has multiple ranked entries', () => {
  assert.ok(richHandoffFixture);
  assert.equal(
    SUPPORTED_HANDOFF_VERSIONS.has(richHandoffFixture.handoff_version),
    true
  );
  assert.ok(richHandoffFixture.ranked_entry_count >= 2);
  assert.ok(Array.isArray(richHandoffFixture.ranked_entries));
  assert.equal(richHandoffFixture.ranked_entries.length, richHandoffFixture.ranked_entry_count);
});

test('mapper handles multiple ranked entries and maps one evidence record per public source ref', () => {
  const mainline = mapDecisionCoreHandoffToProductMainline(richHandoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });

  assert.ok(mainline.monitoring_run);
  assert.ok(mainline.topic_draft);
  assert.equal(mainline.signal_clusters.length, richHandoffFixture.ranked_entries.length);
  assert.equal(
    mainline.curated_evidence_records.length,
    countPublicSourceRefs(richHandoffFixture)
  );
});

test('generated ids remain product-owned and do not expose decision-core internal ids', () => {
  const mainline = mapDecisionCoreHandoffToProductMainline(richHandoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const ids = collectProductIds(mainline);
  const internalValues = findDecisionCoreInternalValues(richHandoffFixture);

  ids.forEach((id) => {
    assert.match(id, /_ps__/);
    internalValues.forEach((internalValue) => {
      assert.equal(id.includes(internalValue), false, `Product id leaked internal id: ${internalValue}`);
    });
    assert.equal(id.includes('claim:'), false);
    assert.equal(id.includes('opportunity:'), false);
  });
});

test('each public source ref becomes a curated evidence record with only public refs', () => {
  const mainline = mapDecisionCoreHandoffToProductMainline(richHandoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });

  mainline.curated_evidence_records.forEach((record) => {
    assert.ok(Array.isArray(record.public_source_refs));
    assert.equal(record.public_source_refs.length, 1);
    record.public_source_refs.forEach((ref) => {
      assert.match(ref, /^https?:\/\//);
      assert.equal(/^artifact:\/\//i.test(ref), false);
      assert.equal(/^dataset:\/\//i.test(ref), false);
      assert.equal(/^source_execution:/i.test(ref), false);
      assert.equal(/^source_item:/i.test(ref), false);
    });
  });
});

test('internal_decision_core is ignored by product output', () => {
  const mainline = mapDecisionCoreHandoffToProductMainline(richHandoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const serialized = JSON.stringify(mainline);
  const keys = collectKeys(mainline);

  ['internal_decision_core', 'decision_band', 'claim_id', 'opportunity_id', 'review_priority'].forEach((key) => {
    assert.equal(keys.includes(key), false, `Unexpected key in product output: ${key}`);
  });

  findDecisionCoreInternalValues(richHandoffFixture).forEach((value) => {
    assert.equal(serialized.includes(value), false, `Unexpected internal decision-core value in output: ${value}`);
  });
});

test('drawer state scopes evidence and source links per cluster', () => {
  const mainline = mapDecisionCoreHandoffToProductMainline(richHandoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });

  const clusterOne = mainline.signal_clusters[0];
  const clusterTwo = mainline.signal_clusters[1];
  const drawerOne = buildEvidenceDrawerState({
    topicDraft: mainline.topic_draft,
    signalCluster: clusterOne,
    curatedEvidenceRecords: mainline.curated_evidence_records,
  });
  const drawerTwo = buildEvidenceDrawerState({
    topicDraft: mainline.topic_draft,
    signalCluster: clusterTwo,
    curatedEvidenceRecords: mainline.curated_evidence_records,
  });

  const clusterOneEvidence = mainline.curated_evidence_records.filter(
    (record) => record.signal_cluster_id === clusterOne.id
  );
  const clusterTwoEvidence = mainline.curated_evidence_records.filter(
    (record) => record.signal_cluster_id === clusterTwo.id
  );

  assert.equal(drawerOne.evidence_items.length, clusterOneEvidence.length);
  assert.equal(drawerTwo.evidence_items.length, clusterTwoEvidence.length);
  assert.deepEqual(
    drawerOne.source_links,
    clusterOneEvidence.flatMap((record) => record.public_source_refs)
  );
  assert.deepEqual(
    drawerTwo.source_links,
    clusterTwoEvidence.flatMap((record) => record.public_source_refs)
  );
  assert.equal(
    drawerOne.evidence_items.every((item) =>
      clusterOneEvidence.some((record) => record.id === item.curated_evidence_record_id)
    ),
    true
  );
  assert.equal(
    drawerTwo.evidence_items.every((item) =>
      clusterTwoEvidence.some((record) => record.id === item.curated_evidence_record_id)
    ),
    true
  );
});

test('no prohibited fields appear in rich mapper output or drawer states', () => {
  const mainline = mapDecisionCoreHandoffToProductMainline(richHandoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const drawerStates = mainline.signal_clusters.map((signalCluster) =>
    buildEvidenceDrawerState({
      topicDraft: mainline.topic_draft,
      signalCluster,
      curatedEvidenceRecords: mainline.curated_evidence_records,
    })
  );

  [mainline, ...drawerStates].forEach((value) => {
    const keys = collectKeys(value);

    keys.forEach((key) => {
      assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
    });
  });
});
