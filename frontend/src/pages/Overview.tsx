import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Coins, ListChecks, Download } from 'lucide-react';
import { StatCard, Panel } from '../components/Card';
import { EmptyState, LoadingState } from '../components/DataState';
import { DataTable, type Column } from '../components/DataTable';
import { fmtNum, fmtPct, type DatasetResponse, type Metric } from '../api';
import { SERIES, CHART } from '../theme';

type Ctx = { data: DatasetResponse | null; dataState?: 'loading' | 'ready' | 'error'; reload?: () => void };
const EMPTY_METRICS: Metric[] = [];

export default function Overview() {
  const { data, dataState, reload } = useOutletContext<Ctx>();
  const metrics = data?.metrics ?? EMPTY_METRICS;
  const nav = data?.nav ?? [];
  const findings = data?.findings ?? [];

  const schemes = useMemo(() => Array.from(new Set(metrics.map((m) => m.scheme_name))).sort(), [metrics]);
  const categories = useMemo(() => Array.from(new Set(metrics.map((m) => m.category))).sort(), [metrics]);

  const [chosen, setChosen] = useState<string[] | null>(null);
  const [category, setCategory] = useState('All categories');
  const chosenSchemes = chosen === null ? schemes : chosen.filter((name) => schemes.includes(name));

  if (dataState === 'loading') return <LoadingState label="Loading fund analytics" />;
  if (dataState === 'error') return null;
  if (!data) return <EmptyState title="Dataset unavailable" detail="The project API returned no analytics dataset." action={reload && <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>Retry dataset</button>} />;
  if (metrics.length === 0) {
    return (
      <EmptyState
        title="No processed metrics"
        detail="Build the processed dataset from the project root with python run_project.py, then refresh this page."
        action={reload && <button type="button" className="btn btn-secondary btn-sm" onClick={reload}>Refresh dataset</button>}
      />
    );
  }

  let filtered = metrics.filter((m) => chosenSchemes.includes(m.scheme_name));
  if (category !== 'All categories') filtered = filtered.filter((m) => m.category === category);

  const cagrValues = filtered.flatMap((metric) => metric.cagr == null ? [] : [metric.cagr]);
  const drawdownValues = filtered.flatMap((metric) => metric.max_drawdown == null ? [] : [metric.max_drawdown]);
  const endingNavValues = filtered.flatMap((metric) => metric.ending_nav == null ? [] : [metric.ending_nav]);
  const avgCagr = cagrValues.length ? cagrValues.reduce((sum, value) => sum + value, 0) / cagrValues.length : NaN;
  const worstDrawdown = drawdownValues.length ? Math.min(...drawdownValues) : NaN;
  const meanEndingNav = endingNavValues.length ? endingNavValues.reduce((sum, value) => sum + value, 0) / endingNavValues.length : NaN;

  const cagrData = [...filtered].filter((metric) => metric.cagr != null).sort((a, b) => a.cagr! - b.cagr!).map((m) => ({
    name: m.scheme_name, value: Number((m.cagr! * 100).toFixed(2)),
  }));
  const ddData = [...filtered].filter((metric) => metric.max_drawdown != null).sort((a, b) => a.max_drawdown! - b.max_drawdown!).map((m) => ({
    name: m.scheme_name, value: Number((m.max_drawdown! * 100).toFixed(2)),
  }));

  const trendSchemes = new Set(filtered.map((f) => f.scheme_name));
  const navByDate: Record<string, any> = {};
  const navBaselineByScheme: Record<string, number> = {};
  nav.filter((n) => trendSchemes.has(n.scheme_name)).forEach((n) => {
    navByDate[n.date] = navByDate[n.date] || { date: n.date };
    navBaselineByScheme[n.scheme_name] ??= n.nav;
    navByDate[n.date][n.scheme_name] = Number(((n.nav / navBaselineByScheme[n.scheme_name]) * 100).toFixed(2));
  });
  const trendData = Object.values(navByDate).sort((a: any, b: any) => (a.date > b.date ? 1 : -1));

  function downloadCsv() {
    const header = Object.keys(filtered[0] ?? {}).join(',');
    const rows = filtered.map((r) => Object.values(r).join(','));
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fundscope_filtered_metrics.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<Metric>[] = [
    { key: 'scheme_name', header: 'Scheme', render: (m) => <span className="font-medium">{m.scheme_name}</span> },
    { key: 'category', header: 'Category', render: (m) => <span className="ink-secondary">{m.category}</span> },
    { key: 'start_date', header: 'Start date', render: (m) => m.start_date },
    { key: 'end_date', header: 'End date', render: (m) => m.end_date },
    { key: 'cagr', header: 'CAGR', align: 'right', render: (m) => fmtPct(m.cagr) },
    { key: 'max_drawdown', header: 'Drawdown', align: 'right', render: (m) => fmtPct(m.max_drawdown) },
    { key: 'annualized_volatility', header: 'Volatility', align: 'right', render: (m) => fmtPct(m.annualized_volatility) },
    { key: 'sharpe_ratio', header: 'Sharpe', align: 'right', render: (m) => (m.sharpe_ratio == null ? '—' : m.sharpe_ratio.toFixed(2)) },
    { key: 'sortino_ratio', header: 'Sortino', align: 'right', render: (m) => (m.sortino_ratio == null ? '—' : m.sortino_ratio.toFixed(2)) },
    { key: 'calmar_ratio', header: 'Calmar', align: 'right', render: (m) => (m.calmar_ratio == null ? '—' : m.calmar_ratio.toFixed(2)) },
  ];

  return (
    <div className="space-y-5">
      <section id="key-findings" aria-labelledby="key-findings-title" className="space-y-3">
        <div>
          <h2 id="key-findings-title" className="section-title">Key findings</h2>
          <p className="mt-1 text-sm ink-muted">
            Reproducible summaries of the processed dataset; descriptive history, not investment advice.
          </p>
        </div>
        {findings.length ? (
          <div className="responsive-grid-2 grid grid-cols-2 gap-3">
            {findings.map((finding) => (
              <Panel key={finding.title}>
                <h3 className="panel-title">{finding.title}</h3>
                <p className="mt-2 text-xl font-bold tabular text-[color:var(--brand-ink)]">{finding.value}</p>
                <p className="mt-2 text-sm leading-6 ink-secondary">{finding.detail}</p>
                <p className="mt-3 text-xs ink-muted">Source: {finding.source}</p>
              </Panel>
            ))}
          </div>
        ) : (
          <Panel>
            <p className="text-sm ink-muted">
              No findings are available. Rebuild the processed dataset and generate the report with <code>python -m src.key_findings</code>.
            </p>
          </Panel>
        )}
      </section>

      <Panel title="What's new" subtitle="Dataset refresh metadata only; this is not a product-release changelog.">
        <p className="text-sm ink-secondary">
          {data.generated_at_utc
            ? `The current dataset metadata records a refresh at ${data.generated_at_utc}.`
            : 'No dataset refresh timestamp is recorded.'}
        </p>
      </Panel>

      <Panel>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[260px]">
            <label htmlFor="overview-schemes" className="field-label">Select schemes</label>
            <select id="overview-schemes" multiple className="input h-24" value={chosenSchemes}
              onChange={(e) => setChosen(Array.from(e.target.selectedOptions, (o) => o.value))}>
              {schemes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label htmlFor="overview-category" className="field-label">Category</label>
            <select id="overview-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          title="No schemes selected"
          detail="Choose a scheme or category above to restore the overview."
        />
      ) : (
        <>
          <div className="responsive-grid-4 grid grid-cols-4 gap-4">
            <StatCard label="Average CAGR" value={fmtPct(avgCagr)} foot="Mean across schemes; each uses its full data period" icon={TrendingUp} tone="good" />
            <StatCard label="Worst drawdown" value={fmtPct(worstDrawdown)} foot="Most severe peak-to-trough decline" icon={TrendingDown} tone="critical" />
            <StatCard label="Mean ending NAV" value={fmtNum(meanEndingNav)} foot="Average of available scheme NAV values" icon={Coins} tone="brand" />
            <StatCard label="Schemes selected" value={String(filtered.length)} foot="Current filtered selection" icon={ListChecks} tone="neutral" />
          </div>

          <div className="responsive-grid-2 grid grid-cols-2 gap-5">
            <Panel title="CAGR by scheme" subtitle="Historical compound annual growth rate">
              {cagrData.length ? (
                <div role="img" aria-label="Bar chart of historical CAGR by scheme">
                  <ResponsiveContainer width="100%" height={310}>
                    <BarChart data={cagrData} layout="vertical" margin={{ left: 10, right: 24 }} barCategoryGap={10}>
                      <CartesianGrid stroke={CHART.grid} horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.tick }} axisLine={{ stroke: CHART.axis }} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={150} tickFormatter={(v: string) => v.length > 20 ? `${v.slice(0, 18)}…` : v} tick={{ fontSize: 11.5, fill: 'var(--text-primary)' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} cursor={{ fill: 'var(--surface-sunken)' }} />
                      <Bar dataKey="value" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="CAGR unavailable" detail="No selected scheme has a complete CAGR value." />
              )}
            </Panel>
            <Panel title="Maximum drawdown by scheme" subtitle="More negative values indicate a deeper historical decline">
              {ddData.length ? (
                <div role="img" aria-label="Bar chart of maximum drawdown by scheme">
                  <ResponsiveContainer width="100%" height={310}>
                    <BarChart data={ddData} layout="vertical" margin={{ left: 10, right: 24 }} barCategoryGap={10}>
                      <CartesianGrid stroke={CHART.grid} horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: CHART.tick }} axisLine={{ stroke: CHART.axis }} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={150} tickFormatter={(v: string) => v.length > 20 ? `${v.slice(0, 18)}…` : v} tick={{ fontSize: 11.5, fill: 'var(--text-primary)' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} cursor={{ fill: 'var(--surface-sunken)' }} />
                      <Bar dataKey="value" fill={SERIES[7]} radius={[0, 4, 4, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="Drawdown unavailable" detail="No selected scheme has a maximum drawdown value." />
              )}
            </Panel>
          </div>

          <Panel title="Normalized NAV trend" subtitle="Indexed to 100 at each scheme's first available observation; start dates may differ.">
            {trendData.length ? (
              <div role="img" aria-label="Line chart of NAV values normalized to 100">
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={trendData}>
                    <CartesianGrid stroke={CHART.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART.tick }} minTickGap={40} interval="preserveStartEnd" axisLine={{ stroke: CHART.axis }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
                    <Legend formatter={(value: string) => value.length > 20 ? `${value.slice(0, 18)}…` : value} wrapperStyle={{ fontSize: 12, maxWidth: '100%' }} />
                    {[...trendSchemes].map((name, i) => (
                      <Line key={name} type="monotone" dataKey={name} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="NAV history unavailable" detail="No selected scheme has observations for the normalized trend chart." />
            )}
          </Panel>

          <Panel
            title="Fund metrics table"
            subtitle="Download the currently filtered metrics"
            action={
              <button onClick={downloadCsv} className="btn btn-secondary btn-sm">
                <Download size={14} /> Export CSV
              </button>
            }
          >
            <DataTable ariaLabel="Fund performance metrics" columns={columns} rows={filtered} rowKey={(m) => m.scheme_code} />
          </Panel>
        </>
      )}
    </div>
  );
}
