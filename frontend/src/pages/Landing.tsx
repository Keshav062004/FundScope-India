import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, BarChart3, Check, ChevronRight, Database,
  LineChart, Menu, ShieldCheck, TrendingUp, Wallet, X,
} from 'lucide-react';
import { api, fmtPct, type DatasetResponse } from '../api';
import FAQ, { type FAQItem } from '../components/FAQ';
import { EmptyState, ErrorState, LoadingState, SyntheticDataBanner } from '../components/DataState';
import MarketArt from '../components/MarketArt';

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

function AppLink({ to, children, className = '', style, onClick }: { to: string; children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <Link to={`/login?next=${encodeURIComponent(to)}`} className={className} style={style} onClick={onClick}>{children}</Link>;
}

function MetricValue({ value }: { value: number | null | undefined }) {
  return <span>{fmtPct(value)}</span>;
}

export default function Landing() {
  const [dataset, setDataset] = useState<DatasetResponse | null>(null);
  const [datasetState, setDatasetState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [datasetError, setDatasetError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.getData().then((result) => {
      if (!active) return;
      setDataset(result);
      setDatasetState('ready');
    }).catch((error: unknown) => {
      if (!active) return;
      setDatasetState('unavailable');
      setDatasetError(error instanceof Error ? error.message : 'Dataset request failed.');
    });
    return () => { active = false; };
  }, []);

  function retryDataset() {
    setDatasetState('loading');
    setDatasetError('');
    api.getData().then((result) => {
      setDataset(result);
      setDatasetState('ready');
    }).catch((error: unknown) => {
      setDatasetState('unavailable');
      setDatasetError(error instanceof Error ? error.message : 'Dataset request failed.');
    });
  }

  const metrics = dataset?.metrics ?? [];
  const cagrValues = metrics.map((metric) => metric.cagr).filter((value): value is number => value != null);
  const drawdowns = metrics.map((metric) => metric.max_drawdown).filter((value): value is number => value != null);
  const averageCagr = cagrValues.length ? cagrValues.reduce((sum, value) => sum + value, 0) / cagrValues.length : null;
  const worstDrawdown = drawdowns.length ? Math.min(...drawdowns) : null;
  const schemeCount = new Set(metrics.map((metric) => metric.scheme_name)).size;
  const categoryCount = new Set(metrics.map((metric) => metric.category)).size;
  const navPointCount = dataset?.nav.length ?? 0;
  const earliestDate = metrics.reduce<string | null>((earliest, metric) =>
    !earliest || metric.start_date < earliest ? metric.start_date : earliest, null);
  const latestDate = metrics.reduce<string | null>((latest, metric) =>
    !latest || metric.end_date > latest ? metric.end_date : latest, null);
  const yearsOfHistory = earliestDate && latestDate
    ? Math.max(1, Math.floor((new Date(latestDate).getTime() - new Date(earliestDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : null;
  const previewScheme = metrics[0];
  const previewNav = dataset?.nav
    .filter((point) => point.scheme_code === previewScheme?.scheme_code)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-16) ?? [];
  const navRange = previewNav.length
    ? Math.max(...previewNav.map((point) => point.nav)) - Math.min(...previewNav.map((point) => point.nav))
    : 0;

  return (
    <div className="min-h-screen overflow-hidden" style={{ background: 'var(--page-plane)', color: 'var(--text-primary)' }}>
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
              <Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold ink-brand">Sign in / Get started</Link>
            </div>
          </nav>
        )}
      </header>

      <main id="home">
        <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.03fr_.97fr] lg:gap-16 lg:pb-28">
          <div className="pointer-events-none absolute -left-64 -top-56 h-[560px] w-[560px] rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle,var(--brand) 0%,transparent 68%)' }} />
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

          <section aria-label="Live project dataset preview" className="relative z-10 rounded-2xl border p-3 shadow-2xl sm:p-4"
            style={{ borderColor: 'var(--border-strong)', background: 'linear-gradient(150deg,var(--surface),var(--surface-sunken))', boxShadow: 'var(--shadow-preview)' }}>
            <div className="flex items-center justify-between gap-3 border-b px-2 pb-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="text-[12px] font-semibold ink-primary">Dataset snapshot</div>
                <div className="mt-1 text-[10px] ink-muted">Values are calculated from the dataset returned by the project API</div>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
                style={{ borderColor: dataset?.synthetic ? 'color-mix(in srgb, var(--status-warning) 24%, transparent)' : 'color-mix(in srgb, var(--status-good) 20%, transparent)', background: dataset?.synthetic ? 'var(--status-warning-surface)' : 'var(--status-good-surface)', color: dataset?.synthetic ? 'var(--status-warning)' : 'var(--brand-ink)' }}>
                {datasetState === 'loading' ? 'Connecting' : datasetState === 'unavailable' ? 'Offline' : dataset?.synthetic ? 'Synthetic demo' : 'Historical data'}
              </span>
            </div>

            {datasetState === 'ready' && metrics.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-2.5 py-4">
                  {[
                    ['Average CAGR', <MetricValue key="cagr" value={averageCagr} />],
                    ['Worst drawdown', <MetricValue key="drawdown" value={worstDrawdown} />],
                    ['Schemes', String(schemeCount)],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
                      <div className="text-[9.5px] ink-muted">{label}</div>
                      <div className="mt-1 text-[15px] font-bold tabular ink-primary">{value}</div>
                    </div>
                  ))}
                </div>
                <p className="mb-3 text-[9px] leading-relaxed ink-muted">
                  CAGR and drawdown use each scheme's full available period; ranges may differ.
                </p>
                <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold ink-primary">NAV history</div>
                      <div className="mt-1 max-w-[240px] truncate text-[9px] ink-muted">{previewScheme?.scheme_name ?? 'No scheme selected'}</div>
                    </div>
                    <span className="text-right text-[9px] ink-muted">
                      {previewNav.length ? `${previewNav.length} points · ${previewNav[0].date} – ${previewNav[previewNav.length - 1].date}` : 'No history available'}
                    </span>
                  </div>
                  {previewNav.length > 1 ? (
                    <div className="mt-4 flex h-28 items-end gap-1" role="img" aria-label={`Historical NAV bar chart for ${previewScheme?.scheme_name}`}>
                      {previewNav.map((point) => {
                        const percent = navRange > 0 ? ((point.nav - Math.min(...previewNav.map((item) => item.nav))) / navRange) : 0.5;
                        return <div key={`${point.date}-${point.scheme_code}`} title={`${point.date}: ${point.nav.toFixed(4)}`}
                          className="min-w-0 flex-1 rounded-t-sm transition hover:opacity-80"
                          style={{ height: `${24 + percent * 76}%`, background: 'linear-gradient(180deg,var(--brand-ink),var(--brand))' }} />;
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 flex h-28 items-center justify-center rounded-lg border border-dashed px-5 text-center text-[11px] ink-muted"
                      style={{ borderColor: 'var(--border-strong)' }}>
                      The API did not return enough history to draw a chart.
                    </div>
                  )}
                  {previewNav.length > 0 && (
                    <div className="mt-2 flex justify-between text-[9px] ink-muted">
                      <span>{previewNav[0].date}</span><span>{previewNav[previewNav.length - 1].date}</span>
                    </div>
                  )}
                </div>
                {dataset?.synthetic && <div className="mt-3"><SyntheticDataBanner /></div>}
              </>
            ) : datasetState === 'loading' ? (
              <div className="my-4"><LoadingState label="Connecting to the protected dataset" /></div>
            ) : datasetState === 'unavailable' ? (
              <div className="my-4">
                <ErrorState
                  title="Dataset preview unavailable"
                  detail={`The dataset API is protected and may be offline (${datasetError}). Sign in to the workspace or retry the request.`}
                  onRetry={retryDataset}
                />
              </div>
            ) : (
              <div className="my-4">
                <EmptyState
                  title="No processed data"
                  detail="The project API returned no fund metrics to preview. Sign in to inspect the workspace."
                  action={<AppLink to="/app/overview" className="btn btn-secondary btn-sm">Open Overview</AppLink>}
                />
              </div>
            )}
          </section>
        </section>

        <section aria-label="Dataset scale" className="border-y px-5 py-10 sm:px-8" style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              ['Tracked schemes', schemeCount > 0 ? `${schemeCount}` : '—'],
              ['NAV data points', navPointCount > 0 ? navPointCount.toLocaleString('en-IN') : '—'],
              ['Fund categories', categoryCount > 0 ? `${categoryCount}` : '—'],
              ['Years of history', yearsOfHistory ? `${yearsOfHistory}+` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="text-center sm:text-left">
                <div className="text-[26px] font-bold tabular tracking-tight ink-primary sm:text-[32px]">{value}</div>
                <div className="mt-1 text-[10.5px] font-medium ink-muted">{label}</div>
              </div>
            ))}
          </div>
        </section>

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
