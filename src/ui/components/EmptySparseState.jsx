import React from 'react';

export default function EmptySparseState({ emptyOrSparseState }) {
  const title = emptyOrSparseState.is_empty
    ? 'No signal clusters available'
    : 'Workspace is sparse';

  return (
    <section className="empty-state" aria-label="Workspace state notice">
      <h2>{title}</h2>
      <p>Current workspace data is limited. The reasons below come from the product read model.</p>
      <ul>
        {emptyOrSparseState.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </section>
  );
}
