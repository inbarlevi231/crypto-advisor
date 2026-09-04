import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ASSETS = [
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'solana', label: 'Solana' },
  { id: 'cardano', label: 'Cardano' },
  { id: 'dogecoin', label: 'Dogecoin' },
  { id: 'ripple', label: 'XRP' },
  { id: 'avalanche-2', label: 'Avalanche' },
  { id: 'chainlink', label: 'Chainlink' },
];

const INVESTOR_TYPES = [
  { id: 'HODLer', label: 'HODLer', blurb: 'Long-term conviction' },
  { id: 'DayTrader', label: 'Day Trader', blurb: 'Intraday moves' },
  { id: 'NFTCollector', label: 'NFT Collector', blurb: 'Culture & floors' },
];

const CONTENT_TYPES = [
  { id: 'MarketNews', label: 'Market News' },
  { id: 'Charts', label: 'Charts' },
  { id: 'Social', label: 'Social' },
  { id: 'Fun', label: 'Fun' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = location.state?.editing === true;
  const { updateUser, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [assets, setAssets] = useState([]);
  const [investorType, setInvestorType] = useState('');
  const [contentTypes, setContentTypes] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(isEditing);

  useEffect(() => {
    if (!isEditing) return;
    api.getPreferences().then((data) => {
      if (data.preferences) {
        setAssets(data.preferences.assets || []);
        setInvestorType(data.preferences.investorType || '');
        setContentTypes(data.preferences.contentTypes || []);
      }
    }).catch(() => {}).finally(() => setLoadingPrefs(false));
  }, [isEditing]);

  function toggle(list, setList, id) {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function finish() {
    setBusy(true);
    setError('');
    try {
      const data = await api.savePreferences({ assets, investorType, contentTypes });
      updateUser(data.user);
      sessionStorage.setItem('dashboardNeedsRefresh', '1');
      navigate('/dashboard', { state: { refreshDashboard: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboard-shell">
      <header className="topbar">
        <p className="brand">SignalDesk</p>
        <div className="row-actions" style={{ marginTop: 0 }}>
          {isEditing ? (
            <button type="button" className="btn ghost" onClick={() => navigate('/dashboard')}>
              Cancel
            </button>
          ) : null}
          <button type="button" className="btn ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      {loadingPrefs ? (
        <div className="page-center"><p className="muted">Loading preferences…</p></div>
      ) : (
      <div className="onboard-card">
        <p className="step-label">{isEditing ? 'Edit preferences — ' : ''}Step {step + 1} of 3</p>
        {step === 0 && (
          <>
            <h1>Which assets interest you?</h1>
            <p className="lede">Pick one or more — we&apos;ll tailor prices and news.</p>
            <div className="chip-grid">
              {ASSETS.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className={`chip ${assets.includes(asset.id) ? 'is-selected' : ''}`}
                  onClick={() => toggle(assets, setAssets, asset.id)}
                >
                  {asset.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1>What type of investor are you?</h1>
            <p className="lede">This shapes the tone of your AI insight.</p>
            <div className="choice-grid">
              {INVESTOR_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`choice ${investorType === type.id ? 'is-selected' : ''}`}
                  onClick={() => setInvestorType(type.id)}
                >
                  <strong>{type.label}</strong>
                  <span>{type.blurb}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>What content do you want?</h1>
            <p className="lede">Select the kinds of signal that keep you engaged.</p>
            <div className="chip-grid">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`chip ${contentTypes.includes(type.id) ? 'is-selected' : ''}`}
                  onClick={() => toggle(contentTypes, setContentTypes, type.id)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <div className="row-actions">
          {step > 0 ? (
            <button type="button" className="btn ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button
              type="button"
              className="btn primary"
              disabled={(step === 0 && assets.length === 0) || (step === 1 && !investorType)}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              disabled={busy || contentTypes.length === 0}
              onClick={finish}
            >
              {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Open dashboard'}
            </button>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
