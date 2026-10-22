import { useEffect, useState, useMemo } from 'react';
import { getPortfolioSummary } from '../../lib/api/portfolio';
import type { PortfolioSummary } from '../../contracts/v1/portfolio';
import type { Participant } from '../../contracts/v1/auth';

interface EventEndedThankYouProps {
  participant?: Participant | null;
  onLogout: () => void;
  onRefresh?: () => void;
}

function inr(n: number) {
  return '₹' + Math.abs(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function EventEndedThankYou({
  participant,
  onLogout,
  onRefresh,
}: EventEndedThankYouProps) {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveMsg, setLiveMsg] = useState('');
  const [submittedAt] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour12: false })
  );

  useEffect(() => {
    getPortfolioSummary()
      .then((p) => setPortfolio(p))
      .catch(() => {});
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();

    getPortfolioSummary()
      .then((p) => setPortfolio(p))
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          setIsRefreshing(false);
          const t = new Date().toLocaleTimeString('en-GB', { hour12: false });
          setLiveMsg(`Checked at ${t}. Rank not released yet.`);
        }, 1100);
      });
  };

  // Portfolio calculations
  const finalValue =
    portfolio?.portfolioValue ??
    (portfolio?.startingCapital ? Number(portfolio.startingCapital) : 1000000);
  const startValue = portfolio?.startingCapital
    ? Number(portfolio.startingCapital)
    : 1000000;
  const pl = portfolio?.totalPnl ?? (finalValue - startValue);
  const pct = startValue > 0 ? (pl / startValue) * 100 : 0;
  const isPositive = pl >= 0;

  const displayName =
    participant?.displayName || participant?.participantId || 'Participant';
  const participantId = participant?.participantId || 'TRADER';

  // Drifting price line SVG path generator (continuous looping wave)
  const chartPath = useMemo(() => {
    let seed = 7;
    function rnd() {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    }
    const n = 60;
    const ys: number[] = [];
    let y = 0;
    for (let i = 0; i < n; i++) {
      y += (rnd() - 0.5) * 46;
      ys.push(y);
    }
    const drift = ys[n - 1] / (n - 1);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < n; i++) {
      ys[i] -= drift * i;
      if (ys[i] < min) min = ys[i];
      if (ys[i] > max) max = ys[i];
    }
    function pt(i: number, off: number) {
      const x = off + (i / (n - 1)) * 600;
      const range = max - min || 1;
      const yy = 40 + (1 - (ys[i] - min) / range) * 220;
      return x.toFixed(1) + ',' + yy.toFixed(1);
    }
    let d = '';
    for (let i2 = 0; i2 < n; i2++) d += (i2 ? 'L' : 'M') + pt(i2, 0);
    for (let i2 = 1; i2 < n; i2++) d += 'L' + pt(i2, 600);
    return d;
  }, []);

  return (
    <div className="wtr-end-page">
      <style>{`
        .wtr-end-page {
          --ink: #0b0b0c;
          --panel: #141412;
          --tile: #191814;
          --line: #2a2822;
          --text: #f3eee2;
          --muted: #8f8b80;
          --gold: #f2b632;
          --gold-soft: #f7dd9c;
          --go: #2fd08e;
          --bull: #e5245f;
          --display: "Barlow Condensed", "Arial Narrow", Impact, sans-serif;
          --body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
          --mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
          color-scheme: dark;
          position: fixed;
          inset: 0;
          z-index: 100;
          overflow-x: hidden;
          overflow-y: auto;
          background: var(--ink);
          color: var(--text);
          font: 400 15px/1.55 var(--body);
          padding-block: 28px 32px;
          padding-left: max(16px, env(safe-area-inset-left, 0px));
          padding-right: max(16px, env(safe-area-inset-right, 0px));
          box-sizing: border-box;
        }

        .wtr-end-page * {
          box-sizing: border-box;
        }

        .wtr-end-page .chart-bg {
          position: fixed;
          left: 0;
          right: 0;
          top: 34%;
          height: 300px;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
          -webkit-mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
          mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);
        }

        .wtr-end-page .chart-bg svg {
          display: block;
          height: 100%;
          width: 200%;
          animation: wtr-drift 70s linear infinite;
        }

        @keyframes wtr-drift {
          to { transform: translateX(-50%); }
        }

        .wtr-end-page .wrap {
          position: relative;
          z-index: 1;
          max-width: 440px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .wtr-end-page .mast {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
        }

        .wtr-end-page .logo {
          width: 104px;
          height: 80px;
          border-radius: 20px;
          background: var(--tile);
          border: 1px solid rgba(242,182,50,.35);
          display: grid;
          place-items: center;
          overflow: hidden;
          animation: wtr-beat 3.2s ease-in-out infinite;
        }

        .wtr-end-page .logo img {
          width: 92%;
          height: auto;
          display: block;
          object-contain: contain;
        }

        @keyframes wtr-beat {
          0%, 100% { box-shadow: 0 0 18px rgba(242,182,50,.12); }
          50% { box-shadow: 0 0 44px rgba(242,182,50,.34); }
        }

        .wtr-end-page .event {
          margin: 0;
          font: 800 clamp(26px, 8.4vw, 34px)/1 var(--display);
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .wtr-end-page .event em {
          font-style: normal;
          color: var(--gold);
        }

        .wtr-end-page .presented {
          display: inline-flex;
          gap: 8px;
          font: 500 11px/1 var(--mono);
          letter-spacing: .22em;
          text-transform: uppercase;
          color: var(--muted);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 8px 14px;
        }

        .wtr-end-page .presented b {
          color: var(--gold);
          font-weight: 500;
        }

        .wtr-end-page .hero {
          display: flex;
          flex-direction: column;
          gap: 14px;
          text-align: center;
          align-items: center;
        }

        .wtr-end-page .status {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font: 500 11px/1 var(--mono);
          letter-spacing: .2em;
          text-transform: uppercase;
          color: var(--gold-soft);
        }

        .wtr-end-page .status i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--gold);
          animation: wtr-blink 1.4s ease-in-out infinite;
        }

        @keyframes wtr-blink {
          50% { opacity: .25; }
        }

        .wtr-end-page h1 {
          margin: 0;
          font: 800 clamp(48px, 15.5vw, 66px)/.92 var(--display);
          letter-spacing: .005em;
          text-transform: uppercase;
          text-wrap: balance;
        }

        .wtr-end-page h1 span {
          color: var(--gold);
        }

        .wtr-end-page .sub {
          margin: 0;
          color: var(--muted);
          max-width: 30ch;
        }

        .wtr-end-page .track {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          position: relative;
        }

        .wtr-end-page .track li {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          position: relative;
          padding: 0 4px;
        }

        .wtr-end-page .track li::before {
          content: "";
          position: absolute;
          top: 15px;
          right: 50%;
          width: 100%;
          height: 2px;
          background: var(--line);
          z-index: 0;
        }

        .wtr-end-page .track li:first-child::before {
          display: none;
        }

        .wtr-end-page .track li.done::before,
        .wtr-end-page .track li.active::before {
          background: var(--gold);
        }

        .wtr-end-page .track li.locked::before {
          background: repeating-linear-gradient(90deg, var(--line) 0 6px, transparent 6px 12px);
        }

        .wtr-end-page .node {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          position: relative;
          z-index: 1;
          background: var(--ink);
          border: 2px solid var(--line);
          color: var(--muted);
        }

        .wtr-end-page .node svg {
          width: 15px;
          height: 15px;
        }

        .wtr-end-page .done .node {
          border-color: var(--go);
          color: var(--go);
        }

        .wtr-end-page .active .node {
          border-color: var(--gold);
          color: var(--gold);
          animation: wtr-ring 1.8s ease-out infinite;
        }

        @keyframes wtr-ring {
          0% { box-shadow: 0 0 0 0 rgba(242,182,50,.55); }
          100% { box-shadow: 0 0 0 14px rgba(242,182,50,0); }
        }

        .wtr-end-page .step-name {
          font: 600 13px/1.25 var(--body);
          color: var(--text);
        }

        .wtr-end-page .locked .step-name {
          color: var(--muted);
        }

        .wtr-end-page .step-state {
          font: 500 10px/1 var(--mono);
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .wtr-end-page .done .step-state {
          color: var(--go);
        }

        .wtr-end-page .active .step-state {
          color: var(--gold);
        }

        .wtr-end-page .card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 18px;
          overflow: hidden;
        }

        .wtr-end-page .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 18px;
          border-top: 1px solid var(--line);
          min-width: 0;
        }

        .wtr-end-page .row:first-child {
          border-top: 0;
        }

        .wtr-end-page .row > div {
          min-width: 0;
        }

        .wtr-end-page .label {
          display: block;
          font: 500 10.5px/1 var(--mono);
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 7px;
        }

        .wtr-end-page .val {
          font: 600 17px/1.2 var(--body);
          overflow-wrap: anywhere;
        }

        .wtr-end-page .num {
          font: 500 17px/1.2 var(--mono);
          font-variant-numeric: tabular-nums;
        }

        .wtr-end-page .right {
          text-align: right;
        }

        .wtr-end-page .pos {
          color: var(--go);
        }

        .wtr-end-page .neg {
          color: var(--bull);
        }

        .wtr-end-page .pending-row {
          background: linear-gradient(180deg, rgba(242,182,50,.05), rgba(242,182,50,0));
        }

        .wtr-end-page .calc {
          position: relative;
          display: inline-block;
          font: 500 17px/1.2 var(--mono);
          color: var(--gold-soft);
        }

        .wtr-end-page .calc::after {
          content: "";
          position: absolute;
          inset: -3px -6px;
          background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.28) 50%, transparent 80%);
          background-size: 220% 100%;
          mix-blend-mode: overlay;
          animation: wtr-sheen 1.9s linear infinite;
        }

        @keyframes wtr-sheen {
          from { background-position: 160% 0; }
          to { background-position: -60% 0; }
        }

        .wtr-end-page .locked-val {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font: 500 14px/1.3 var(--body);
          color: var(--muted);
          text-align: right;
        }

        .wtr-end-page .locked-val svg {
          width: 15px;
          height: 15px;
          flex: none;
          color: var(--gold);
        }

        .wtr-end-page .final {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-top: 1px solid var(--line);
          background: #10100e;
          font: 500 13px/1.2 var(--body);
        }

        .wtr-end-page .final b {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: var(--go);
          font-weight: 600;
        }

        .wtr-end-page .final b i {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--go);
        }

        .wtr-end-page .final time {
          font: 400 13px/1 var(--mono);
          color: var(--muted);
        }

        .wtr-end-page .note {
          margin: 0;
          text-align: center;
          color: var(--muted);
          font-size: 13.5px;
          text-wrap: balance;
        }

        .wtr-end-page .note b {
          color: var(--text);
          font-weight: 500;
        }

        .wtr-end-page .actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .wtr-end-page button {
          font: 500 14px/1 var(--body);
          color: var(--text);
          background: transparent;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px 20px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          cursor: pointer;
          min-height: 46px;
          transition: border-color .15s, color .15s;
        }

        .wtr-end-page button svg {
          width: 16px;
          height: 16px;
        }

        .wtr-end-page button:hover {
          border-color: #4a463b;
        }

        .wtr-end-page button:focus-visible {
          outline: 2px solid var(--gold);
          outline-offset: 3px;
        }

        .wtr-end-page button.ghost {
          border-color: transparent;
          color: var(--muted);
        }

        .wtr-end-page button.ghost:hover {
          color: var(--text);
        }

        .wtr-end-page button[disabled] {
          opacity: .7;
          cursor: default;
        }

        .wtr-end-page button.spin svg {
          animation: wtr-turn .8s linear infinite;
        }

        @keyframes wtr-turn {
          to { transform: rotate(360deg); }
        }

        .wtr-end-page .live {
          margin: -10px 0 0;
          min-height: 1.4em;
          text-align: center;
          font: 400 12px/1.4 var(--mono);
          color: var(--muted);
        }

        .wtr-end-page .foot {
          margin: 0;
          text-align: center;
          font: 400 11px/1.6 var(--mono);
          letter-spacing: .06em;
          color: #5f5c53;
        }

        @media (prefers-reduced-motion: reduce) {
          .wtr-end-page *, .wtr-end-page *::before, .wtr-end-page *::after {
            animation: none !important;
          }
        }
      `}</style>

      {/* Drifting Background Chart */}
      <div className="chart-bg" aria-hidden="true">
        <svg viewBox="0 0 1200 300" preserveAspectRatio="none">
          <line x1="0" x2="1200" y1="50" y2="50" stroke="#f3eee2" strokeOpacity=".05" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2="1200" y1="100" y2="100" stroke="#f3eee2" strokeOpacity=".05" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2="1200" y1="150" y2="150" stroke="#f3eee2" strokeOpacity=".05" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2="1200" y1="200" y2="200" stroke="#f3eee2" strokeOpacity=".05" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2="1200" y1="250" y2="250" stroke="#f3eee2" strokeOpacity=".05" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path
            d={chartPath}
            fill="none"
            stroke="#f2b632"
            strokeOpacity=".28"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <main className="wrap">
        {/* Masthead */}
        <header className="mast">
          <div className="logo">
            <img
              alt="Warangal Trading Ring bull logo"
              src="/logo.png"
            />
          </div>
          <h2 className="event">
            Warangal Trading Ring <em>2.0</em>
          </h2>
          <div className="presented">
            Presented by <b>FinWiz</b>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="status">
            <i></i>Market closed
          </div>
          <h1>
            Your risk is being <span>ranked.</span>
          </h1>
          <p className="sub">Returns counted. Risk weighed. Rank on its way.</p>
        </section>

        {/* 3-Step Tracker */}
        <ol className="track" aria-label="Results progress">
          <li className="done">
            <span className="node">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8.5l3.2 3.2L13 4.8" />
              </svg>
            </span>
            <span className="step-name">Trades locked</span>
            <span className="step-state">Done</span>
          </li>
          <li className="active" aria-current="step">
            <span className="node">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12l3.5-4 3 2.5L14 4" />
                <path d="M10.5 4H14v3.5" />
              </svg>
            </span>
            <span className="step-name">Risk measured</span>
            <span className="step-state">In progress</span>
          </li>
          <li className="locked">
            <span className="node">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" />
                <path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" />
              </svg>
            </span>
            <span className="step-name">Rank revealed</span>
            <span className="step-state">Locked</span>
          </li>
        </ol>

        {/* Result Card */}
        <section className="card" aria-label="Your result">
          <div className="row">
            <div>
              <span className="label">Participant name</span>
              <span className="val">{displayName}</span>
            </div>
            <div className="right">
              <span className="label">ID</span>
              <span className="val">{participantId}</span>
            </div>
          </div>
          <div className="row">
            <div>
              <span className="label">Final portfolio value</span>
              <span className="num">{inr(finalValue)}</span>
            </div>
            <div className="right">
              <span className="label">Net P&amp;L</span>
              <span className={`num ${isPositive ? 'pos' : 'neg'}`}>
                {isPositive ? '+' : '−'}
                {inr(pl)} ({isPositive ? '+' : '−'}
                {Math.abs(pct).toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="row pending-row">
            <div>
              <span className="label">Risk score</span>
              <span className="calc">Calculating…</span>
            </div>
            <div className="right">
              <span className="label">Basis</span>
              <span className="val" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--muted)' }}>
                Returns vs. risk taken
              </span>
            </div>
          </div>
          <div className="row">
            <div>
              <span className="label">Rank</span>
            </div>
            <div className="right locked-val">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="7" width="9" height="6.5" rx="1.6" />
                <path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" />
              </svg>
              Revealed at the closing ceremony
            </div>
          </div>
          <div className="final">
            <b>
              <i></i>Submission finalized
            </b>
            <time>{submittedAt}</time>
          </div>
        </section>

        <p className="note">
          Official standings go to the event administrators first.{' '}
          <b>Winners are announced at the closing ceremony.</b>
        </p>

        {/* Actions */}
        <div className="actions">
          <button type="button" onClick={onLogout} aria-label="Sign out">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 2.5h-3a1 1 0 00-1 1v9a1 1 0 001 1h3" />
              <path d="M10 5l3 3-3 3M13 8H6" />
            </svg>
            Sign out
          </button>
          <button
            type="button"
            className={`ghost ${isRefreshing ? 'spin' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh status"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 3v3.2h-3.2" />
              <path d="M13 6.2A5.5 5.5 0 103.2 10" />
            </svg>
            <span>{isRefreshing ? 'Checking…' : 'Refresh status'}</span>
          </button>
        </div>

        {liveMsg && (
          <p className="live" role="status" aria-live="polite">
            {liveMsg}
          </p>
        )}

        <p className="foot">Warangal Trading Ring 2.0 • Powered by FinWiz • NIT Warangal</p>
      </main>
    </div>
  );
}
