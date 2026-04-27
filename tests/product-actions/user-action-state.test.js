const test = require('node:test');
const assert = require('node:assert/strict');

const userActionState = require('../../src/product/actions/user-action-state');

const {
  getActiveSavedItems,
  getSavedClusters,
  getSavedEvidence,
  hideCluster,
  initialActionState,
  isClusterHidden,
  isClusterSaved,
  isClusterWatched,
  isEvidenceSaved,
  saveCluster,
  saveEvidence,
  undoHideCluster,
  unsaveCluster,
  unsaveEvidence,
  unwatchCluster,
  watchCluster,
} = userActionState;

const SAMPLE_TOPIC_ID = 'local_topic__privacy-demand-monitoring__20260427120000';
const SAMPLE_CLUSTER_ID = 'signal_cluster_ps__bundle-cross-source-demand-opportunities__r1';
const SAMPLE_EVIDENCE_ID = 'curated_evidence_record_ps__bundle-cross-source-demand-opportunities__r1__s1';
const FIXED_NOW = '2026-04-27T12:00:00.000Z';
const PROHIBITED_KEYS = new Set([
  'DecisionCoreBoundaryHandoff',
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

function saveSampleCluster(state, now = FIXED_NOW) {
  return saveCluster(state, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
    titleSnapshot: 'Trust and coverage concerns are recurring',
    summarySnapshot: 'People want better ways to verify whether this cluster looks credible.',
    sourceLinksSnapshot: ['https://example.com/cluster-source'],
  }, { now });
}

function saveSampleEvidence(state, now = FIXED_NOW) {
  return saveEvidence(state, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
    evidenceId: SAMPLE_EVIDENCE_ID,
    titleSnapshot: 'Evidence item 1',
    summarySnapshot: 'A public source that reinforces the cluster signal.',
    sourceLinksSnapshot: ['https://example.com/evidence-source'],
  }, { now });
}

test('initialActionState returns empty userActions, savedItems, watchedClustersById, hiddenClustersById', () => {
  assert.deepEqual(initialActionState(), {
    userActions: [],
    savedItems: [],
    watchedClustersById: {},
    hiddenClustersById: {},
  });
});

test('watchCluster adds watched state and user action', () => {
  const state = watchCluster(initialActionState(), {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: FIXED_NOW });

  assert.equal(state.userActions.length, 1);
  assert.equal(state.userActions[0].action_type, 'watch_cluster');
  assert.match(state.userActions[0].id, /^local_action__/);
  assert.equal(state.watchedClustersById[SAMPLE_CLUSTER_ID].status, 'active');
  assert.equal(isClusterWatched(state, SAMPLE_CLUSTER_ID), true);
});

test('unwatchCluster marks watched state removed and adds reverse user action', () => {
  const watchedState = watchCluster(initialActionState(), {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: FIXED_NOW });
  const state = unwatchCluster(watchedState, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: '2026-04-27T12:01:00.000Z' });

  assert.equal(state.userActions.length, 2);
  assert.equal(state.userActions[1].action_type, 'unwatch_cluster');
  assert.equal(state.watchedClustersById[SAMPLE_CLUSTER_ID].status, 'removed');
  assert.equal(isClusterWatched(state, SAMPLE_CLUSTER_ID), false);
});

test('saveCluster creates active SavedItem type cluster', () => {
  const state = saveSampleCluster(initialActionState());
  const savedCluster = getSavedClusters(state)[0];

  assert.equal(state.userActions[0].action_type, 'save_cluster');
  assert.equal(savedCluster.saved_type, 'cluster');
  assert.equal(savedCluster.source_object_id, SAMPLE_CLUSTER_ID);
  assert.equal(savedCluster.status, 'active');
  assert.match(savedCluster.id, /^local_saved_item__/);
  assert.equal(isClusterSaved(state, SAMPLE_CLUSTER_ID), true);
});

test('unsaveCluster marks SavedItem removed and adds reverse user action', () => {
  const savedState = saveSampleCluster(initialActionState());
  const state = unsaveCluster(savedState, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: '2026-04-27T12:01:00.000Z' });

  assert.equal(state.userActions[1].action_type, 'unsave_cluster');
  assert.equal(state.savedItems[0].status, 'removed');
  assert.equal(isClusterSaved(state, SAMPLE_CLUSTER_ID), false);
});

test('saveEvidence creates active SavedItem type evidence and preserves cluster_id', () => {
  const state = saveSampleEvidence(initialActionState());
  const savedEvidence = getSavedEvidence(state)[0];

  assert.equal(state.userActions[0].action_type, 'save_evidence');
  assert.equal(savedEvidence.saved_type, 'evidence');
  assert.equal(savedEvidence.source_object_id, SAMPLE_EVIDENCE_ID);
  assert.equal(savedEvidence.cluster_id, SAMPLE_CLUSTER_ID);
  assert.equal(isEvidenceSaved(state, SAMPLE_EVIDENCE_ID), true);
});

test('unsaveEvidence marks SavedItem removed', () => {
  const savedState = saveSampleEvidence(initialActionState());
  const state = unsaveEvidence(savedState, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
    evidenceId: SAMPLE_EVIDENCE_ID,
  }, { now: '2026-04-27T12:01:00.000Z' });

  assert.equal(state.userActions[1].action_type, 'unsave_evidence');
  assert.equal(state.savedItems[0].status, 'removed');
  assert.equal(isEvidenceSaved(state, SAMPLE_EVIDENCE_ID), false);
});

test('hideCluster marks cluster hidden and adds user action', () => {
  const state = hideCluster(initialActionState(), {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: FIXED_NOW });

  assert.equal(state.userActions[0].action_type, 'hide_cluster');
  assert.equal(state.hiddenClustersById[SAMPLE_CLUSTER_ID].status, 'hidden');
  assert.equal(isClusterHidden(state, SAMPLE_CLUSTER_ID), true);
});

test('undoHideCluster restores visibility and adds reverse user action', () => {
  const hiddenState = hideCluster(initialActionState(), {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: FIXED_NOW });
  const state = undoHideCluster(hiddenState, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: '2026-04-27T12:01:00.000Z' });

  assert.equal(state.userActions[1].action_type, 'undo_hide_cluster');
  assert.equal(state.hiddenClustersById[SAMPLE_CLUSTER_ID].status, 'visible');
  assert.equal(isClusterHidden(state, SAMPLE_CLUSTER_ID), false);
});

test('hiding a saved cluster does not remove saved item', () => {
  const savedState = saveSampleCluster(initialActionState());
  const hiddenState = hideCluster(savedState, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: '2026-04-27T12:01:00.000Z' });

  assert.equal(isClusterSaved(hiddenState, SAMPLE_CLUSTER_ID), true);
  assert.equal(getSavedClusters(hiddenState).length, 1);
});

test('hiding a watched cluster does not remove watched state', () => {
  const watchedState = watchCluster(initialActionState(), {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: FIXED_NOW });
  const hiddenState = hideCluster(watchedState, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: '2026-04-27T12:01:00.000Z' });

  assert.equal(isClusterWatched(hiddenState, SAMPLE_CLUSTER_ID), true);
  assert.equal(hiddenState.watchedClustersById[SAMPLE_CLUSTER_ID].status, 'active');
});

test('helpers do not mutate input state', () => {
  const state = initialActionState();
  const snapshot = JSON.stringify(state);

  watchCluster(state, { localTopicId: SAMPLE_TOPIC_ID, clusterId: SAMPLE_CLUSTER_ID }, { now: FIXED_NOW });
  saveSampleCluster(state);
  saveSampleEvidence(state);
  hideCluster(state, { localTopicId: SAMPLE_TOPIC_ID, clusterId: SAMPLE_CLUSTER_ID }, { now: FIXED_NOW });

  assert.equal(JSON.stringify(state), snapshot);
});

test('invalid ids throw clear errors', () => {
  assert.throws(
    () => watchCluster(initialActionState(), { localTopicId: '', clusterId: SAMPLE_CLUSTER_ID }),
    /localTopicId must be a non-empty string/i
  );
  assert.throws(
    () => watchCluster(initialActionState(), { localTopicId: SAMPLE_TOPIC_ID, clusterId: '' }),
    /clusterId must be a non-empty string/i
  );
  assert.throws(
    () => saveEvidence(initialActionState(), {
      localTopicId: SAMPLE_TOPIC_ID,
      clusterId: SAMPLE_CLUSTER_ID,
      evidenceId: '',
    }),
    /evidenceId must be a non-empty string/i
  );
});

test('getActiveSavedItems excludes removed saved items', () => {
  const savedState = saveSampleCluster(initialActionState());
  const removedState = unsaveCluster(savedState, {
    localTopicId: SAMPLE_TOPIC_ID,
    clusterId: SAMPLE_CLUSTER_ID,
  }, { now: '2026-04-27T12:01:00.000Z' });

  assert.equal(getActiveSavedItems(removedState).length, 0);
});

test('getSavedClusters returns only active cluster saves', () => {
  const withCluster = saveSampleCluster(initialActionState());
  const withEvidence = saveSampleEvidence(withCluster);

  assert.equal(getSavedClusters(withEvidence).length, 1);
  assert.equal(getSavedClusters(withEvidence)[0].saved_type, 'cluster');
});

test('getSavedEvidence returns only active evidence saves', () => {
  const withCluster = saveSampleCluster(initialActionState());
  const withEvidence = saveSampleEvidence(withCluster);

  assert.equal(getSavedEvidence(withEvidence).length, 1);
  assert.equal(getSavedEvidence(withEvidence)[0].saved_type, 'evidence');
});

test('View Evidence is not part of action reducer API', () => {
  assert.equal('viewEvidence' in userActionState, false);
  assert.equal('recordViewEvidence' in userActionState, false);
});

test('prohibited decision-core fields are absent', () => {
  const state = undoHideCluster(
    saveSampleEvidence(
      saveSampleCluster(
        watchCluster(initialActionState(), {
          localTopicId: SAMPLE_TOPIC_ID,
          clusterId: SAMPLE_CLUSTER_ID,
        }, { now: FIXED_NOW })
      )
    ),
    {
      localTopicId: SAMPLE_TOPIC_ID,
      clusterId: SAMPLE_CLUSTER_ID,
    },
    { now: '2026-04-27T12:01:00.000Z' }
  );
  const keys = collectKeys(state);

  keys.forEach((key) => {
    assert.equal(PROHIBITED_KEYS.has(key), false, `Unexpected prohibited key found: ${key}`);
  });
});
