import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Activity, CircleHelp, PieChart, Sparkles, Target, Users } from 'lucide-react';

const SAMPLE_PORTFOLIO = {
  label: 'Sample portfolio (illustrative)',
  totalValue: 2418350,
  totalReturnPercent: 18.3,
  rollingReturnPercent: 14.8,
  healthScore: 84,
  diversificationPercent: 92,
  allocation: [
    { name: 'Equity', percent: 68, color: 'var(--series-7)' },
    { name: 'Debt', percent: 22, color: '#a855f7' },
    { name: 'Hybrid', percent: 10, color: 'var(--text-muted)' },
  ],
  holdings: [
    { name: 'Mirae Asset Large Cap', returnPercent: 22.1, value: '8.24L' },
    { name: 'Parag Parikh Flexi Cap', returnPercent: 19.4, value: '6.12L' },
    { name: 'HDFC Midcap Opp.', returnPercent: 31.2, value: '4.18L' },
  ],
  family: [
    { name: 'Self', value: '14.2L', color: 'var(--series-7)' },
    { name: 'Spouse', value: '8.4L', color: 'var(--brand)' },
    { name: 'Kids', value: '1.5L', color: 'var(--series-4)' },
  ],
  goals: [
    { name: 'Retirement', saved: '45.0L', target: '1.5Cr', progress: 30, status: 'On track' },
    { name: 'New Home', saved: '22.0L', target: '2Cr', progress: 25, status: 'Planning' },
  ],
};

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return reducedMotion || !('IntersectionObserver' in window) ? target : 0;
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (!('IntersectionObserver' in window)) {
      root.classList.add('portfolio-in-view');
      return;
    }

    let frame = 0;
    let startedAt: number | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      root.classList.add('portfolio-in-view');
      if (reducedMotion) return;

      const animate = (time: number) => {
        startedAt ??= time;
        const progress = Math.min((time - startedAt) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        setValue(Math.round(target * eased));
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }, { threshold: 0.25 });

    observer.observe(root);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [duration, target]);

  return {
    rootRef,
    formattedValue: value.toLocaleString('en-IN'),
  };
}

function Sparkline() {
  return (
    <svg className="portfolio-sparkline" viewBox="0 0 360 64" role="img" aria-label="Illustrative portfolio value trend">
      <defs>
        <linearGradient id="sample-portfolio-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10d6a0" stopOpacity=".24" />
          <stop offset="100%" stopColor="#10d6a0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sample-portfolio-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#10d6a0" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path d="M0 54 C28 51 35 48 57 45 S92 46 112 44 S137 35 164 34 S204 31 225 25 S264 23 286 18 S329 15 360 9 V64 H0 Z" fill="url(#sample-portfolio-fill)" />
      <path className="portfolio-sparkline-path" d="M0 54 C28 51 35 48 57 45 S92 46 112 44 S137 35 164 34 S204 31 225 25 S264 23 286 18 S329 15 360 9" fill="none" stroke="url(#sample-portfolio-line)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PortfolioShowcase() {
  const { rootRef, formattedValue } = useCountUp(SAMPLE_PORTFOLIO.totalValue);

  return (
    <section className="portfolio-showcase-section px-5 pb-14 pt-5 sm:px-8 sm:pb-20 sm:pt-8" aria-labelledby="sample-portfolio-title">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="landing-eyebrow">Portfolio overview</p>
            <h2 id="sample-portfolio-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">A clearer view of the whole picture</h2>
          </div>
          <span className="sample-portfolio-label"><CircleHelp size={13} /> {SAMPLE_PORTFOLIO.label}</span>
        </div>

        <div className="portfolio-showcase-grid" ref={rootRef}>
          <article className="portfolio-main-card">
            <div className="portfolio-value-row">
              <div>
                <p className="portfolio-overline">Sample total invested value</p>
                <p className="portfolio-value" aria-label={`Illustrative sample value ${formattedValue} rupees`}>
                  <span className="portfolio-currency">₹</span>{formattedValue}
                </p>
                <p className="portfolio-muted">Illustrative sample value, not account data</p>
              </div>
              <div className="portfolio-return">
                <span>+{SAMPLE_PORTFOLIO.totalReturnPercent}%</span>
                <small>Sample XIRR</small>
              </div>
            </div>
            <Sparkline />

            <div className="portfolio-block">
              <h3 className="portfolio-overline">Allocation</h3>
              <div className="portfolio-allocation-list">
                {SAMPLE_PORTFOLIO.allocation.map(({ name, percent, color }, index) => (
                  <div className="portfolio-allocation-row" key={name}>
                    <span>{name}</span>
                    <div className="portfolio-track" role="img" aria-label={`${name}: ${percent}% sample allocation`}>
                      <span className="portfolio-bar-fill" style={{ '--bar-value': `${percent}%`, '--bar-color': color, '--bar-delay': `${index * 100}ms` } as CSSProperties} />
                    </div>
                    <strong>{percent}%</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="portfolio-block portfolio-holdings">
              <h3 className="portfolio-overline">Top 3 sample holdings</h3>
              <ul>
                {SAMPLE_PORTFOLIO.holdings.map((holding, index) => (
                  <li className="portfolio-holding" key={holding.name} style={{ '--item-delay': `${index * 110}ms` } as CSSProperties}>
                    <span className="portfolio-holding-dot" />
                    <span className="portfolio-holding-name">{holding.name}</span>
                    <span className="portfolio-holding-return">+{holding.returnPercent}%<small>₹{holding.value}</small></span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <div className="portfolio-side-grid">
            <article className="portfolio-stat-card portfolio-stat-teal">
              <div className="portfolio-stat-heading"><span>3Y rolling return</span><Activity size={15} /></div>
              <div className="portfolio-stat-value">{SAMPLE_PORTFOLIO.rollingReturnPercent}%</div>
              <p>Illustrative sample metric</p>
            </article>

            <article className="portfolio-stat-card portfolio-stat-teal">
              <div className="portfolio-stat-heading"><span>Health score</span><Activity size={15} /></div>
              <div className="portfolio-score-line"><strong>{SAMPLE_PORTFOLIO.healthScore}<small>/100</small></strong><span>Sample score</span></div>
              <div className="portfolio-track portfolio-score-track"><span style={{ width: `${SAMPLE_PORTFOLIO.healthScore}%` }} /></div>
              <p>Illustrative only · no personal data</p>
            </article>

            <article className="portfolio-stat-card portfolio-stat-purple">
              <div className="portfolio-stat-heading"><span>Diversification</span><PieChart size={15} /></div>
              <div className="portfolio-score-line"><strong>{SAMPLE_PORTFOLIO.diversificationPercent}%</strong><span>Sample estimate</span></div>
              <div className="portfolio-allocation-strip" aria-label="Illustrative sample allocation">
                {SAMPLE_PORTFOLIO.allocation.map(({ name, percent, color }) => <span key={name} title={`${name}: ${percent}%`} style={{ width: `${percent}%`, background: color }} />)}
              </div>
            </article>

            <article className="portfolio-stat-card portfolio-stat-purple">
              <div className="portfolio-stat-heading"><span>Family group · sample</span><Users size={15} /></div>
              <ul className="portfolio-family-list">
                {SAMPLE_PORTFOLIO.family.map(({ name, value, color }) => (
                  <li key={name}><span><i style={{ background: color }} />{name}</span><strong>₹{value}</strong></li>
                ))}
              </ul>
            </article>

            <article className="portfolio-stat-card portfolio-stat-purple">
              <div className="portfolio-stat-heading"><span>Financial goals · sample</span><Target size={15} /></div>
              {SAMPLE_PORTFOLIO.goals.map(({ name, saved, target, progress, status }) => (
                <div className="portfolio-goal" key={name}>
                  <div className="portfolio-goal-heading"><span><Sparkles size={12} />{name}</span><small>{status}</small></div>
                  <div className="portfolio-goal-value"><strong>₹{saved}</strong><span>/ ₹{target}</span></div>
                  <div className="portfolio-track portfolio-goal-track"><span style={{ width: `${progress}%` }} /></div>
                </div>
              ))}
            </article>
          </div>
        </div>
        <p className="portfolio-disclaimer">Every figure on this card is static illustrative sample data from the design mockup. It is not fetched from the API, linked to a user account, or investment advice.</p>
      </div>
    </section>
  );
}
