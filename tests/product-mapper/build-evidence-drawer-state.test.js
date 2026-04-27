const test = require('node:test');
const assert = require('node:assert/strict');

const handoffFixture = require('../../fixtures/external/decision-core/decision-core-boundary-handoff.sample.json');
const drawerFixture = require('../../fixtures/product/evidence-drawer-state.sample.json');
const {
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
  'decision_band',
  'internal_decision_core',
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

test('builds evidence drawer state for one signal cluster', () => {
  const mapped = mapDecisionCoreHandoffToProductMainline(handoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const drawerState = buildEvidenceDrawerState({
    topicDraft: mapped.topic_draft,
    signalCluster: mapped.signal_clusters[0],
    curatedEvidenceRecords: mapped.curated_evidence_records,
  });

  assert.ok(drawerState.display_summary);
  assert.ok(Array.isArray(drawerState.evidence_items));
  assert.ok(Array.isArray(drawerState.source_links));
  assert.equal(
    drawerState.signal_cluster_ref.signal_cluster_id,
    mapped.signal_clusters[0].id
  );
  assert.equal(
    drawerState.evidence_items.every((item) =>
      mapped.curated_evidence_records.some((record) => record.id === item.curated_evidence_record_id)
    ),
    true
  );
});

test('drawer state includes only evidence records for the selected cluster', () => {
  const mapped = mapDecisionCoreHandoffToProductMainline(handoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const drawerState = buildEvidenceDrawerState({
    topicDraft: mapped.topic_draft,
    signalCluster: mapped.signal_clusters[0],
    curatedEvidenceRecords: mapped.curated_evidence_records,
  });

  assert.equal(
    drawerState.evidence_items.length,
    mapped.curated_evidence_records.filter(
      (record) => record.signal_cluster_id === mapped.signal_clusters[0].id
    ).length
  );
});

test('drawer state does not contain prohibited keys', () => {
  const mapped = mapDecisionCoreHandoffToProductMainline(handoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const drawerState = buildEvidenceDrawerState({
    topicDraft: mapped.topic_draft,
    signalCluster: mapped.signal_clusters[0],
    curatedEvidenceRecords: mapped.curated_evidence_records,
  });
  const keys = collectKeys(drawerState);

  keys.forEach((key) => {
    assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key in drawer state: ${key}`);
  });
});

test('drawer state matches the fixture with fixed sample input', () => {
  const mapped = mapDecisionCoreHandoffToProductMainline(handoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const drawerState = buildEvidenceDrawerState({
    topicDraft: mapped.topic_draft,
    signalCluster: mapped.signal_clusters[0],
    curatedEvidenceRecords: mapped.curated_evidence_records,
  });

  assert.deepEqual(drawerState, drawerFixture);
});
