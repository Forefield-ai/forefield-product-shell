import React from 'react';

export default function ClusterActions({
  isWatched,
  isSaved,
  onWatch,
  onUnwatch,
  onSave,
  onUnsave,
  onHide,
}) {
  const handleActionClick = (event, callback) => {
    event.stopPropagation();
    callback?.();
  };

  return (
    <div className="cluster-actions">
      <div className="cluster-actions__badges" aria-label="Cluster action state">
        {isWatched ? <span className="cluster-actions__badge">Watching</span> : null}
        {isSaved ? <span className="cluster-actions__badge cluster-actions__badge--saved">Saved</span> : null}
      </div>

      <div className="cluster-actions__buttons">
        <button
          type="button"
          className="cluster-actions__button"
          onClick={(event) => handleActionClick(event, isWatched ? onUnwatch : onWatch)}
        >
          {isWatched ? 'Unwatch' : 'Watch'}
        </button>
        <button
          type="button"
          className="cluster-actions__button"
          onClick={(event) => handleActionClick(event, isSaved ? onUnsave : onSave)}
        >
          {isSaved ? 'Unsave' : 'Save'}
        </button>
        <button
          type="button"
          className="cluster-actions__button cluster-actions__button--warning"
          onClick={(event) => handleActionClick(event, onHide)}
        >
          Not relevant
        </button>
      </div>
    </div>
  );
}
