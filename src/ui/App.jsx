import React, { useState } from 'react';
import DebugFixtureSelector from './components/DebugFixtureSelector';
import HomePage from './pages/HomePage';
import TopicDraftGenerationPage from './pages/TopicDraftGenerationPage';
import TopicDraftPage from './pages/TopicDraftPage';
import BaselineBuildingPage from './pages/BaselineBuildingPage';
import TopicListPage from './pages/TopicListPage';
import TopicWorkspaceShellPage from './pages/TopicWorkspaceShellPage';
import minimalProductMainline from '../../fixtures/product/product-mainline.sample.json';
import richProductMainline from '../../fixtures/product/rich-product-mainline.sample.json';
import { generateLocalTopicDraftFromInput } from './flow/generate-local-topic-draft';
import {
  createLocalTopicRecord,
  SCREEN_IDS,
  TOPIC_STATUSES,
  updateLocalTopicRecord,
  updateLocalTopicStatus,
} from './flow/local-topic-flow';

const PRODUCT_MAINLINE_FIXTURES = {
  minimal: minimalProductMainline,
  rich: richProductMainline,
};

export default function App() {
  const [selectedFixtureKey, setSelectedFixtureKey] = useState('rich');
  const [currentScreen, setCurrentScreen] = useState(SCREEN_IDS.HOME);
  const [currentInput, setCurrentInput] = useState('');
  const [currentTopicDraft, setCurrentTopicDraft] = useState(null);
  const [localTopics, setLocalTopics] = useState([]);
  const [activeTopicId, setActiveTopicId] = useState(null);

  const activeTopic = localTopics.find((topic) => topic.id === activeTopicId) || null;
  const activeTopicFixtureKey = activeTopic?.fixtureKey || selectedFixtureKey;
  const activeProductMainline = PRODUCT_MAINLINE_FIXTURES[activeTopicFixtureKey] || richProductMainline;

  const updateTopicById = (topicId, updater) => {
    setLocalTopics((currentTopics) => currentTopics.map((topic) => (
      topic.id === topicId ? updater(topic) : topic
    )));
  };

  const handleCreateTopicDraft = (input) => {
    setCurrentInput(input);
    setCurrentTopicDraft(null);
    setActiveTopicId(null);
    setCurrentScreen(SCREEN_IDS.TOPIC_DRAFT_GENERATION);
  };

  const handleDraftGenerated = (draft) => {
    const nextDraft = draft || generateLocalTopicDraftFromInput(currentInput);
    const nextTopicRecord = createLocalTopicRecord({
      draft: nextDraft,
      fixtureKey: selectedFixtureKey,
      status: TOPIC_STATUSES.DRAFT,
    });

    setCurrentTopicDraft(nextDraft);
    setActiveTopicId(nextTopicRecord.id);
    setLocalTopics((currentTopics) => [nextTopicRecord, ...currentTopics]);
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

    if (!activeTopicId) {
      const nextTopicRecord = createLocalTopicRecord({
        draft,
        fixtureKey: selectedFixtureKey,
        status: TOPIC_STATUSES.BUILDING,
      });

      setLocalTopics((currentTopics) => [nextTopicRecord, ...currentTopics]);
      setActiveTopicId(nextTopicRecord.id);
    } else {
      updateTopicById(activeTopicId, (topic) => updateLocalTopicRecord(topic, {
        draft,
        status: TOPIC_STATUSES.BUILDING,
      }));
    }

    setCurrentScreen(SCREEN_IDS.BASELINE_BUILDING);
  };

  const handleBaselineComplete = () => {
    if (activeTopicId) {
      updateTopicById(activeTopicId, (topic) => updateLocalTopicStatus(topic, TOPIC_STATUSES.READY));
    }

    setCurrentScreen(SCREEN_IDS.TOPIC_WORKSPACE);
  };

  const openTopicWorkspace = (topicId) => {
    const nextTopic = localTopics.find((topic) => topic.id === topicId);

    if (!nextTopic) {
      return;
    }

    setActiveTopicId(topicId);
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
    setCurrentTopicDraft(nextTopic.draft);
    setCurrentInput(nextTopic.originalInput);
    setCurrentScreen(SCREEN_IDS.TOPIC_DRAFT_CONFIRMATION);
  };

  const openTopicList = () => {
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
            onOpenTopicList={openTopicList}
          />
        );
      case SCREEN_IDS.TOPIC_WORKSPACE:
        return (
          <TopicWorkspaceShellPage
            topic={activeTopic}
            productMainline={activeProductMainline}
            onOpenTopicList={openTopicList}
            onCreateNewTopic={startNewTopic}
          />
        );
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
            selectedFixtureKey={selectedFixtureKey}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <DebugFixtureSelector
        selectedFixtureKey={selectedFixtureKey}
        onSelectFixture={setSelectedFixtureKey}
      />
      {renderCurrentScreen()}
    </div>
  );
}
