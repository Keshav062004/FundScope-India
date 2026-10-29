import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { Panel } from '../components/Card';
import { EmptyState, LoadingState } from '../components/DataState';
import { DataTable, type Column } from '../components/DataTable';
import { fmtPct, type DatasetResponse, type Metric } from '../api';
import { SERIES, CHART } from '../theme';

type Ctx = { data: DatasetResponse | null; dataState?: 'loading' | 'ready' | 'error'; reload?: () => void };
const SORT_OPTIONS = [
  { value: 'cagr', label: 'CAGR' },
  { value: 'max_drawdown', label: 'Maximum drawdown' },
  { value: 'annualized_volatility', label: 'Annualized volatility' },
  { value: 'sharpe_ratio', label: 'Sharpe ratio' },
  { value: 'sortino_ratio', label: 'Sortino ratio' },
  { value: 'calmar_ratio', label: 'Calmar ratio' },
  { value: 'period_return', label: 'Period return' },
] as const;
type SortMetric = (typeof SORT_OPTIONS)[number]['value'];
const EMPTY_METRICS: Metric[] = [];

export default function ExploreFunds() {
  const { data, dataState, reload } = useOutletContext<Ctx>();
  const metrics = data?.metrics ?? EMPTY_METRICS;
  const monthly = data?.monthly ?? [];
  const allSchemes = useMemo(() => Array.from(new Set(metrics.map((m) => m.scheme_name))).sort(), [metrics]);
  const [schemes, setSchemes] = useState<string[] | null>(null);
  const [schemeSearch, setSchemeSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortMetric>('cagr');
  const [monthSchemes, setMonthSchemes] = useState<string[] | null>(null);
  const selectedSchemes = schemes === null ? allSchemes : schemes.filter((name) => allSchemes.includes(name));
  const selectedMonthSchemes = monthSchemes === null ? allSchemes : monthSchemes.filter((name) => allSchemes.includes(name));

  if (dataState === 'loading') return <LoadingState label="Loading fund comparison data" />;
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

  const view = metrics.filter((m) => selectedSchemes.includes(m.scheme_name))
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (aValue == null) return bValue == null ? 0 : 1;
      if (bValue == null) return -1;
      const direction = sortBy === 'annualized_volatility' ? 1 : -1;
      return (aValue - bValue) * direction;
    });

  const monthlyView = monthly.filter((m) => selectedMonthSchemes.includes(m.scheme_name));
  const byMonth: Record<string, any> = {};
  monthlyView.forEach((m) => {
    byMonth[m.month] = byMonth[m.month] || { month: m.month };
    byMonth[m.month][m.scheme_name] = m.monthly_return;
  });
  const monthlyData = Object.values(byMonth).sort((a: any, b: any) => (a.month > b.month ? 1 : -1));

  function downloadCsv(rows: any[], filename: string) {
    if (!rows.length) return;
    const header = Object.keys(rows[0]).join(',');
    const body = rows.map((r) => Object.values(r).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<Metric>[] = [
    { key: 'scheme_name', header: 'Scheme', render: (m) => <span className="font-medium">{m.scheme_name}</span> },
    { key: 'start_date', header: 'Period start', render: (m) => m.start_date },
    { key: 'end_date', header: 'Period end', render: (m) => m.end_date },
    { key: 'cagr', header: 'CAGR', align: 'right', render: (m) => fmtPct(m.cagr) },
    { key: 'max_drawdown', header: 'Drawdown', align: 'right', render: (m) => fmtPct(m.max_drawdown) },
    { key: 'annualized_volatility', header: 'Volatility', align: 'right', render: (m) => fmtPct(m.annualized_volatility) },
    { key: 'sharpe_ratio', header: 'Sharpe', align: 'right', render: (m) => (m.sharpe_ratio == null ? '—' : m.sharpe_ratio.toFixed(2)) },
    { key: 'sortino_ratio', header: 'Sortino', align: 'right', render: (m) => (m.sortino_ratio == null ? '—' : m.sortino_ratio.toFixed(2)) },
    { key: 'calmar_ratio', header: 'Calmar', align: 'right', render: (m) => (m.calmar_ratio == null ? '—' : m.calmar_ratio.toFixed(2)) },
    { key: 'period_return', header: 'Period return', align: 'right', render: (m) => fmtPct(m.period_return) },
  ];

  return (
    <div className="space-y-5">
      <h2 className="section-title">Explore and compare fund metrics</h2>

      <Panel>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[260px]">
            <label htmlFor="fund-scheme-search" className="field-label">Find schemes</label>
            <input id="fund-scheme-search" className="input mb-2" type="search" value={schemeSearch}
              placeholder="Search available scheme names" onChange={(e) => setSchemeSearch(e.target.value)} />
            <label htmlFor="fund-scheme-select" className="field-label">Choose schemes to compare</label>
            <select id="fund-scheme-select" multiple className="input h-24" value={selectedSchemes}
              onChange={(e) => setSchemes(Array.from(e.target.selectedOptions, (o) => o.value))}>
              {allSchemes.filter((scheme) => scheme.toLowerCase().includes(schemeSearch.trim().toLowerCase())).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label htmlFor="fund-sort-by" className="field-label">Rank by</label>
            <select id="fund-sort-by" className="input" value={sortBy} onChange={(e) => {
              const option = SORT_OPTIONS.find((item) => item.value === e.target.value);
              if (option) setSortBy(option.value);
            }}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </Panel>

      <Panel
        title="Comparison"
        subtitle="These full-history metrics use each scheme's reported period. Use the matched-date table below for index comparisons."
        action={<button onClick={() => downloadCsv(view, 'fundscope_comparison.csv')} className="btn btn-secondary btn-sm"><Download size={14} /> Export</button>}
      >
        {view.length === 0 ? (
          <EmptyState
            title="No schemes selected"
            detail="Use the scheme selector above to choose schemes for comparison."
            action={<button className="btn btn-secondary btn-sm" onClick={() => setSchemes(null)}>Show all schemes</button>}
          />
        ) : (
          <>
            {view.length < 2 && <p className="mb-3 supporting-copy">Select at least two schemes for a side-by-side comparison.</p>}
            <DataTable ariaLabel="Fund historical metrics" columns={columns} rows={view} rowKey={(m) => m.scheme_code} />
          </>
        )}
      </Panel>

      <Panel
        title="Fund vs index funds"
        subtitle="Each return pair uses the same exact observed start and end dates. Periods vary by pair."
      >
        {(() => {
          const benchmarkRows = (data.benchmarks ?? []).filter((row) =>
            selectedSchemes.includes(row.scheme_name),
          );
          return benchmarkRows.length ? (
            <DataTable
              ariaLabel="Matched-date fund and index comparisons"
              columns={[
                { key: 'scheme_name', header: 'Fund', render: (row) => row.scheme_name },
                { key: 'benchmark_name', header: 'Index fund', render: (row) => row.benchmark_name },
                { key: 'start_date', header: 'Common start', render: (row) => row.start_date ?? '—' },
                { key: 'end_date', header: 'Common end', render: (row) => row.end_date ?? '—' },
                { key: 'fund_return', header: 'Fund return', align: 'right', render: (row) => fmtPct(row.fund_return) },
                { key: 'benchmark_return', header: 'Index return', align: 'right', render: (row) => fmtPct(row.benchmark_return) },
                { key: 'return_difference', header: 'Difference', align: 'right', render: (row) => fmtPct(row.return_difference) },
              ]}
              rows={benchmarkRows}
              rowKey={(row) => `${row.scheme_code}-${row.benchmark_code}`}
            />
          ) : (
            <div className="text-sm ink-muted">
              No matched fund/index periods are available for this selection. Select a scheme above or rebuild the processed NAV dataset.
            </div>
          );
        })()}
      </Panel>

      <h2 className="section-title">Monthly returns</h2>
      {monthly.length === 0 ? (
        <Panel><div className="text-sm ink-muted">No monthly returns are available. Refresh or rebuild the processed dataset.</div></Panel>
      ) : (
        <Panel title="Monthly return schemes">
          <label htmlFor="monthly-scheme-select" className="field-label">Choose schemes for monthly returns</label>
          <select id="monthly-scheme-select" multiple className="input h-20 mb-4" value={selectedMonthSchemes}
            onChange={(e) => setMonthSchemes(Array.from(e.target.selectedOptions, (o) => o.value))}>
            {allSchemes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {monthlyView.length === 0 ? (
            <EmptyState
              title="No monthly series selected"
              detail="Choose one or more schemes above to show monthly returns."
              action={<button className="btn btn-secondary btn-sm" onClick={() => setMonthSchemes(null)}>Show all schemes</button>}
            />
          ) : (
            <div className="w-full min-w-0" role="img" aria-label="Monthly fund returns chart">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={monthlyData}>
                  <CartesianGrid stroke={CHART.grid} />
                  <XAxis dataKey="month" interval="preserveStartEnd" tick={{ fontSize: 11, fill: CHART.tick }} axisLine={{ stroke: CHART.axis }} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: any) => fmtPct(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
                  <Legend formatter={(value: string) => value.length > 20 ? `${value.slice(0, 18)}…` : value} wrapperStyle={{ fontSize: 12, maxWidth: '100%' }} />
                  {selectedMonthSchemes.map((name, i) => (
                    <Line key={name} type="monotone" dataKey={name} strokeWidth={2} dot={false} stroke={SERIES[i % SERIES.length]} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
