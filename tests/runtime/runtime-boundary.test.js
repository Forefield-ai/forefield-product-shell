const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  PROHIBITED_RUNTIME_FIELDS,
  assertCanonicalRuntimePayload,
  assertNoProhibitedRuntimeFields,
} = require('../../src/runtime/contracts/runtime-adapter-contract');
const { createLocalRuntimeAdapter } = require('../../src/runtime/adapters/local-runtime-adapter');

function collectRuntimeFiles(dirPath) {
  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const nextPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      return collectRuntimeFiles(nextPath);
    }

    return nextPath.endsWith('.js') ? [nextPath] : [];
  });
}

test('assertNoProhibitedRuntimeFields catches prohibited fields recursively', () => {
  assert.throws(
    () => assertNoProhibitedRuntimeFields({
      topic: {
        signal_clusters: [
          {
            id: 'signal_cluster_rt__privacy',
            raw_refs: ['forbidden'],
          },
        ],
      },
    }),
    /prohibited fields/i
  );
});

test('assertCanonicalRuntimePayload accepts normal product-facing payload', () => {
  const payload = {
    id: 'topic_rt__demo',
    workspace_id: 'demo_workspace',
    topic_name: 'Privacy Complaints Monitoring',
    saved_items: [
      {
        id: 'saved_item_rt__cluster',
        saved_type: 'cluster',
        status: 'active',
      },
    ],
  };

  assert.equal(assertCanonicalRuntimePayload(payload), payload);
});

test('runtime adapter files do not import decision-core source', () => {
  const runtimeFiles = collectRuntimeFiles(path.join(__dirname, '../../src/runtime'));

  runtimeFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    assert.equal(/require\((['"`]).*decision-core.*\1\)/i.test(source), false, `Unexpected decision-core import in ${filePath}`);
    assert.equal(/from\s+['"`].*decision-core.*['"`]/i.test(source), false, `Unexpected decision-core import in ${filePath}`);
  });
});

test('runtime adapter files do not import API/fetch/storage', () => {
  const runtimeFiles = collectRuntimeFiles(path.join(__dirname, '../../src/runtime'));

  runtimeFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');

    assert.equal(/\bfetch\s*\(/.test(source), false, `Unexpected fetch usage in ${filePath}`);
    assert.equal(/\blocalStorage\b/.test(source), false, `Unexpected localStorage usage in ${filePath}`);
    assert.equal(/\bsessionStorage\b/.test(source), false, `Unexpected sessionStorage usage in ${filePath}`);
  });
});

test('runtime adapter does not expose DecisionCoreBoundaryHandoff', () => {
  const adapter = createLocalRuntimeAdapter();
  const draft = adapter.topics.createTopicDraft('Track recurring privacy complaints');
  const topic = adapter.topics.confirmTopicDraft(draft, { now: '2026-04-27T21:00:00.000Z' });
  const run = adapter.runs.startInitialReview(topic.id, { now: '2026-04-27T21:00:00.000Z' });
  const workspace = adapter.workspace.getTopicWorkspace(topic.id);
  const actionState = adapter.actions.watchCluster(topic.id, 'signal_cluster_rt__privacy', {
    now: '2026-04-27T21:01:00.000Z',
  });

  [draft, topic, run, workspace, actionState].forEach((payload) => {
    assertNoProhibitedRuntimeFields(payload);
  });

  assert.equal(PROHIBITED_RUNTIME_FIELDS.includes('DecisionCoreBoundaryHandoff'), true);
});
