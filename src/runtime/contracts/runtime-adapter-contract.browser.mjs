const PROHIBITED_RUNTIME_FIELDS = Object.freeze([
  'DecisionCoreBoundaryHandoff',
  'OpportunitySet',
  'OpportunityCard',
  'OpportunityScore',
  'ClaimTrace',
  'raw_refs',
  'raw_trace_refs',
  'opportunity_score',
  'claim_candidate_id',
  'internal_decision_core',
  'decision_band',
  'claim_id',
  'opportunity_id',
]);

const RUNTIME_MODES = Object.freeze({
  LOCAL: 'local',
  FIXTURE: 'fixture',
  API: 'api',
});

function collectProhibitedFieldPaths(value, path = 'payload', hits = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      collectProhibitedFieldPaths(entry, `${path}[${index}]`, hits);
    });

    return hits;
  }

  if (!value || typeof value !== 'object') {
    return hits;
  }

  Object.keys(value).forEach((key) => {
    const nextPath = `${path}.${key}`;

    if (PROHIBITED_RUNTIME_FIELDS.includes(key)) {
      hits.push(nextPath);
    }

    collectProhibitedFieldPaths(value[key], nextPath, hits);
  });

  return hits;
}

function assertNoProhibitedRuntimeFields(payload) {
  const hits = collectProhibitedFieldPaths(payload);

  if (hits.length) {
    throw new Error(`Runtime payload contains prohibited fields: ${hits.join(', ')}`);
  }

  return payload;
}

function assertCanonicalRuntimePayload(payload) {
  if (payload === null || payload === undefined) {
    throw new Error('Runtime payload must not be null or undefined.');
  }

  if (typeof payload !== 'object') {
    throw new Error('Runtime payload must be an object or array.');
  }

  return assertNoProhibitedRuntimeFields(payload);
}

export {
  PROHIBITED_RUNTIME_FIELDS,
  RUNTIME_MODES,
  assertCanonicalRuntimePayload,
  assertNoProhibitedRuntimeFields,
};
