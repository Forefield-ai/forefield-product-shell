import React from 'react';
import TopicWorkspacePage from './TopicWorkspacePage';
import richWorkspaceViewState from '../../fixtures/product/rich-topic-workspace-view-state.sample.json';

export default function App() {
  return <TopicWorkspacePage workspaceViewState={richWorkspaceViewState} />;
}
