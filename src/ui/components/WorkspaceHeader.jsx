import React from 'react';

function formatLabel(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  return value.replace('T', ' ').replace('Z', '');
}

export default function WorkspaceHeader({ workspaceHeader, topicDraftSummary }) {
  const topicStatus = formatLabel(workspaceHeader?.draft_state_label) || 'Active';
  const reviewSnapshot = formatTimestamp(workspaceHeader?.imported_at);
  const monitoringRunId = typeof workspaceHeader?.monitoring_run_id === 'string'
    ? workspaceHeader.monitoring_run_id
    : '';
  const limitationsSummary = typeof topicDraftSummary?.limitations_summary === 'string'
    ? topicDraftSummary.limitations_summary.trim()
    : '';

  return (
    <header className="workspace-header">
      <p className="workspace-header__section-label">Initial Topic Map</p>
      <div className="workspace-header__eyebrow">
        <span className="workspace-header__pill">Initial Review</span>
        <span className="workspace-header__pill">Topic status: {topicStatus}</span>
      </div>
      <h1 className="workspace-header__title">{workspaceHeader.workspace_title}</h1>
      <p className="workspace-header__summary">{topicDraftSummary.summary}</p>
      <p className="workspace-header__review-note">
        Review the clusters surfaced for this topic, then open the Evidence Drawer to verify what
        supports them before deciding what to monitor, save, or trim from scope.
      </p>
      <dl className="workspace-header__meta">
        <div className="workspace-header__meta-item">
          <dt>Review surface</dt>
          <dd>Initial Topic Map</dd>
        </div>
        <div className="workspace-header__meta-item">
          <dt>Status</dt>
          <dd>{topicStatus}</dd>
        </div>
        {reviewSnapshot ? (
          <div className="workspace-header__meta-item">
            <dt>Snapshot updated</dt>
            <dd>{reviewSnapshot}</dd>
          </div>
        ) : null}
        {monitoringRunId ? (
          <div className="workspace-header__meta-item">
            <dt>Monitoring run</dt>
            <dd title={monitoringRunId}>{monitoringRunId}</dd>
          </div>
        ) : null}
      </dl>
      {limitationsSummary ? (
        <p className="workspace-header__limitations">
          <strong>Review carefully:</strong> {limitationsSummary}
        </p>
      ) : null}
    </header>
  );
}
