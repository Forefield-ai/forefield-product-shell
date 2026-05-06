import React, { useRef, useState } from 'react';
import DebugFixtureSelector from './components/DebugFixtureSelector';
import PrototypeFallbackState from './components/PrototypeFallbackState';
import RuntimeModeSelector from './components/RuntimeModeSelector';
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
import groupedEvidenceProductMainline from '../../fixtures/product/grouped-evidence-product-mainline.sample.json';
import { createLocalRuntimeAdapter } from '../runtime/adapters/local-runtime-adapter.browser.mjs';
import {
  createRuntimeAdapterFromConfig,
  resolveProductShellRuntimeMode,
} from '../runtime/adapters/runtime-adapter-selector.browser.mjs';
import {
  resolveDecisionCoreApiBaseUrl,
} from '../runtime/api/decision-core-client.browser.mjs';
import {
  RUNTIME_MODES,
} from '../runtime/contracts/runtime-adapter-contract.browser.mjs';
import { buildProductMainlineCompatibilityPayload } from '../runtime/workspace/local-workspace-payload.browser.mjs';
import { initialActionState } from '../product/actions/user-action-state.browser.mjs';
import {
  API_RUNTIME_STATUSES,
  isApiTopicSnapshot,
  normalizeApiRuntimeErrorCode,
  runApiInitialReviewFromDraft,
} from './flow/api-mode-topic-flow.browser.mjs';
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
  grouped_evidence: groupedEvidenceProductMainline,
};

const FIXTURE_PREVIEW_LABELS = {
  rich: 'Rich review snapshot',
  minimal: 'Minimal review snapshot',
  empty: 'Empty review snapshot',
  sparse: 'Sparse review snapshot',
  no_evidence: 'No-evidence cluster',
  grouped_evidence: 'Grouped evidence review snapshot',
};

const BASELINE_SCENARIO_LABELS = {
  [LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT]: 'standard baseline path',
  [LOCAL_BASELINE_SCENARIO_KEYS.FAILED]: 'unavailable baseline sample',
  [LOCAL_BASELINE_SCENARIO_KEYS.STUCK]: 'delayed baseline sample',
};

function isKnownFixtureKey(fixtureKey) {
  return typeof fixtureKey === 'string'
    && Object.prototype.hasOwnProperty.call(PRODUCT_MAINLINE_FIXTURES, fixtureKey);
}

function getFixturePreviewLabel(fixtureKey) {
  if (isKnownFixtureKey(fixtureKey)) {
    return FIXTURE_PREVIEW_LABELS[fixtureKey];
  }

  return 'Unavailable sample workspace';
}

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

function buildApiRuntimeState(status, patch = {}) {
  return {
    status,
    errorCode: null,
    run: null,
    workspacePayload: null,
    ...patch,
  };
}

function resolveApiStatusCopy(status) {
  if (status === API_RUNTIME_STATUSES.CHECKING_BACKEND) {
    return 'Checking that the configured backend API is reachable.';
  }

  if (status === API_RUNTIME_STATUSES.CREATING_RUN) {
    return 'Creating an Initial Review run through the configured backend.';
  }

  if (status === API_RUNTIME_STATUSES.POLLING_RUN) {
    return 'Waiting for the backend run to report a workspace-ready state.';
  }

  if (status === API_RUNTIME_STATUSES.LOADING_WORKSPACE) {
    return 'Loading the persisted workspace payload from the backend.';
  }

  return 'Preparing the API Backend workspace.';
}

function resolveApiFailureCopy(errorCode) {
  const safeErrorCode = typeof errorCode === 'string' && errorCode.trim()
    ? errorCode.trim()
    : 'runtime_execution_failed';

  const copyByCode = {
    backend_unavailable: 'The app could not reach the configured decision-core backend.',
    invalid_backend_url: 'The configured backend URL is not a valid HTTP or HTTPS URL.',
    invalid_topic: 'The topic input was rejected before a backend run could start.',
    live_gate_missing: 'Live mode was requested without the required live source gate.',
    workspace_not_ready: 'The backend run is not workspace-ready yet.',
    run_failed: 'The backend run failed before a workspace payload was ready.',
    workspace_load_failed: 'The backend run returned without a usable workspace payload.',
    runtime_execution_failed: 'The backend runtime path failed before the workspace could be loaded.',
  };

  return {
    errorCode: safeErrorCode,
    copy: copyByCode[safeErrorCode] || copyByCode.runtime_execution_failed,
  };
}

export default function App() {
  const runtimeAdapterRef = useRef(null);
  const apiRuntimeAdapterRef = useRef(null);
  const apiBaseUrl = resolveDecisionCoreApiBaseUrl();
  const [runtimeMode, setRuntimeMode] = useState(resolveProductShellRuntimeMode());
  const [apiRuntimeState, setApiRuntimeState] = useState(buildApiRuntimeState(
    API_RUNTIME_STATUSES.IDLE
  ));
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
  const activeProductMainline = isKnownFixtureKey(activeTopicFixtureKey)
    ? PRODUCT_MAINLINE_FIXTURES[activeTopicFixtureKey]
    : null;
  const activeTopicActionState = activeTopicId
    ? topicActionStateById[activeTopicId] || initialActionState()
    : initialActionState();
  const activeFixturePreviewLabel = getFixturePreviewLabel(selectedFixtureKey);
  const activeBaselineScenarioLabel = BASELINE_SCENARIO_LABELS[selectedBaselineScenarioKey]
    || BASELINE_SCENARIO_LABELS[LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT];
  const homeFixtureNoteLabel = selectedBaselineScenarioKey === LOCAL_BASELINE_SCENARIO_KEYS.DEFAULT
    ? activeFixturePreviewLabel
    : `${activeFixturePreviewLabel} with ${activeBaselineScenarioLabel}`;
  const fixtureSelectorNotice = isKnownFixtureKey(selectedFixtureKey)
    ? ''
    : 'The selected sample workspace is unavailable in this local prototype. Choose another sample to continue safely.';
  const runtimeModeIsApi = runtimeMode === RUNTIME_MODES.API;
  const runtimeModeIsLocal = !runtimeModeIsApi;

  if (!runtimeAdapterRef.current) {
    runtimeAdapterRef.current = createLocalRuntimeAdapter();
  }

  const runtimeAdapter = runtimeAdapterRef.current;

  const getApiRuntimeAdapter = () => {
    if (!apiRuntimeAdapterRef.current) {
      apiRuntimeAdapterRef.current = createRuntimeAdapterFromConfig({
        mode: RUNTIME_MODES.API,
      });
    }

    return apiRuntimeAdapterRef.current;
  };

  const handleRuntimeModeChange = (nextMode) => {
    const normalizedMode = nextMode === RUNTIME_MODES.API ? RUNTIME_MODES.API : RUNTIME_MODES.LOCAL;

    setRuntimeMode(normalizedMode);
    setApiRuntimeState(buildApiRuntimeState(API_RUNTIME_STATUSES.IDLE));
  };

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
        workspaceId: existingSnapshot?.workspaceId || null,
        apiRun: existingSnapshot?.apiRun || null,
        apiWorkspacePayload: existingSnapshot?.apiWorkspacePayload || null,
        apiProductMainline: existingSnapshot?.apiProductMainline || null,
        runtimeSource: existingSnapshot?.runtimeSource || 'adapter',
      };
    });

    return sortTopicSnapshots([...pendingDraftTopics, ...adapterBackedSnapshots]);
  };

  const handleCreateTopicDraft = (input) => {
    setApiRuntimeState(buildApiRuntimeState(API_RUNTIME_STATUSES.IDLE));
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

  const handleConfirmTopic = async (draft) => {
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

    if (runtimeModeIsApi) {
      const seedSnapshot = createLocalTopicRecord({
        draft,
        fixtureKey: currentTopicRecord?.fixtureKey || selectedFixtureKey,
        status: TOPIC_STATUSES.BUILDING,
        createdAt: confirmedTopic.created_at,
        updatedAt: confirmedTopic.updated_at,
        id: confirmedTopic.id,
      });
      const nextTopicSnapshot = {
        ...seedSnapshot,
        baselineScenarioKey: currentTopicRecord?.baselineScenarioKey || selectedBaselineScenarioKey,
        runId: null,
        workspaceId: null,
        runtimeSource: 'api',
      };

      setActiveTopicId(confirmedTopic.id);
      ensureTopicActionStateBucket(confirmedTopic.id);
      setLocalTopics((currentTopics) => sortTopicSnapshots([
        nextTopicSnapshot,
        ...currentTopics.filter((topic) => topic.id !== confirmedTopic.id),
      ]));
      setApiRuntimeState(buildApiRuntimeState(API_RUNTIME_STATUSES.CREATING_RUN));
      setCurrentScreen(SCREEN_IDS.BASELINE_BUILDING);

      try {
        await Promise.resolve();
        setApiRuntimeState(buildApiRuntimeState(API_RUNTIME_STATUSES.LOADING_WORKSPACE));

        const apiResult = await runApiInitialReviewFromDraft({
          apiRuntimeAdapter: getApiRuntimeAdapter(),
          draft,
          options: {
            mode: 'mocked',
          },
          onStatusChange: (nextRuntimeState) => {
            setApiRuntimeState(buildApiRuntimeState(nextRuntimeState.status, {
              run: nextRuntimeState.run || null,
            }));
          },
        });
        const readySnapshot = {
          ...updateLocalTopicStatus(nextTopicSnapshot, TOPIC_STATUSES.READY),
          ...apiResult.topic_patch,
          runtimeSource: 'api',
        };

        setLocalTopics((currentTopics) => sortTopicSnapshots([
          readySnapshot,
          ...currentTopics.filter((topic) => topic.id !== confirmedTopic.id),
        ]));
        setApiRuntimeState(buildApiRuntimeState(API_RUNTIME_STATUSES.WORKSPACE_READY, {
          run: apiResult.run,
          workspacePayload: apiResult.workspace_payload,
        }));
        setCurrentScreen(SCREEN_IDS.TOPIC_WORKSPACE);
      } catch (error) {
        setApiRuntimeState(buildApiRuntimeState(API_RUNTIME_STATUSES.FAILED, {
          errorCode: normalizeApiRuntimeErrorCode(error),
        }));
      }

      return;
    }

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
    setApiRuntimeState(buildApiRuntimeState(API_RUNTIME_STATUSES.IDLE));
    setCurrentScreen(SCREEN_IDS.HOME);
  };

  const startNewTopic = () => {
    setApiRuntimeState(buildApiRuntimeState(API_RUNTIME_STATUSES.IDLE));
    setCurrentInput('');
    setCurrentTopicDraft(null);
    setActiveTopicId(null);
    setCurrentScreen(SCREEN_IDS.HOME);
  };

  const renderCurrentScreen = () => {
    if (
      runtimeModeIsApi
      && (
        apiRuntimeState.status === API_RUNTIME_STATUSES.CHECKING_BACKEND
        || apiRuntimeState.status === API_RUNTIME_STATUSES.POLLING_RUN
        || apiRuntimeState.status === API_RUNTIME_STATUSES.CREATING_RUN
        || apiRuntimeState.status === API_RUNTIME_STATUSES.LOADING_WORKSPACE
      )
    ) {
      return (
        <PrototypeFallbackState
          eyebrow="API Backend"
          title="Running Initial Review"
          copy={resolveApiStatusCopy(apiRuntimeState.status)}
          detail="The browser is using the backend API path. No local sample workspace will be used as a fallback in this mode."
          variant="warning"
          actions={[
            { label: 'Back to Home', onClick: goHome, variant: 'secondary' },
          ]}
        />
      );
    }

    if (runtimeModeIsApi && apiRuntimeState.status === API_RUNTIME_STATUSES.FAILED) {
      const failure = resolveApiFailureCopy(apiRuntimeState.errorCode);

      return (
        <PrototypeFallbackState
          eyebrow="API Backend error"
          title="Initial Review could not be completed"
          copy={failure.copy}
          detail={`Safe error code: ${failure.errorCode}. Local sample data was not used as a fallback.`}
          variant="error"
          actions={[
            { label: 'Back to Home', onClick: goHome, variant: 'secondary' },
            {
              label: 'Use Local Sample',
              onClick: () => handleRuntimeModeChange(RUNTIME_MODES.LOCAL),
              variant: 'primary',
            },
          ]}
        />
      );
    }

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
            runtimeMode={runtimeMode}
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
          if (!activeTopic) {
            return (
              <PrototypeFallbackState
                eyebrow="Local prototype route unavailable"
                title="This topic workspace preview is unavailable"
                copy="The local prototype could not find the topic linked to this workspace route. This is a prototype routing issue, not a market signal conclusion."
                detail="Return Home or open Recent Topics to continue from a safe local prototype state."
                variant="warning"
                actions={[
                  { label: 'Back to Home', onClick: goHome, variant: 'secondary' },
                  { label: 'View Recent Topics', onClick: openTopicList, variant: 'primary' },
                ]}
              />
            );
          }

          const activeTopicUsesApi = isApiTopicSnapshot(activeTopic);

          if (!activeTopicUsesApi && !isKnownFixtureKey(activeTopicFixtureKey)) {
            return (
              <PrototypeFallbackState
                eyebrow="Sample workspace unavailable"
                title="This local sample review snapshot is unavailable"
                copy="The topic is linked to a local sample workspace the app can no longer load safely. This is a sample data issue, not a review conclusion."
                detail="Return Home or open Recent Topics to continue with a valid local sample."
                variant="warning"
                actions={[
                  { label: 'Back to Home', onClick: goHome, variant: 'secondary' },
                  { label: 'View Recent Topics', onClick: openTopicList, variant: 'primary' },
                ]}
              />
            );
          }

          let activeWorkspaceProductMainline = activeTopicUsesApi
            ? activeTopic.apiProductMainline
            : activeProductMainline;

          try {
            if (activeTopicUsesApi) {
              if (!activeWorkspaceProductMainline) {
                throw new Error('api_workspace_payload_missing');
              }
            } else {
              const activeRuntimeWorkspaceData = activeTopicId
                ? runtimeAdapter.workspace.getTopicWorkspace(activeTopicId, {
                  productMainline: activeProductMainline,
                })
                : null;
              activeWorkspaceProductMainline = activeRuntimeWorkspaceData
                ? buildProductMainlineCompatibilityPayload(activeRuntimeWorkspaceData, {
                  productMainline: activeProductMainline,
                })
                : activeProductMainline;
            }
          } catch (error) {
            return (
              <PrototypeFallbackState
                eyebrow={activeTopicUsesApi ? 'API workspace unavailable' : 'Prototype data unavailable'}
                title="This review snapshot could not be rendered safely"
                copy={activeTopicUsesApi
                  ? 'The backend returned without a workspace payload the product shell can render safely.'
                  : 'The local prototype ran into a sample data problem before the workspace could be shown. This is a prototype data issue, not a market signal conclusion.'}
                detail={activeTopicUsesApi
                  ? 'Return Home or try Local Sample mode. The app did not fall back to fixture data for this API run.'
                  : 'Return Home or open Recent Topics instead of treating this as sparse demand, empty demand, or a completed review state.'}
                variant="error"
                actions={[
                  { label: 'Back to Home', onClick: goHome, variant: 'secondary' },
                  { label: 'View Recent Topics', onClick: openTopicList, variant: 'primary' },
                ]}
              />
            );
          }

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
            runtimeMode={runtimeMode}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <RuntimeModeSelector
        mode={runtimeMode}
        onChange={handleRuntimeModeChange}
        apiBaseUrl={apiBaseUrl}
      />
      {runtimeModeIsLocal ? (
        <DebugFixtureSelector
          selectedFixtureKey={selectedFixtureKey}
          onSelectFixture={setSelectedFixtureKey}
          selectedBaselineScenarioKey={selectedBaselineScenarioKey}
          onSelectBaselineScenario={setSelectedBaselineScenarioKey}
          fixtureNotice={fixtureSelectorNotice}
        />
      ) : null}
      {renderCurrentScreen()}
    </div>
  );
}
