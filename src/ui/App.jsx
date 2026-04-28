import React, { useRef, useState } from 'react';
import DebugFixtureSelector from './components/DebugFixtureSelector';
import HomePage from './pages/HomePage';
import TopicDraftGenerationPage from './pages/TopicDraftGenerationPage';
import TopicDraftPage from './pages/TopicDraftPage';
import BaselineBuildingPage from './pages/BaselineBuildingPage';
import TopicListPage from './pages/TopicListPage';
import TopicWorkspaceShellPage from './pages/TopicWorkspaceShellPage';
import minimalProductMainline from '../../fixtures/product/product-mainline.sample.json';
import richProductMainline from '../../fixtures/product/rich-product-mainline.sample.json';
import emptyProductMainline from '../../fixtures/product/empty-product-mainline.sample.json';
import sparseProductMainline from '../../fixtures/product/sparse-product-mainline.sample.json';
import noEvidenceProductMainline from '../../fixtures/product/no-evidence-product-mainline.sample.json';
import { createLocalRuntimeAdapter } from '../runtime/adapters/local-runtime-adapter.browser.mjs';
import { buildProductMainlineCompatibilityPayload } from '../runtime/workspace/local-workspace-payload.browser.mjs';
import { initialActionState } from '../product/actions/user-action-state.browser.mjs';
import {
  createLocalTopicRecord,
  LOCAL_BASELINE_SCENARIO_KEYS,
  SCREEN_IDS,
  TOPIC_STATUSES,
  updateLocalTopicRecord,
  updateLocalTopicStatus,
} from './flow/local-topic-flow.browser.mjs';

const PRODUCT_MAINLINE_FIXTURES = {
  minimal: minimalProductMainline,
  rich: richProductMainline,
  empty: emptyProductMainline,
  sparse: sparseProductMainline,
  no_evidence: noEvidenceProductMainline,
};

const FIXTURE_PREVIEW_LABELS = {
  rich: 'Rich review snapshot',
  minimal: 'Minimal review snapshot',
  empty: 'Empty review snapshot',
  sparse: 'Sparse review snapshot',
  no_evidence: 'No-evidence cluster',
};

const BASELINE_SCENARIO_LABELS = {
  [LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT]: 'standard local baseline path',
  [LOCAL_BASELINE_SCENARIO_KEYS.FAILED]: 'failed local baseline scenario',
  [LOCAL_BASELINE_SCENARIO_KEYS.STUCK]: 'stuck local baseline scenario',
};

function sortTopicSnapshots(topics) {
  return [...topics].sort((left, right) => {
    const leftUpdatedAt = typeof left?.updatedAt === 'string' ? left.updatedAt : '';
    const rightUpdatedAt = typeof right?.updatedAt === 'string' ? right.updatedAt : '';

    return rightUpdatedAt.localeCompare(leftUpdatedAt);
  });
}

function buildFallbackDraftFromTopic(adapterTopic, existingSnapshot) {
  const existingDraft = existingSnapshot?.draft;

  if (existingDraft && typeof existingDraft === 'object' && !Array.isArray(existingDraft)) {
    return existingDraft;
  }

  return {
    original_input: existingSnapshot?.originalInput || adapterTopic.topic_name,
    topic_summary: adapterTopic.topic_summary,
    topic_name: adapterTopic.topic_name,
    target_audience: '',
    problem_space: '',
    monitoring_intent: '',
    signal_focus: [],
    competitors_alternatives: [],
  };
}

function resolveAdapterTopicStatus(adapterTopic, existingSnapshot) {
  if (
    existingSnapshot?.status === TOPIC_STATUSES.READY
    && adapterTopic?.status === TOPIC_STATUSES.BUILDING
  ) {
    return existingSnapshot.status;
  }

  return adapterTopic?.status || existingSnapshot?.status || TOPIC_STATUSES.DRAFT;
}

function resolveAdapterTopicUpdatedAt(adapterTopic, existingSnapshot) {
  if (
    existingSnapshot?.status === TOPIC_STATUSES.READY
    && adapterTopic?.status === TOPIC_STATUSES.BUILDING
    && typeof existingSnapshot?.updatedAt === 'string'
    && existingSnapshot.updatedAt.trim()
  ) {
    return existingSnapshot.updatedAt;
  }

  return adapterTopic?.updated_at || existingSnapshot?.updatedAt || adapterTopic?.created_at;
}

export default function App() {
  const runtimeAdapterRef = useRef(null);
  const [selectedFixtureKey, setSelectedFixtureKey] = useState('rich');
  const [selectedBaselineScenarioKey, setSelectedBaselineScenarioKey] = useState(
    LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT
  );
  const [currentScreen, setCurrentScreen] = useState(SCREEN_IDS.HOME);
  const [currentInput, setCurrentInput] = useState('');
  const [currentTopicDraft, setCurrentTopicDraft] = useState(null);
  const [localTopics, setLocalTopics] = useState([]);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [topicActionStateById, setTopicActionStateById] = useState({});

  const activeTopic = localTopics.find((topic) => topic.id === activeTopicId) || null;
  const activeTopicFixtureKey = activeTopic?.fixtureKey || selectedFixtureKey;
  const activeProductMainline = PRODUCT_MAINLINE_FIXTURES[activeTopicFixtureKey] || richProductMainline;
  const activeTopicActionState = activeTopicId
    ? topicActionStateById[activeTopicId] || initialActionState()
    : initialActionState();
  const activeFixturePreviewLabel = FIXTURE_PREVIEW_LABELS[selectedFixtureKey] || FIXTURE_PREVIEW_LABELS.rich;
  const activeBaselineScenarioLabel = BASELINE_SCENARIO_LABELS[selectedBaselineScenarioKey]
    || BASELINE_SCENARIO_LABELS[LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT];
  const homeFixtureNoteLabel = selectedBaselineScenarioKey === LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT
    ? activeFixturePreviewLabel
    : `${activeFixturePreviewLabel} with ${activeBaselineScenarioLabel}`;

  if (!runtimeAdapterRef.current) {
    runtimeAdapterRef.current = createLocalRuntimeAdapter();
  }

  const runtimeAdapter = runtimeAdapterRef.current;

  const updateTopicById = (topicId, updater) => {
    setLocalTopics((currentTopics) => currentTopics.map((topic) => (
      topic.id === topicId ? updater(topic) : topic
    )));
  };

  const ensureTopicActionStateBucket = (topicId) => {
    if (typeof topicId !== 'string' || !topicId.trim()) {
      return;
    }

    setTopicActionStateById((currentStateById) => (
      currentStateById[topicId]
        ? currentStateById
        : {
          ...currentStateById,
          [topicId]: initialActionState(),
        }
    ));
  };

  const setTopicActionStateSnapshot = (topicId, nextActionState) => {
    if (typeof topicId !== 'string' || !topicId.trim()) {
      return;
    }

    setTopicActionStateById((currentStateById) => ({
      ...currentStateById,
      [topicId]: nextActionState,
    }));
  };

  const syncLocalTopicsFromAdapter = (currentTopics, fixtureKeyOverride = selectedFixtureKey) => {
    const topicsFromAdapter = runtimeAdapter.topics.listTopics();
    const currentTopicsById = currentTopics.reduce((accumulator, topic) => {
      accumulator[topic.id] = topic;
      return accumulator;
    }, {});
    const adapterTopicIds = new Set(topicsFromAdapter.map((topic) => topic.id));
    const pendingDraftTopics = currentTopics.filter((topic) => (
      topic.status === TOPIC_STATUSES.DRAFT && !adapterTopicIds.has(topic.id)
    ));
    const adapterBackedSnapshots = topicsFromAdapter.map((adapterTopic) => {
      const existingSnapshot = currentTopicsById[adapterTopic.id];
      const nextSnapshot = createLocalTopicRecord({
        draft: buildFallbackDraftFromTopic(adapterTopic, existingSnapshot),
        fixtureKey: existingSnapshot?.fixtureKey || fixtureKeyOverride,
        status: resolveAdapterTopicStatus(adapterTopic, existingSnapshot),
        createdAt: adapterTopic.created_at,
        updatedAt: resolveAdapterTopicUpdatedAt(adapterTopic, existingSnapshot),
        id: adapterTopic.id,
      });

      return {
        ...nextSnapshot,
        originalInput: existingSnapshot?.originalInput || nextSnapshot.originalInput,
        baselineScenarioKey: existingSnapshot?.baselineScenarioKey || selectedBaselineScenarioKey,
        runId: existingSnapshot?.runId || null,
        runtimeSource: 'adapter',
      };
    });

    return sortTopicSnapshots([...pendingDraftTopics, ...adapterBackedSnapshots]);
  };

  const handleCreateTopicDraft = (input) => {
    setCurrentInput(input);
    setCurrentTopicDraft(null);
    setActiveTopicId(null);
    setCurrentScreen(SCREEN_IDS.TOPIC_DRAFT_GENERATION);
  };

  const handleDraftGenerated = () => {
    const nextDraft = runtimeAdapter.topics.createTopicDraft(currentInput);
    const nextTopicRecord = createLocalTopicRecord({
      draft: nextDraft,
      fixtureKey: selectedFixtureKey,
      status: TOPIC_STATUSES.DRAFT,
    });
    const nextTopicSnapshot = {
      ...nextTopicRecord,
      baselineScenarioKey: selectedBaselineScenarioKey,
    };

    setCurrentTopicDraft(nextDraft);
    setActiveTopicId(nextTopicSnapshot.id);
    setLocalTopics((currentTopics) => [nextTopicSnapshot, ...currentTopics]);
    ensureTopicActionStateBucket(nextTopicSnapshot.id);
    setCurrentScreen(SCREEN_IDS.TOPIC_DRAFT_CONFIRMATION);
  };

  const handleDraftChange = (nextDraft) => {
    setCurrentTopicDraft(nextDraft);
    setCurrentInput(nextDraft.original_input);

    if (!activeTopicId) {
      return;
    }

    updateTopicById(activeTopicId, (topic) => updateLocalTopicRecord(topic, {
      draft: nextDraft,
    }));
  };

  const handleConfirmTopic = (draft) => {
    setCurrentTopicDraft(draft);
    setCurrentInput(draft.original_input);

    const currentTopicRecord = activeTopicId
      ? localTopics.find((topic) => topic.id === activeTopicId) || null
      : null;
    const confirmedTopicId = currentTopicRecord?.id;
    const confirmedTopic = runtimeAdapter.topics.confirmTopicDraft(draft, {
      topicId: confirmedTopicId,
      status: TOPIC_STATUSES.BUILDING,
    });
    const run = runtimeAdapter.runs.startInitialReview(confirmedTopic.id, {
      status: TOPIC_STATUSES.BUILDING,
      stageLabel: 'Preparing your Initial Topic Map',
    });
    const seedSnapshot = createLocalTopicRecord({
      draft,
      fixtureKey: currentTopicRecord?.fixtureKey || selectedFixtureKey,
      status: TOPIC_STATUSES.BUILDING,
      createdAt: confirmedTopic.created_at,
      updatedAt: run.updated_at,
      id: confirmedTopic.id,
    });
    const nextTopicSnapshot = {
      ...seedSnapshot,
      baselineScenarioKey: currentTopicRecord?.baselineScenarioKey || selectedBaselineScenarioKey,
      runId: run.id,
      runtimeSource: 'adapter',
    };

    setActiveTopicId(confirmedTopic.id);
    ensureTopicActionStateBucket(confirmedTopic.id);
    setLocalTopics((currentTopics) => syncLocalTopicsFromAdapter(
      [
        nextTopicSnapshot,
        ...currentTopics.filter((topic) => topic.id !== confirmedTopic.id),
      ],
      currentTopicRecord?.fixtureKey || selectedFixtureKey
    ));

    setCurrentScreen(SCREEN_IDS.BASELINE_BUILDING);
  };

  const handleBaselineComplete = () => {
    if (activeTopicId && activeTopic) {
      const runStatus = activeTopic.runId
        ? runtimeAdapter.runs.getRunStatus(activeTopic.runId)
        : null;

      updateTopicById(activeTopicId, (topic) => ({
        ...updateLocalTopicStatus(
          topic,
          TOPIC_STATUSES.READY,
          runStatus?.updated_at || new Date().toISOString()
        ),
        runtimeSource: 'adapter',
      }));
    }

    setCurrentScreen(SCREEN_IDS.TOPIC_WORKSPACE);
  };

  const openTopicWorkspace = (topicId) => {
    const nextTopic = localTopics.find((topic) => topic.id === topicId);

    if (!nextTopic) {
      return;
    }

    setActiveTopicId(topicId);
    ensureTopicActionStateBucket(topicId);
    setCurrentTopicDraft(nextTopic.draft);
    setCurrentInput(nextTopic.originalInput);
    setCurrentScreen(SCREEN_IDS.TOPIC_WORKSPACE);
  };

  const resumeTopicBuilding = (topicId) => {
    const nextTopic = localTopics.find((topic) => topic.id === topicId);

    if (!nextTopic) {
      return;
    }

    setActiveTopicId(topicId);
    ensureTopicActionStateBucket(topicId);
    setCurrentTopicDraft(nextTopic.draft);
    setCurrentInput(nextTopic.originalInput);
    setCurrentScreen(SCREEN_IDS.BASELINE_BUILDING);
  };

  const resumeTopicDraft = (topicId) => {
    const nextTopic = localTopics.find((topic) => topic.id === topicId);

    if (!nextTopic) {
      return;
    }

    setActiveTopicId(topicId);
    ensureTopicActionStateBucket(topicId);
    setCurrentTopicDraft(nextTopic.draft);
    setCurrentInput(nextTopic.originalInput);
    setCurrentScreen(SCREEN_IDS.TOPIC_DRAFT_CONFIRMATION);
  };

  const openTopicList = () => {
    setLocalTopics((currentTopics) => syncLocalTopicsFromAdapter(currentTopics));
    setCurrentScreen(SCREEN_IDS.TOPIC_LIST);
  };

  const goHome = () => {
    setCurrentScreen(SCREEN_IDS.HOME);
  };

  const startNewTopic = () => {
    setCurrentInput('');
    setCurrentTopicDraft(null);
    setActiveTopicId(null);
    setCurrentScreen(SCREEN_IDS.HOME);
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case SCREEN_IDS.TOPIC_DRAFT_GENERATION:
        return (
          <TopicDraftGenerationPage
            input={currentInput}
            onComplete={handleDraftGenerated}
            onBackHome={goHome}
          />
        );
      case SCREEN_IDS.TOPIC_DRAFT_CONFIRMATION:
        return (
          <TopicDraftPage
            draft={currentTopicDraft}
            onDraftChange={handleDraftChange}
            onConfirm={handleConfirmTopic}
            onBackHome={goHome}
            onOpenTopicList={openTopicList}
          />
        );
      case SCREEN_IDS.BASELINE_BUILDING:
        return (
          <BaselineBuildingPage
            topic={activeTopic}
            onComplete={handleBaselineComplete}
            onBackHome={goHome}
            onOpenTopicList={openTopicList}
          />
        );
      case SCREEN_IDS.TOPIC_WORKSPACE:
        {
          const activeRuntimeWorkspaceData = activeTopicId
            ? runtimeAdapter.workspace.getTopicWorkspace(activeTopicId, {
              productMainline: activeProductMainline,
            })
            : null;
          const activeWorkspaceProductMainline = activeRuntimeWorkspaceData
            ? buildProductMainlineCompatibilityPayload(activeRuntimeWorkspaceData, {
              productMainline: activeProductMainline,
            })
            : activeProductMainline;

        return (
          <TopicWorkspaceShellPage
            topic={activeTopic}
            topicActionState={activeTopicActionState}
            productMainline={activeWorkspaceProductMainline}
            onWatchCluster={({ clusterId, metadata }) => {
              if (!activeTopicId) {
                return;
              }

              setTopicActionStateSnapshot(
                activeTopicId,
                runtimeAdapter.actions.watchCluster(activeTopicId, clusterId, { metadata })
              );
            }}
            onUnwatchCluster={({ clusterId, metadata }) => {
              if (!activeTopicId) {
                return;
              }

              setTopicActionStateSnapshot(
                activeTopicId,
                runtimeAdapter.actions.unwatchCluster(activeTopicId, clusterId, { metadata })
              );
            }}
            onSaveCluster={({
              clusterId,
              titleSnapshot,
              summarySnapshot,
              sourceLinksSnapshot,
              metadata,
            }) => {
              if (!activeTopicId) {
                return;
              }

              setTopicActionStateSnapshot(
                activeTopicId,
                runtimeAdapter.actions.saveCluster(activeTopicId, clusterId, {
                  titleSnapshot,
                  summarySnapshot,
                  sourceLinksSnapshot,
                }, { metadata })
              );
            }}
            onUnsaveCluster={({ clusterId, metadata }) => {
              if (!activeTopicId) {
                return;
              }

              setTopicActionStateSnapshot(
                activeTopicId,
                runtimeAdapter.actions.unsaveCluster(activeTopicId, clusterId, { metadata })
              );
            }}
            onHideCluster={({ clusterId, metadata }) => {
              if (!activeTopicId) {
                return;
              }

              setTopicActionStateSnapshot(
                activeTopicId,
                runtimeAdapter.actions.hideCluster(activeTopicId, clusterId, { metadata })
              );
            }}
            onUndoHideCluster={({ clusterId, metadata }) => {
              if (!activeTopicId) {
                return;
              }

              setTopicActionStateSnapshot(
                activeTopicId,
                runtimeAdapter.actions.undoHideCluster(activeTopicId, clusterId, { metadata })
              );
            }}
            onSaveEvidence={({
              clusterId,
              evidenceId,
              titleSnapshot,
              summarySnapshot,
              sourceLinksSnapshot,
              metadata,
            }) => {
              if (!activeTopicId) {
                return;
              }

              setTopicActionStateSnapshot(
                activeTopicId,
                runtimeAdapter.actions.saveEvidence(activeTopicId, clusterId, evidenceId, {
                  titleSnapshot,
                  summarySnapshot,
                  sourceLinksSnapshot,
                }, { metadata })
              );
            }}
            onUnsaveEvidence={({ clusterId, evidenceId, metadata }) => {
              if (!activeTopicId) {
                return;
              }

              setTopicActionStateSnapshot(
                activeTopicId,
                runtimeAdapter.actions.unsaveEvidence(activeTopicId, evidenceId, { metadata })
              );
            }}
            onOpenTopicList={openTopicList}
            onCreateNewTopic={startNewTopic}
          />
        );
        }
      case SCREEN_IDS.TOPIC_LIST:
        return (
          <TopicListPage
            topics={localTopics}
            activeTopicId={activeTopicId}
            onCreateNewTopic={startNewTopic}
            onOpenReadyTopic={openTopicWorkspace}
            onResumeBuildingTopic={resumeTopicBuilding}
            onEditDraftTopic={resumeTopicDraft}
          />
        );
      case SCREEN_IDS.HOME:
      default:
        return (
          <HomePage
            inputValue={currentInput}
            onInputChange={setCurrentInput}
            onSubmit={handleCreateTopicDraft}
            onOpenTopicList={openTopicList}
            topicsCount={localTopics.length}
            selectedFixtureKey={homeFixtureNoteLabel}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <DebugFixtureSelector
        selectedFixtureKey={selectedFixtureKey}
        onSelectFixture={setSelectedFixtureKey}
        selectedBaselineScenarioKey={selectedBaselineScenarioKey}
        onSelectBaselineScenario={setSelectedBaselineScenarioKey}
      />
      {renderCurrentScreen()}
    </div>
  );
}
