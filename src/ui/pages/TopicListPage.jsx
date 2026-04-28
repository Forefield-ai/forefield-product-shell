import React from 'react';
import { TOPIC_STATUSES } from '../flow/local-topic-flow.browser.mjs';

function formatTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Local session';
  }

  return value.replace('T', ' ').replace('Z', '');
}

export default function TopicListPage({
  topics,
  activeTopicId,
  onCreateNewTopic,
  onOpenReadyTopic,
  onResumeBuildingTopic,
  onEditDraftTopic,
}) {
  return (
    <main className="flow-shell">
      <div className="flow-shell__inner">
        <section className="flow-page flow-page--topic-list">
          <div className="flow-page__header">
            <div>
              <p className="flow-page__eyebrow">Local Recent Topics</p>
              <h1 className="flow-page__title">Recent Topics</h1>
              <p className="flow-page__copy">
                Session-only local topics. Refreshing the page may clear this list.
              </p>
            </div>
            <div className="flow-actions flow-actions--compact">
              <button className="flow-button flow-button--primary" type="button" onClick={onCreateNewTopic}>
                Create New Topic
              </button>
            </div>
          </div>

          {topics.length === 0 ? (
            <div className="flow-empty-list">
              <h2>No local topics yet</h2>
              <p>Create a new Topic Draft to start the local MVP flow shell.</p>
            </div>
          ) : (
            <div className="flow-topic-list">
              {topics.map((topic) => (
                <article
                  className={`flow-topic-card${topic.id === activeTopicId ? ' flow-topic-card--active' : ''}`}
                  key={topic.id}
                >
                  <div className="flow-topic-card__header">
                    <div>
                      <p className="flow-topic-card__eyebrow">{topic.status}</p>
                      <h2>{topic.draft?.topic_name || 'Untitled local topic'}</h2>
                    </div>
                    <span className="flow-topic-card__fixture">{topic.fixtureKey}</span>
                  </div>

                  <p className="flow-topic-card__summary">{topic.draft?.topic_summary}</p>

                  <dl className="flow-topic-card__meta">
                    <div>
                      <dt>Audience</dt>
                      <dd>{topic.draft?.target_audience || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatTimestamp(topic.updatedAt)}</dd>
                    </div>
                  </dl>

                  <div className="flow-actions flow-actions--compact">
                    {topic.status === TOPIC_STATUSES.READY ? (
                      <button className="flow-button flow-button--primary" type="button" onClick={() => onOpenReadyTopic(topic.id)}>
                        Open Workspace
                      </button>
                    ) : null}

                    {topic.status === TOPIC_STATUSES.BUILDING ? (
                      <button className="flow-button flow-button--secondary" type="button" onClick={() => onResumeBuildingTopic(topic.id)}>
                        Open Building Progress
                      </button>
                    ) : null}

                    {topic.status === TOPIC_STATUSES.DRAFT ? (
                      <button className="flow-button flow-button--secondary" type="button" onClick={() => onEditDraftTopic(topic.id)}>
                        Continue Draft
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
