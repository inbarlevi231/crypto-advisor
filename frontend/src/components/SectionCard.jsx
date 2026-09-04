import { useState } from 'react';

export function SectionCard({ sectionKey, title, provider, itemId, snapshot, children, onVote }) {
  const [vote, setVote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleVote(next) {
    setBusy(true);
    setError('');
    try {
      await onVote({
        section: sectionKey,
        itemId,
        vote: next,
        contentSnapshot: snapshot || '',
      });
      setVote(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section-card" data-section={sectionKey}>
      <header className="section-card__header">
        <div>
          <h2>{title}</h2>
          {provider ? (
            <span className="pill">
              {provider === 'static' || provider === 'fallback' ? 'static fallback' : provider}
            </span>
          ) : null}
        </div>
        <div className="vote-row">
          <button
            type="button"
            className={`vote-btn ${vote === 'up' ? 'is-active' : ''}`}
            disabled={busy}
            onClick={() => handleVote('up')}
            aria-label="Thumbs up"
          >
            👍
          </button>
          <button
            type="button"
            className={`vote-btn ${vote === 'down' ? 'is-active' : ''}`}
            disabled={busy}
            onClick={() => handleVote('down')}
            aria-label="Thumbs down"
          >
            👎
          </button>
        </div>
      </header>
      <div className="section-card__body">{children}</div>
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
