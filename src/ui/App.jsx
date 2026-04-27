import React, { useState } from 'react';
import TopicWorkspacePage from './TopicWorkspacePage';
import DebugFixtureSelector from './components/DebugFixtureSelector';
import minimalProductMainline from '../../fixtures/product/product-mainline.sample.json';
import richProductMainline from '../../fixtures/product/rich-product-mainline.sample.json';

const PRODUCT_MAINLINE_FIXTURES = {
  minimal: minimalProductMainline,
  rich: richProductMainline,
};

export default function App() {
  const [selectedFixtureKey, setSelectedFixtureKey] = useState('rich');

  return (
    <div className="app-shell">
      <DebugFixtureSelector
        selectedFixtureKey={selectedFixtureKey}
        onSelectFixture={setSelectedFixtureKey}
      />
      <TopicWorkspacePage
        key={selectedFixtureKey}
        productMainline={PRODUCT_MAINLINE_FIXTURES[selectedFixtureKey]}
      />
    </div>
  );
}
