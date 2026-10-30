import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, BarChart3, Check, ChevronRight, Database,
  LineChart, Menu, MessageCircle, ShieldCheck, Sparkles, TrendingUp, Wallet, X,
} from 'lucide-react';
import FAQ, { type FAQItem } from '../components/FAQ';
import HeroMarketFlipCard from '../components/HeroMarketFlipCard';
import MarketArt from '../components/MarketArt';
import PortfolioShowcase from '../components/PortfolioShowcase';
import { LANDING_STATS } from '../config/landingStats';
import './Landing.css';

const FEATURES = [
  { icon: BarChart3, title: 'Overview', text: 'Review historical risk and return measures calculated from the available NAV data.', to: '/app/overview' },
  { icon: LineChart, title: 'Fund Explorer', text: 'Filter schemes and compare fund returns with index funds over identical observed dates.', to: '/app/explore' },
  { icon: TrendingUp, title: 'Calculators', text: 'Explore illustrative projections using assumptions you choose; these are not forecasts.', to: '/app/calculators' },
  { icon: Wallet, title: 'Portfolio', text: 'Estimate outcomes from values you enter. Holdings are not saved to an account.', to: '/app/portfolio' },
];

const PRIMARY_PAGES = [
  ['Overview', '/app/overview'],
  ['Fund Explorer', '/app/explore'],
  ['Calculators', '/app/calculators'],
  ['Portfolio', '/app/portfolio'],
];

const WORKFLOW = [
  ['01', 'Inspect the source', 'Check the dataset type, source, and dates before reading a result.'],
  ['02', 'Compare matched periods', 'Fund/index returns use the same observed dates for each pair.'],
  ['03', 'Review the limits', 'Historical measures and illustrative calculations are not forecasts or advice.'],
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Where does the historical NAV data come from?',
    answer: 'The configured real-data source is MFapi.in, a third-party aggregator and not the official AMFI site. The app marks synthetic demo data separately when that dataset is active.',
  },
  {
    question: 'Is FundScope investment advice?',
    answer: 'No. It is educational historical analytics, not investment advice, a recommendation, or a prediction. Historical returns do not predict future results.',
  },
  {
    question: 'What does a fund/index comparison mean?',
    answer: 'Each comparison uses the exact dates present for both schemes, and shows the start and end dates used. Coverage differs by scheme, so compare those dates as well as the returns.',
  },
  {
    question: 'Are calculator results forecasts?',
    answer: 'No. The calculators apply fixed user-entered assumptions to illustrative formulas. They do not model future market conditions or guarantee an outcome.',
  },
  {
    question: 'Is portfolio information saved?',
    answer: 'No. Values entered in the portfolio estimator are used for an in-session calculation and are not saved as account holdings.',
  },
  {
    question: 'Who is this project for?',
    answer: 'It is a research and learning tool for people who want to inspect historical Indian mutual-fund NAV data, understand common return and risk measures, and see how dates and sources affect comparisons.',
  },
];

const TECH_STACK = ['FastAPI', 'React', 'TypeScript', 'SQLite', 'Power BI'];

const CURRENT_YEAR = new Date().getFullYear();

function DatasetScaleStats() {
  const stats = [
    { label: 'Tracked schemes', value: String(LANDING_STATS.trackedSchemes) },
    { label: 'NAV data points', value: LANDING_STATS.navDataPoints.toLocaleString('en-IN') },
    { label: 'Fund categories', value: String(LANDING_STATS.fundCategories) },
    { label: 'Years of history', value: `${LANDING_STATS.yearsOfHistory}+` },
  ];

  return (
    <section aria-label="Dataset scale" className="border-y px-5 py-10 sm:px-8" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 sm:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="text-center sm:text-left">
            <span className="dataset-stat-value">{value}</span>
            <div className="mt-1 text-[10.5px] font-medium ink-muted">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AppLink({ to, children, className = '', style, onClick }: { to: string; children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <Link to={`/login?next=${encodeURIComponent(to)}`} className={className} style={style} onClick={onClick}>{children}</Link>;
}

export default function Landing() {
  const progressRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('.landing-page main > section');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('landing-reveal', 'is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    sections.forEach((section) => {
      section.classList.add('landing-reveal');
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const progress = progressRef.current;
    if (!progress) return;

    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const amount = scrollable > 0 ? window.scrollY / scrollable : 0;
        progress.style.setProperty('--scroll-progress', String(Math.min(1, Math.max(0, amount))));
      });
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="landing-page min-h-screen overflow-hidden" style={{ background: 'var(--page-plane)', color: 'var(--text-primary)' }}>
      <div className="landing-scroll-progress" ref={progressRef} aria-hidden="true" />
      <header className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--page-plane) 92%, transparent)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3.5 sm:px-8">
          <a href="#home" className="flex items-center gap-2.5" aria-label="FundScope India home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl ink-on-brand"
              style={{ background: 'linear-gradient(145deg,var(--brand-ink),var(--brand))' }}>
              <BarChart3 size={19} strokeWidth={2.5} />
            </span>
            <span className="text-[15px] font-extrabold tracking-tight">FundScope <span style={{ color: 'var(--brand-ink)' }}>India</span></span>
          </a>

          <nav className="hidden items-center gap-6 text-[12.5px] font-medium ink-secondary lg:flex" aria-label="Main navigation">
            {PRIMARY_PAGES.map(([label, path]) => (
              <AppLink key={path} to={path} className="transition hover:text-white">{label}</AppLink>
            ))}
            <a href="#ai-analysis" className="transition hover:text-white">AI analysis</a>
          </nav>

          <div className="hidden items-center gap-2.5 lg:flex">
            <Link to="/login" className="rounded-lg px-3 py-2 text-[12.5px] font-semibold ink-secondary transition hover:bg-white/5 hover:text-white">Sign in</Link>
            <AppLink to="/app/overview" className="brand-cta inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12.5px] font-bold transition hover:brightness-110">
              Get started <ArrowRight size={14} />
            </AppLink>
          </div>

          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}
            aria-controls="landing-mobile-navigation">
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {menuOpen && (
          <nav id="landing-mobile-navigation" className="border-t px-5 py-3 lg:hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }} aria-label="Mobile navigation">
            <div className="flex flex-col items-stretch gap-1">
              {PRIMARY_PAGES.map(([label, path]) => (
                <AppLink key={path} to={path} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm ink-secondary hover:bg-white/5">{label}</AppLink>
              ))}
              <a href="#ai-analysis" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm ink-secondary hover:bg-white/5">AI analysis</a>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold ink-brand">Sign in / Get started</Link>
            </div>
          </nav>
        )}
      </header>

      <main id="home">
        <section className="landing-hero relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-8 pt-16 sm:px-8 sm:pb-10 sm:pt-24 lg:grid-cols-[1.03fr_.97fr] lg:gap-16">
          <div className="landing-aurora" />
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide"
              style={{ borderColor: 'var(--brand-surface-strong)', background: 'var(--brand-surface)', color: 'var(--brand-ink)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--status-good)' }} />
              INDIAN MUTUAL FUND ANALYTICS
            </div>
            <h1 className="max-w-3xl text-[clamp(2.7rem,6.1vw,5rem)] font-bold leading-[1.04] tracking-[-.055em]">
              Understand your investments.{' '}
              <span style={{ color: 'var(--brand-ink)' }}>See the data clearly.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-7 ink-secondary sm:text-base">
              FundScope is an educational research workspace for people inspecting historical Indian mutual-fund NAV data. Compare observed returns and risk, review exact comparison dates, and try illustrative calculators. It does not recommend funds or predict future performance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <AppLink to="/app/overview" className="brand-cta inline-flex items-center gap-2 rounded-lg px-5 py-3 text-[13px] font-bold transition hover:brightness-110">
                Explore the dashboard <ArrowRight size={16} />
              </AppLink>
              <a href="#features" className="inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-[13px] font-semibold ink-secondary transition hover:bg-white/5"
                style={{ borderColor: 'var(--border-strong)' }}>
                Explore features <ArrowDown size={15} />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[11.5px] ink-secondary">
              {['Historical data, not predictions', 'Risk metrics with context', 'Source-aware analysis'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <Check size={14} style={{ color: 'var(--status-good)' }} /> {item}
                </span>
              ))}
            </div>
          </div>

          <HeroMarketFlipCard />
        </section>

        <PortfolioShowcase />

        <DatasetScaleStats />

        <section aria-label="Historical market data visualization" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:py-24">
          <div className="order-2 lg:order-1">
            <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--brand-ink)' }}>How the data is read</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-[38px]">Candles, not a trading-floor photo.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 ink-secondary">
              This chart is an illustration, not market data or a live feed. The analytics use dated NAV observations from the selected project dataset; each page identifies synthetic demo data when it is active.
            </p>
            <p className="mt-4 max-w-md text-[11.5px] leading-6 ink-muted">
              Check the source and date range before interpreting any historical comparison. Metrics summarize the observations available in this repository and do not account for fees, taxes, or investor cash flows.
            </p>
          </div>
          <div className="order-1 rounded-2xl border p-5 sm:p-7 lg:order-2" style={{ borderColor: 'var(--border)', background: 'linear-gradient(150deg,var(--surface),var(--surface-sunken))' }}>
            <MarketArt className="h-56 w-full sm:h-72" />
            <div className="mt-4 flex items-center justify-between text-[10px] ink-muted">
              <span>Illustrative pattern, not a live feed</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--status-good)' }} /> Up <span className="ml-2 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--status-critical)' }} /> Down</span>
            </div>
          </div>
        </section>

        <section id="features" className="border-y px-5 py-20 sm:px-8" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--brand-ink)' }}>Built around the analysis</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-[38px]">A focused toolkit for fund research</h2>
              <p className="mt-3 text-sm leading-6 ink-secondary">Move from source data to historical context without overstating what the numbers can tell you.</p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, text, to }, index) => (
                <AppLink key={title} to={to} className="feature-link group rounded-xl border p-5 transition hover:-translate-y-0.5"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ color: 'var(--brand-ink)', background: 'var(--brand-surface)' }}>
                      <Icon size={17} />
                    </span>
                    <span className="text-[10px] font-semibold tabular ink-muted">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-[13px] font-bold">{title}</h3>
                  <p className="mt-2 min-h-[56px] text-[11px] leading-[1.65] ink-secondary">{text}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold ink-brand">Explore <ChevronRight size={13} className="transition group-hover:translate-x-0.5" /></span>
                </AppLink>
              ))}
            </div>
          </div>
        </section>

        <section id="ai-analysis" className="ai-analysis-section px-5 py-16 sm:px-8 sm:py-20" aria-labelledby="ai-analysis-title">
          <div className="ai-analysis-grid mx-auto max-w-6xl">
            <div>
              <div className="ai-analysis-banner"><Sparkles size={15} /> AI POWERED ANALYSIS</div>
              <h2 id="ai-analysis-title" className="mt-5 text-3xl font-bold tracking-tight sm:text-[38px]">AI-powered analysis</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 ink-secondary">
                Ask questions about the project’s mutual-fund dataset and explore concise insights grounded in its available fund metrics. When an AI provider is not configured or available, a rule-based fallback can still provide basic descriptive insights.
              </p>
              <p className="mt-3 max-w-xl text-[11px] leading-6 ink-muted">
                Responses describe historical data; they are not investment advice, recommendations, or predictions. The conversation shown here is a static example, not a live analysis.
              </p>
              <AppLink to="/app/overview" className="brand-cta mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-[12px] font-bold">
                <MessageCircle size={15} /> Explore the workspace <ArrowRight size={14} />
              </AppLink>
            </div>
            <div className="ai-example-card" aria-label="Static AI chat example">
              <div className="ai-example-label"><Sparkles size={13} className="mr-1 inline" /> Example · static preview</div>
              <div className="ai-chat-bubble ai-chat-question">
                What should I keep in mind when comparing these funds?
              </div>
              <div className="ai-chat-bubble ai-chat-answer">
                Compare each fund over the dates available for both it and its benchmark. The observed periods can differ across schemes, and historical returns and risk measures do not predict future performance.
              </div>
              <p className="ai-chat-note">Illustrative example only · no API request is made</p>
            </div>
          </div>
        </section>

        <section id="analytics" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-24">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--brand-ink)' }}>Context before conclusions</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-[38px]">Read the history, not a promise.</h2>
            <p className="mt-4 text-sm leading-7 ink-secondary">
              Performance and risk measures depend on the selected data and period. FundScope presents them as historical analysis—not a forecast or a recommendation.
            </p>
            <AppLink to="/app/explore" className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold ink-brand hover:text-white">
              Explore available metrics <ArrowRight size={14} />
            </AppLink>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Return history', 'Review period returns and CAGR alongside the dates covered.'],
              ['Downside context', 'See maximum drawdown as a historical peak-to-trough measure.'],
              ['Risk estimates', 'Inspect annualized volatility and Sharpe ratio assumptions.'],
              ['Data coverage', 'Check source and date coverage before comparing schemes.'],
            ].map(([title, copy], index) => (
              <div key={title} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
                <div className="text-[10px] font-bold tracking-widest" style={{ color: 'var(--brand-ink)' }}>0{index + 1}</div>
                <h3 className="mt-2 text-[13px] font-bold">{title}</h3>
                <p className="mt-2 text-[11px] leading-relaxed ink-secondary">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y px-5 py-20 sm:px-8" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
          <div className="mx-auto max-w-7xl">
            <div className="max-w-xl">
              <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--brand-ink)' }}>A simple workflow</div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">From data to perspective</h2>
            </div>
            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW.map(([number, title, copy]) => (
                <div key={number} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
                  <span className="text-[11px] font-bold tabular" style={{ color: 'var(--brand-ink)' }}>{number}</span>
                  <h3 className="mt-3 text-[12px] font-bold">{title}</h3>
                  <p className="mt-2 text-[10.5px] leading-relaxed ink-secondary">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="border-y px-5 py-20 sm:px-8" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--brand-ink)' }}>Frequently asked</div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-[38px]">Questions people actually ask</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 ink-secondary">Straight answers about the data, the limits, and what this project is not.</p>
          </div>
          <div className="mt-10">
            <FAQ items={FAQ_ITEMS} />
          </div>
        </section>

        <section id="data-and-privacy" className="mx-auto grid max-w-7xl gap-5 px-5 py-20 sm:px-8 md:grid-cols-2">
          <div className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg,var(--surface),var(--surface-sunken))' }}>
            <Database size={20} style={{ color: 'var(--brand-ink)' }} />
            <h2 className="mt-4 text-xl font-bold">Data sources & limitations</h2>
            <p className="mt-3 text-[12px] leading-6 ink-secondary">
              The configured NAV catalogue contains direct-plan schemes across equity, debt, and index categories through MFapi.in, a third-party source that is not AMFI. A separate synthetic dataset is used for demos. Source, date range, and demo status are surfaced where available.
            </p>
            <p className="mt-3 text-[11px] leading-5 ink-muted">Data coverage and freshness depend on the configured source. This app does not claim exchange-grade real-time market data.</p>
          </div>
          <div className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg,var(--surface),var(--surface-sunken))' }}>
            <ShieldCheck size={20} style={{ color: 'var(--brand-ink)' }} />
            <h2 className="mt-4 text-xl font-bold">Privacy & responsible use</h2>
            <p className="mt-3 text-[12px] leading-6 ink-secondary">
              Portfolio estimates are temporary in-session calculations and are not saved as account holdings. Sign-in protects the application API. Production identity-provider credentials and deployment settings must be configured separately; do not enter sensitive account credentials or identifiers.
            </p>
            <p className="mt-3 text-[11px] leading-5 ink-muted">Mutual fund investments are subject to market risks. Historical performance does not guarantee future results. This project is not investment advice.</p>
          </div>
        </section>

        <section className="mx-5 mb-16 rounded-2xl border px-6 py-10 text-center sm:mx-8 sm:px-10 sm:py-14"
          style={{ borderColor: 'var(--brand-surface-strong)', background: 'radial-gradient(ellipse at 50% 0%,var(--brand-surface),transparent 60%),var(--surface)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--brand-ink)' }}>Explore with context</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">Bring your questions. Start with the data.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[12px] leading-6 ink-secondary">Open the analytics workspace to explore the dataset currently configured in this project.</p>
          <AppLink to="/app/overview" className="brand-cta mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-[12px] font-bold transition hover:brightness-110">
            Open dashboard <ArrowRight size={15} />
          </AppLink>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--page-plane)' }}>
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 border-b py-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_.9fr_.9fr_.9fr]" style={{ borderColor: 'var(--border)' }}>
            <div>
              <a href="#home" className="inline-flex items-center gap-2 text-[13px] font-extrabold">
                <BarChart3 size={17} style={{ color: 'var(--brand-ink)' }} /> FundScope India
              </a>
              <p className="mt-2 max-w-xs text-[11px] leading-relaxed ink-muted">Historical mutual fund analytics, presented with context and care. Educational use only — not investment advice.</p>
              <div className="mt-5 flex flex-wrap items-center gap-1.5">
                {TECH_STACK.map((tech) => (
                  <span key={tech} className="rounded-full border px-2.5 py-1 text-[9.5px] font-medium ink-muted" style={{ borderColor: 'var(--border-strong)' }}>{tech}</span>
                ))}
              </div>
            </div>
            <nav aria-label="Footer: explore" className="flex flex-col items-start gap-2.5 text-[11px] ink-secondary">
              <span className="mb-1 text-[10px] font-bold uppercase tracking-widest ink-primary">Explore</span>
              {PRIMARY_PAGES.map(([label, path]) => <AppLink key={path} to={path} className="hover:text-white">{label}</AppLink>)}
            </nav>
            <nav aria-label="Footer: workspace" className="flex flex-col items-start gap-2.5 text-[11px] ink-secondary">
              <span className="mb-1 text-[10px] font-bold uppercase tracking-widest ink-primary">Workspace</span>
              <AppLink to="/app/overview#key-findings" className="hover:text-white">Key findings</AppLink>
              <AppLink to="/app/explore" className="hover:text-white">Fund Explorer</AppLink>
              <AppLink to="/app/calculators" className="hover:text-white">Calculators</AppLink>
              <AppLink to="/app/portfolio" className="hover:text-white">Portfolio</AppLink>
              <Link to="/login" className="hover:text-white">Sign in</Link>
            </nav>
            <nav aria-label="Footer: about" className="flex flex-col items-start gap-2.5 text-[11px] ink-secondary">
              <span className="mb-1 text-[10px] font-bold uppercase tracking-widest ink-primary">About</span>
              <a href="#data-and-privacy" className="hover:text-white">Data & privacy</a>
              <a href="#disclaimer" className="hover:text-white">Disclaimer</a>
            </nav>
          </div>
          <div id="disclaimer" className="flex flex-col gap-3 py-5 text-[10px] ink-muted sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl leading-relaxed"><span className="font-semibold ink-secondary">Disclaimer:</span> Mutual fund investments are subject to market risks. Past performance is not indicative of future returns. FundScope India provides educational analytics and is not an investment adviser.</p>
            <span className="shrink-0">© {CURRENT_YEAR} FundScope India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
