import React from 'react';
import TopicWorkspacePage from './TopicWorkspacePage';
import richProductMainline from '../../fixtures/product/rich-product-mainline.sample.json';

export default function App() {
  return <TopicWorkspacePage productMainline={richProductMainline} />;
}
