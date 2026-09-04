import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SectionCard } from '../components/SectionCard';
import Sparkline from '../components/Sparkline';

function formatPrice(value) {
  if (value == null) return '—';
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
}

function formatChange(value) {
  if (value == null) return '—';
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const dashboard = await api.getDashboard(refresh);
      setData(dashboard);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const shouldRefresh =
        location.state?.refreshDashboard === true ||
        sessionStorage.getItem('dashboardNeedsRefresh') === '1';

      if (location.state?.refreshDashboard) {
        navigate('/dashboard', { replace: true, state: null });
      }

      if (shouldRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const dashboard = await api.getDashboard(shouldRefresh);
        if (cancelled) return;
        setData(dashboard);
        if (shouldRefresh) {
          sessionStorage.removeItem('dashboardNeedsRefresh');
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // Mount once when entering the dashboard (including after preference edits)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onVote(payload) {
    await api.sendFeedback(payload);
  }

  if (loading) {
    return (
      <div className="page-center">
        <p className="muted">Building today&apos;s desk…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page-center">
        <p className="error-text">{error}</p>
        <button type="button" className="btn primary" onClick={() => load(false)}>
          Retry
        </button>
      </div>
    );
  }

  const sections = data?.sections;
  const contentTypes = data?.preferences?.contentTypes || [];
  const wantsCharts = contentTypes.includes('Charts') && sections.charts;
  const wantsSocial = contentTypes.includes('Social') && sections.insight?.social;
  const wantsFunFact = contentTypes.includes('Fun') && sections.meme?.funFact;

  return (
    <div className="dash-shell">
      <header className="topbar dash-top">
        <div>
          <p className="brand">SignalDesk</p>
          <p className="muted compact">
            Hi {user?.name} · {data?.preferences?.investorType} · {data?.date}
            {data?.cached ? ' · cached' : ''}
          </p>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigate('/onboarding', { state: { editing: true } })}
          >
            Edit preferences
          </button>
          <button type="button" className="btn ghost" disabled={refreshing} onClick={() => load(true)}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="btn ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {error ? <p className="error-text pad-x">{error}</p> : null}

      <main className="dash-grid">
        <div className="dash-col">
          <SectionCard
            sectionKey="news"
            title={sections.news.title}
            provider={sections.news.provider}
            itemId={sections.news.id}
            snapshot={sections.news.items.map((i) => i.title).join(' | ')}
            onVote={onVote}
          >
            <ul className="news-list">
              {sections.news.items.map((item) => (
                <li key={item.id}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            sectionKey="insight"
            title={sections.insight.title}
            provider={sections.insight.provider}
            itemId={sections.insight.id}
            snapshot={[sections.insight.text, sections.insight.social?.text].filter(Boolean).join(' | ')}
            onVote={onVote}
          >
            <p className="insight-text">{sections.insight.text}</p>
            {wantsSocial ? (
              <div className="social-buzz">
                <p className="social-buzz__label">Social buzz</p>
                <p className="social-buzz__text">{sections.insight.social.text}</p>
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="dash-col">
          <SectionCard
            sectionKey="prices"
            title={sections.prices.title}
            provider={sections.prices.provider}
            itemId={sections.prices.id}
            snapshot={sections.prices.items.map((i) => `${i.symbol}:${i.priceUsd}`).join(',')}
            onVote={onVote}
          >
            <div className="price-table">
              {sections.prices.items.map((coin) => {
                const chartData = wantsCharts
                  ? sections.charts.items.find((c) => c.id === coin.id)
                  : null;
                return (
                  <div key={coin.id} className="price-row-group">
                    <div className="price-row">
                      <div>
                        <strong>{coin.name}</strong>
                        <span className="muted">{coin.symbol}</span>
                      </div>
                      <div className="price-nums">
                        <span>{formatPrice(coin.priceUsd)}</span>
                        <span className={Number(coin.change24h) >= 0 ? 'up' : 'down'}>
                          {formatChange(coin.change24h)}
                        </span>
                      </div>
                    </div>
                    {chartData?.dataPoints?.length > 1 ? (
                      <div className="price-sparkline">
                        <Sparkline dataPoints={chartData.dataPoints} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            sectionKey="meme"
            title={sections.meme.title}
            provider={sections.meme.provider}
            itemId={sections.meme.id}
            snapshot={[sections.meme.memeTitle, sections.meme.funFact?.text].filter(Boolean).join(' | ')}
            onVote={onVote}
          >
            <figure className="meme-figure">
              <img src={sections.meme.imageUrl} alt={sections.meme.alt || sections.meme.memeTitle} />
              <figcaption>{sections.meme.memeTitle}</figcaption>
            </figure>
            {wantsFunFact ? (
              <div className="fun-fact">
                <p className="fun-fact__label">Fun fact</p>
                <p className="fun-fact__text">{sections.meme.funFact.text}</p>
              </div>
            ) : null}
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
