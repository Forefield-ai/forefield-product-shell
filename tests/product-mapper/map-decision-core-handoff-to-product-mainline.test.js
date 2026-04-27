const test = require('node:test');
const assert = require('node:assert/strict');

const handoffFixture = require('../../fixtures/external/decision-core/decision-core-boundary-handoff.sample.json');
const productFixture = require('../../fixtures/product/product-mainline.sample.json');
const {
  mapDecisionCoreHandoffToProductMainline,
} = require('../../src/product/mappers/map-decision-core-handoff-to-product-mainline');

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

test('external handoff fixture loads and maps to product mainline objects', () => {
  const output = mapDecisionCoreHandoffToProductMainline(handoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });

  assert.ok(output.monitoring_run);
  assert.ok(output.topic_draft);
  assert.ok(Array.isArray(output.signal_clusters));
  assert.ok(Array.isArray(output.curated_evidence_records));
  assert.equal(output.monitoring_run.source_bundle_id, handoffFixture.bundle_id);
  assert.equal(output.monitoring_run.handoff_version, handoffFixture.handoff_version);
  assert.equal(output.monitoring_run.imported_at, FIXED_IMPORTED_AT);
  assert.equal(Object.prototype.hasOwnProperty.call(output, 'topic'), false);
  assert.match(output.monitoring_run.id, /^monitoring_run_ps__/);
  assert.match(output.topic_draft.id, /^topic_draft_ps__/);

  output.signal_clusters.forEach((cluster) => {
    assert.match(cluster.id, /^signal_cluster_ps__/);
    assert.ok(cluster.source_ranked_entry_ref);
    assert.ok(Array.isArray(cluster.curated_evidence_ids));
  });

  output.curated_evidence_records.forEach((record) => {
    assert.match(record.id, /^curated_evidence_record_ps__/);
    assert.ok(Array.isArray(record.public_source_refs));
    assert.equal(record.public_source_refs.length, 1);
    assert.match(record.public_source_refs[0], /^https?:\/\//);
  });
});

test('missing handoff_version throws a clear error', () => {
  const handoff = clone(handoffFixture);
  delete handoff.handoff_version;

  assert.throws(
    () => mapDecisionCoreHandoffToProductMainline(handoff, { importedAt: FIXED_IMPORTED_AT }),
    /handoff_version is required/i
  );
});

test('unknown handoff_version throws a clear error', () => {
  const handoff = clone(handoffFixture);
  handoff.handoff_version = '9.9.9-unknown';

  assert.throws(
    () => mapDecisionCoreHandoffToProductMainline(handoff, { importedAt: FIXED_IMPORTED_AT }),
    /unsupported/i
  );
});

test('mapped output does not contain prohibited keys', () => {
  const output = mapDecisionCoreHandoffToProductMainline(handoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });
  const keys = collectKeys(output);

  keys.forEach((key) => {
    assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key in output: ${key}`);
  });
});

test('mapped output matches the product mainline fixture with fixed importedAt', () => {
  const output = mapDecisionCoreHandoffToProductMainline(handoffFixture, {
    importedAt: FIXED_IMPORTED_AT,
  });

  assert.deepEqual(output, productFixture);
});
