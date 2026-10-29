import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Gauge, TrendingDown, Download, Search } from 'lucide-react';
import { Panel, StatCard } from '../components/Card';
import { DataTable, type Column } from '../components/DataTable';
import { api, fmtPct } from '../api';
import { SERIES, CHART } from '../theme';

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function LiveNav() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [schemeCode, setSchemeCode] = useState('');
  const [start, setStart] = useState(isoDaysAgo(365));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [rows, setRows] = useState<any[] | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [fetching, setFetching] = useState(false);

  async function search() {
    setError('');
    if (!query.trim()) { setError('Enter a fund name or scheme code to search.'); return; }
    setResults([]);
    setSchemeCode('');
    setSearching(true);
    try { setResults(await api.mfSearch(query.trim())); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Scheme search failed.'); }
    finally { setSearching(false); }
  }

  async function fetchNav() {
    setError('');
    if (!schemeCode.trim()) { setError('Select a scheme or enter a scheme code.'); return; }
    if (start > end) { setError('Start date must be on or before the end date.'); return; }
    setFetching(true);
    setRows(null);
    try {
      const res = await api.mfNav(schemeCode, start, end);
      setRows(res.data); setMeta(res.meta);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'NAV retrieval failed.'); }
    finally { setFetching(false); }
  }

  const navValues = (rows ?? []).map((r) => Number(r.NAV)).filter((n) => !Number.isNaN(n));
  let periodReturn: number | null = null, vol: number | null = null, drawdown: number | null = null;
  if (navValues.length > 1) {
    periodReturn = navValues[navValues.length - 1] / navValues[0] - 1;
    const rets = navValues.slice(1).map((c, i) => c / navValues[i] - 1);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
    vol = Math.sqrt(variance) * Math.sqrt(252);
    let peak = navValues[0], maxDd = 0;
    for (const v of navValues) { peak = Math.max(peak, v); maxDd = Math.min(maxDd, v / peak - 1); }
    drawdown = maxDd;
  }

  function downloadCsv() {
    if (!rows?.length) return;
    const header = Object.keys(rows[0]).join(',');
    const body = rows.map((r) => Object.values(r).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mf_${schemeCode}_nav.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<any>[] = rows?.[0]
    ? Object.keys(rows[0]).map((k) => ({ key: k, header: k, render: (r: any) => String(r[k]) }))
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Real NAV lookup</h2>
        <p className="text-[color:var(--text-muted)] text-sm mt-1">MFapi.in is a third-party API, not AMFI. Volatility below uses daily NAV changes with a 252-observation annualization assumption.</p>
      </div>

      <Panel>
        <form onSubmit={(event) => { event.preventDefault(); void search(); }} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <input aria-label="Search mutual fund schemes" className="input min-w-[220px] flex-1" placeholder="Search scheme name or code" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="submit" disabled={searching} className="btn btn-secondary"><Search size={14} /> {searching ? 'Searching…' : 'Search'}</button>
          </div>
          {results.length > 0 && (
            <select aria-label="Choose mutual fund search result" className="input" value={schemeCode} onChange={(e) => setSchemeCode(e.target.value)}>
              <option value="">Select a search result…</option>
              {results.map((r) => <option key={r.schemeCode} value={r.schemeCode}>{r.schemeName} · {r.schemeCode}</option>)}
            </select>
          )}
          <div className="flex flex-wrap gap-4 items-end">
            <div><label htmlFor="mf-scheme-code" className="field-label">Scheme code</label><input id="mf-scheme-code" className="input w-40" value={schemeCode} onChange={(e) => setSchemeCode(e.target.value)} /></div>
            <div><label htmlFor="mf-start-date" className="field-label">Start date</label><input id="mf-start-date" type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div><label htmlFor="mf-end-date" className="field-label">End date</label><input id="mf-end-date" type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            <button type="button" onClick={() => void fetchNav()} disabled={fetching} className="btn btn-primary">{fetching ? 'Fetching NAV…' : 'Fetch NAV history'}</button>
          </div>
        </form>
      </Panel>

      {error && <Panel><div role="alert" className="text-sm text-[color:var(--status-critical)]">{error}</div></Panel>}
      {results.length === 0 && query.trim() && !searching && !error && <p className="text-xs text-[color:var(--text-muted)]">No matching schemes were returned. Try a different name or code.</p>}
      {rows && rows.length === 0 && <Panel><div className="text-sm text-[color:var(--text-muted)]">No NAV observations were returned for this date range.</div></Panel>}

      {rows && rows.length > 0 && meta && (
        <>
          <Panel>
            <div className="font-semibold text-[color:var(--text-primary)] text-sm">{meta.scheme_name} · scheme code {meta.scheme_code}</div>
            <div className="text-[12px] text-[color:var(--text-muted)] mt-1">Source URL: {meta.source_url} · Retrieved UTC: {meta.retrieved_at_utc}</div>
          </Panel>

          <Panel title="Historical NAV">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rows}>
                <CartesianGrid stroke={CHART.grid} />
                <XAxis dataKey="Date" tick={{ fontSize: 10, fill: CHART.tick }} minTickGap={40} axisLine={{ stroke: CHART.axis }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART.tick }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
                <Line type="monotone" dataKey="NAV" stroke={SERIES[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          {periodReturn !== null && (
            <div className="responsive-grid-3 grid grid-cols-3 gap-4">
              <StatCard label="Period return" value={fmtPct(periodReturn)} icon={TrendingUp} tone="good" />
              <StatCard label="Annualized volatility" value={fmtPct(vol)} icon={Gauge} tone="brand" />
              <StatCard label="Maximum drawdown" value={fmtPct(drawdown)} icon={TrendingDown} tone="critical" />
            </div>
          )}

          <Panel title="Raw data" action={<button onClick={downloadCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>}>
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.Date} maxHeight={320} />
          </Panel>
        </>
      )}
    </div>
  );
}
