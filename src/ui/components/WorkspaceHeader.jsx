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

function formatTopicDefinitionStatus(value) {
  return formatLabel(value) || 'Defined';
}

function outcomeLabel(outcomeSummary) {
  const status = outcomeSummary?.release_readiness_status;

  if (status === 'accepted') return 'Accepted';
  if (status === 'accepted_limited') return 'Limited support';
  if (status === 'insufficient_signal') return 'Insufficient signal';
  if (status === 'runtime_failure') return 'Runtime issue';

  return 'Initial Review Ready';
}

export default function WorkspaceHeader({
  workspaceHeader,
  topicDraftSummary,
  briefEligibility = null,
  workspaceCopilotActions = [],
  isBriefPreviewOpen = false,
  onOpenBriefPreview,
  onCloseBriefPreview,
  onRunCopilotAction,
}) {
  const topicDefinitionStatus = formatTopicDefinitionStatus(workspaceHeader?.draft_state_label);
  const reviewSnapshot = formatTimestamp(workspaceHeader?.imported_at);
  const limitationsSummary = typeof topicDraftSummary?.limitations_summary === 'string'
    ? topicDraftSummary.limitations_summary.trim()
    : '';
  const outcomeSummary = workspaceHeader?.outcome_summary || null;
  const outcomeMessage = typeof outcomeSummary?.client_safe_outcome_message === 'string'
    ? outcomeSummary.client_safe_outcome_message.trim()
    : '';
  const outcomeSeverity = typeof outcomeSummary?.user_visible_severity === 'string'
    ? outcomeSummary.user_visible_severity.trim()
    : '';
  const briefIsEligible = Boolean(briefEligibility?.is_eligible);
  const briefIsPreliminary = briefEligibility?.brief_mode === 'preliminary';
  const briefTriggerLabel = isBriefPreviewOpen ? 'Close Brief' : 'Preview Brief';
  const briefHelperText = briefIsEligible
    ? (briefIsPreliminary
      ? 'Opens a preliminary preview with limited-evidence caveats.'
      : 'Opens a read-only preview built from the current workspace state.')
    : (typeof briefEligibility?.summary === 'string' ? briefEligibility.summary : '');
  const workspaceCopilotHelperText = workspaceCopilotActions.some((action) => action?.availability?.is_available)
    ? 'Guided, Topic-scoped actions only. Copilot stays inside the current review context.'
    : (
      workspaceCopilotActions.find((action) => typeof action?.availability?.summary === 'string')?.availability?.summary
      || 'Copilot guided actions are unavailable for the current review state.'
    );

  function formatCopilotActionLabel(action) {
    switch (action?.action_id) {
      case 'summarize_caveats':
        return 'Summarize caveats';
      case 'suggest_what_to_watch_next':
        return 'What to watch next';
      default:
        return action?.display_name || 'Copilot action';
    }
  }

  return (
    <header className="workspace-header">
      <div className="workspace-header__topbar">
        <div>
          <p className="workspace-header__section-label">Initial Topic Map</p>
          <div className="workspace-header__eyebrow">
            <span className="workspace-header__pill">Initial Review</span>
            <span className="workspace-header__pill">Topic definition: {topicDefinitionStatus}</span>
            <span className={`workspace-header__pill${outcomeSeverity ? ` workspace-header__pill--${outcomeSeverity}` : ''}`}>
              Review status: {outcomeLabel(outcomeSummary)}
            </span>
          </div>
        </div>
        <div className="workspace-header__actions">
          <div className="workspace-header__action-group">
            <button
              className="flow-button flow-button--secondary"
              type="button"
              onClick={isBriefPreviewOpen ? onCloseBriefPreview : onOpenBriefPreview}
              disabled={!briefIsEligible}
            >
              {briefTriggerLabel}
            </button>
            {briefHelperText ? (
              <p className="workspace-header__brief-note">{briefHelperText}</p>
            ) : null}
          </div>
          <div className="workspace-header__action-group workspace-header__action-group--copilot">
            <p className="workspace-header__action-group-label">Copilot actions</p>
            <div className="workspace-header__copilot-buttons">
              {workspaceCopilotActions.map((action) => (
                <button
                  key={action.action_id}
                  className="workspace-header__copilot-button"
                  type="button"
                  disabled={!action?.availability?.is_available}
                  onClick={() => onRunCopilotAction?.(action.action_id)}
                >
                  {formatCopilotActionLabel(action)}
                </button>
              ))}
            </div>
            {workspaceCopilotHelperText ? (
              <p className="workspace-header__brief-note">{workspaceCopilotHelperText}</p>
            ) : null}
          </div>
        </div>
      </div>
      <h1 className="workspace-header__title">{workspaceHeader.workspace_title}</h1>
      <p className="workspace-header__summary">{topicDraftSummary.summary}</p>
      <p className="workspace-header__review-note">
        {outcomeMessage || 'Review the clusters surfaced for this topic, then open the Evidence Drawer to verify what supports them before deciding what to monitor, save, or trim from scope.'}
      </p>
      <dl className="workspace-header__meta">
        <div className="workspace-header__meta-item">
          <dt>Review surface</dt>
          <dd>Initial Topic Map</dd>
        </div>
        <div className="workspace-header__meta-item">
          <dt>Review status</dt>
          <dd>Initial Review Ready</dd>
        </div>
        <div className="workspace-header__meta-item">
          <dt>Topic definition</dt>
          <dd>{topicDefinitionStatus}</dd>
        </div>
        {reviewSnapshot ? (
          <div className="workspace-header__meta-item">
            <dt>Snapshot updated</dt>
            <dd>{reviewSnapshot}</dd>
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
