import React from 'react';

export default function WorkspaceHeader({ workspaceHeader, topicDraftSummary }) {
  return (
    <header className="workspace-header">
      <div className="workspace-header__eyebrow">
        <span>{workspaceHeader.draft_state_label}</span>
        <span>{workspaceHeader.source_bundle_status}</span>
      </div>
      <h1 className="workspace-header__title">{workspaceHeader.workspace_title}</h1>
      <p className="workspace-header__summary">{topicDraftSummary.summary}</p>
      <dl className="workspace-header__meta">
        <div>
          <dt>Topic Draft</dt>
          <dd>{topicDraftSummary.topic_draft_id}</dd>
        </div>
        <div>
          <dt>Monitoring Run</dt>
          <dd>{workspaceHeader.monitoring_run_id}</dd>
        </div>
        <div>
          <dt>Bundle</dt>
          <dd>{workspaceHeader.source_bundle_id}</dd>
        </div>
        <div>
          <dt>Imported</dt>
          <dd>{workspaceHeader.imported_at}</dd>
        </div>
      </dl>
      <p className="workspace-header__limitations">
        {topicDraftSummary.limitations_summary}
      </p>
    </header>
  );
}
