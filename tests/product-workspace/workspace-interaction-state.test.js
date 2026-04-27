const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('../../fixtures/product/workspace-interaction-state.sample.json');
const {
  initialWorkspaceInteractionState,
  selectCluster,
  openEvidenceDrawer,
  closeEvidenceDrawer,
  toggleClusterExpanded,
  setActiveSection,
} = require('../../src/product/workspace/workspace-interaction-state');

const SAMPLE_CLUSTER_ID = 'signal_cluster_ps__bundle-cross-source-demand-opportunities__r1';
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

test('initial state has drawer_state "closed"', () => {
  assert.equal(initialWorkspaceInteractionState().drawer_state, 'closed');
});

test('initial state has selected_cluster_id null', () => {
  assert.equal(initialWorkspaceInteractionState().selected_cluster_id, null);
});

test('initial state has drawer_cluster_id null', () => {
  assert.equal(initialWorkspaceInteractionState().drawer_cluster_id, null);
});

test('selectCluster sets selected_cluster_id', () => {
  const state = selectCluster(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  assert.equal(state.selected_cluster_id, SAMPLE_CLUSTER_ID);
});

test('selectCluster does not open drawer', () => {
  const state = selectCluster(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  assert.equal(state.drawer_state, 'closed');
});

test('selectCluster does not set drawer_cluster_id', () => {
  const state = selectCluster(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  assert.equal(state.drawer_cluster_id, null);
});

test('openEvidenceDrawer sets drawer_state "open"', () => {
  const state = openEvidenceDrawer(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  assert.equal(state.drawer_state, 'open');
});

test('openEvidenceDrawer sets drawer_cluster_id', () => {
  const state = openEvidenceDrawer(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  assert.equal(state.drawer_cluster_id, SAMPLE_CLUSTER_ID);
});

test('openEvidenceDrawer also sets selected_cluster_id', () => {
  const state = openEvidenceDrawer(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  assert.equal(state.selected_cluster_id, SAMPLE_CLUSTER_ID);
});

test('closeEvidenceDrawer closes drawer', () => {
  const opened = openEvidenceDrawer(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  const closed = closeEvidenceDrawer(opened);
  assert.equal(closed.drawer_state, 'closed');
});

test('closeEvidenceDrawer clears drawer_cluster_id', () => {
  const opened = openEvidenceDrawer(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  const closed = closeEvidenceDrawer(opened);
  assert.equal(closed.drawer_cluster_id, null);
});

test('closeEvidenceDrawer preserves selected_cluster_id', () => {
  const opened = openEvidenceDrawer(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  const closed = closeEvidenceDrawer(opened);
  assert.equal(closed.selected_cluster_id, SAMPLE_CLUSTER_ID);
});

test('toggleClusterExpanded expands a cluster', () => {
  const state = toggleClusterExpanded(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  assert.deepEqual(state.expanded_cluster_ids, [SAMPLE_CLUSTER_ID]);
});

test('toggleClusterExpanded collapses a cluster', () => {
  const expanded = toggleClusterExpanded(initialWorkspaceInteractionState(), SAMPLE_CLUSTER_ID);
  const collapsed = toggleClusterExpanded(expanded, SAMPLE_CLUSTER_ID);
  assert.deepEqual(collapsed.expanded_cluster_ids, []);
});

test('setActiveSection accepts summary / clusters / evidence', () => {
  assert.equal(setActiveSection(initialWorkspaceInteractionState(), 'summary').active_section, 'summary');
  assert.equal(setActiveSection(initialWorkspaceInteractionState(), 'clusters').active_section, 'clusters');
  assert.equal(setActiveSection(initialWorkspaceInteractionState(), 'evidence').active_section, 'evidence');
});

test('setActiveSection rejects invalid section', () => {
  assert.throws(
    () => setActiveSection(initialWorkspaceInteractionState(), 'invalid'),
    /sectionId must be one of/i
  );
});

test('invalid cluster id throws clear error', () => {
  assert.throws(
    () => selectCluster(initialWorkspaceInteractionState(), ''),
    /clusterId must be a non-empty string/i
  );
  assert.throws(
    () => openEvidenceDrawer(initialWorkspaceInteractionState(), ''),
    /clusterId must be a non-empty string/i
  );
  assert.throws(
    () => toggleClusterExpanded(initialWorkspaceInteractionState(), ''),
    /clusterId must be a non-empty string/i
  );
});

test('helpers do not mutate input state', () => {
  const initialState = initialWorkspaceInteractionState();
  const initialSnapshot = JSON.stringify(initialState);

  selectCluster(initialState, SAMPLE_CLUSTER_ID);
  openEvidenceDrawer(initialState, SAMPLE_CLUSTER_ID);
  closeEvidenceDrawer(initialState);
  toggleClusterExpanded(initialState, SAMPLE_CLUSTER_ID);
  setActiveSection(initialState, 'summary');

  assert.equal(JSON.stringify(initialState), initialSnapshot);
});

test('fixture snapshots match expected helper outputs', () => {
  const initialState = initialWorkspaceInteractionState();
  const afterSelectCluster = selectCluster(initialState, SAMPLE_CLUSTER_ID);
  const afterOpenEvidenceDrawer = openEvidenceDrawer(afterSelectCluster, SAMPLE_CLUSTER_ID);
  const afterCloseEvidenceDrawer = closeEvidenceDrawer(afterOpenEvidenceDrawer);
  const afterToggleClusterExpanded = toggleClusterExpanded(initialState, SAMPLE_CLUSTER_ID);
  const afterSetActiveSection = setActiveSection(initialState, 'evidence');

  assert.deepEqual(fixture.initial_state, initialState);
  assert.deepEqual(fixture.after_select_cluster, afterSelectCluster);
  assert.deepEqual(fixture.after_open_evidence_drawer, afterOpenEvidenceDrawer);
  assert.deepEqual(fixture.after_close_evidence_drawer, afterCloseEvidenceDrawer);
  assert.deepEqual(fixture.after_toggle_cluster_expanded, afterToggleClusterExpanded);
  assert.deepEqual(fixture.after_set_active_section, afterSetActiveSection);
});

test('prohibited decision-core fields are absent', () => {
  const states = [
    fixture.initial_state,
    fixture.after_select_cluster,
    fixture.after_open_evidence_drawer,
    fixture.after_close_evidence_drawer,
    fixture.after_toggle_cluster_expanded,
    fixture.after_set_active_section,
  ];

  states.forEach((state) => {
    const keys = collectKeys(state);
    keys.forEach((key) => {
      assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
    });
  });
});
