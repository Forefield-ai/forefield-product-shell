const test = require('node:test');
const assert = require('node:assert/strict');

const richHandoffFixture = require('../../fixtures/external/decision-core/rich-decision-core-boundary-handoff.sample.json');
const richProductMainlineFixture = require('../../fixtures/product/rich-product-mainline.sample.json');
const richEvidenceDrawerStatesFixture = require('../../fixtures/product/rich-evidence-drawer-states.sample.json');
const {
  mapDecisionCoreHandoffToProductMainline,
} = require('../../src/product/mappers/map-decision-core-handoff-to-product-mainline');
const {
  buildEvidenceDrawerState,
} = require('../../src/product/read-models/build-evidence-drawer-state');

const FIXED_IMPORTED_AT = '2026-01-01T00:00:00.000Z';
const PROHIBITED_KEYS = new Set([
  'OpportunitySet',
  'OpportunityCard',
  'OpportunityScore',
  'ClaimTrace',
  'opportunity_score',
  'raw_refs',
  'raw_trace_refs',
  'claim_candidate_id',
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

function buildDrawerStatesByCluster(mainline) {
  return Object.fromEntries(
    mainline.signal_clusters.map((signalCluster) => [
      signalCluster.id,
      buildEvidenceDrawerState({
        topicDraft: mainline.topic_draft,
        signalCluster,
        curatedEvidenceRecords: mainline.curated_evidence_records,
      }),
    ])
  );
}

test('rich external handoff fixture loads', () => {
  assert.ok(richHandoffFixture);
  assert.ok(Array.isArray(richHandoffFixture.ranked_entries));
  assert.ok(richHandoffFixture.ranked_entries.length >= 2);
});

test('mapper output matches rich product golden fixture with fixed importedAt', () => {
  const mapped = mapDecisionCoreHandoffToProductMainline(richHandoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });

  assert.deepEqual(mapped, richProductMainlineFixture);
});

test('drawer states built from mapper output match rich drawer golden fixture', () => {
  const mapped = mapDecisionCoreHandoffToProductMainline(richHandoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const drawerStates = buildDrawerStatesByCluster(mapped);

  assert.deepEqual(drawerStates, richEvidenceDrawerStatesFixture);
});

test('rich product golden fixture contains multiple clusters and multiple public source refs', () => {
  assert.ok(richProductMainlineFixture.signal_clusters.length > 1);
  assert.ok(richProductMainlineFixture.curated_evidence_records.length > 1);
  assert.ok(
    richProductMainlineFixture.curated_evidence_records.some(
      (record) => Array.isArray(record.public_source_refs) && record.public_source_refs.length === 1
    )
  );
});

test('every drawer state is scoped to its own signal cluster', () => {
  Object.entries(richEvidenceDrawerStatesFixture).forEach(([signalClusterId, drawerState]) => {
    const relevantEvidence = richProductMainlineFixture.curated_evidence_records.filter(
      (record) => record.signal_cluster_id === signalClusterId
    );

    assert.equal(drawerState.signal_cluster_ref.signal_cluster_id, signalClusterId);
    assert.equal(drawerState.evidence_items.length, relevantEvidence.length);
    assert.deepEqual(
      drawerState.source_links,
      relevantEvidence.flatMap((record) => record.public_source_refs)
    );
    assert.equal(
      drawerState.evidence_items.every((item) =>
        relevantEvidence.some((record) => record.id === item.curated_evidence_record_id)
      ),
      true
    );
  });
});

test('prohibited fields are absent from rich golden fixtures', () => {
  [richProductMainlineFixture, richEvidenceDrawerStatesFixture].forEach((value) => {
    const keys = collectKeys(value);

    keys.forEach((key) => {
      assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
    });
  });
});

test('confirmed Topic is not created by default', () => {
  assert.equal(Object.prototype.hasOwnProperty.call(richProductMainlineFixture, 'topic'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(richProductMainlineFixture, 'confirmed_topic'), false);
});

test('internal_decision_core and decision_band are not present in rich product golden fixtures', () => {
  const mainlineKeys = collectKeys(richProductMainlineFixture);
  const drawerKeys = collectKeys(richEvidenceDrawerStatesFixture);

  ['internal_decision_core', 'decision_band', 'review_priority'].forEach((key) => {
    assert.equal(mainlineKeys.includes(key), false, `Unexpected key in mainline fixture: ${key}`);
    assert.equal(drawerKeys.includes(key), false, `Unexpected key in drawer fixtures: ${key}`);
  });
});
