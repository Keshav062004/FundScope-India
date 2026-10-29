import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Gauge, TrendingDown, Download } from 'lucide-react';
import { Panel, StatCard } from '../components/Card';
import { DataTable, type Column } from '../components/DataTable';
import { api, fmtPct } from '../api';
import { SERIES, CHART } from '../theme';

const TICKERS = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'ITC.NS', 'LT.NS', 'BHARTIARTL.NS', 'TATAMOTORS.NS'];

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function StockAnalytics() {
  const [ticker, setTicker] = useState(TICKERS[0]);
  const [start, setStart] = useState(isoDaysAgo(365));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [mode, setMode] = useState<'synthetic' | 'provider'>('synthetic');
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(''); setLoading(true); setRows([]);
    if (start > end) {
      setError('Start date must be on or before the end date.');
      setLoading(false);
      return;
    }
    try { setRows(await api.stockHistory(ticker, start, end, mode)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Could not load stock data.'); }
    finally { setLoading(false); }
  }

  const closes = rows.map((r) => Number(r.Close)).filter((n) => !Number.isNaN(n));
  let totalReturn: number | null = null, annualVol: number | null = null, drawdown: number | null = null;
  if (closes.length > 1) {
    totalReturn = closes[closes.length - 1] / closes[0] - 1;
    const rets = closes.slice(1).map((c, i) => c / closes[i] - 1);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
    annualVol = Math.sqrt(variance) * Math.sqrt(252);
    let peak = closes[0], maxDd = 0;
    for (const c of closes) { peak = Math.max(peak, c); maxDd = Math.min(maxDd, c / peak - 1); }
    drawdown = maxDd;
  }

  function downloadCsv() {
    if (!rows.length) return;
    const header = Object.keys(rows[0]).join(',');
    const body = rows.map((r) => Object.values(r).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${ticker.replace('.', '_')}_history.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<any>[] = rows[0]
    ? Object.keys(rows[0]).map((k) => ({ key: k, header: k, render: (r: any) => String(r[k]) }))
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Indian Stock Analytics</h2>
        <p className="text-[color:var(--text-muted)] text-sm mt-1">
          Provider history is third-party adjusted-price data, not an exchange-certified feed. Synthetic previews are not actual prices; annualized volatility assumes 252 trading sessions.
        </p>
      </div>

      <Panel>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="field-label">Select stock</label>
            <select aria-label="Select stock ticker" className="input w-44" value={ticker} onChange={(e) => setTicker(e.target.value)}>
              {TICKERS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Start date</label>
            <input type="date" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="field-label">End date</label>
            <input type="date" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Data mode</label>
            <div className="flex gap-4 text-[13px] text-[color:var(--text-primary)] pt-1.5">
              <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'synthetic'} onChange={() => setMode('synthetic')} /> Synthetic</label>
              <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'provider'} onChange={() => setMode('provider')} /> Provider</label>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="btn btn-primary">{loading ? 'Loading…' : 'Load history'}</button>
        </div>
      </Panel>

      {error && <Panel><div className="text-sm text-[color:var(--status-critical)]">{error}</div></Panel>}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-[12.5px] text-[color:var(--text-muted)]">Ticker: <b className="text-[color:var(--text-primary)]">{ticker}</b> · Source: {rows[0].Source}</div>
            {rows[0].Source === 'Synthetic demo data' && <span className="badge badge-warning">Synthetic preview — not real prices</span>}
          </div>

          <Panel title="Daily price history">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={rows}>
                <CartesianGrid stroke={CHART.grid} />
                <XAxis dataKey="Date" tick={{ fontSize: 10, fill: CHART.tick }} minTickGap={40} axisLine={{ stroke: CHART.axis }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: CHART.tick }} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
                <Line type="monotone" dataKey="Close" stroke={SERIES[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          {rows[0].Volume !== undefined && (
            <Panel title="Daily volume">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={rows}>
                  <CartesianGrid stroke={CHART.grid} />
                  <XAxis dataKey="Date" tick={{ fontSize: 10, fill: CHART.tick }} minTickGap={40} axisLine={{ stroke: CHART.axis }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
                  <Bar dataKey="Volume" fill={SERIES[6]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}

          {totalReturn !== null && (
            <div className="responsive-grid-3 grid grid-cols-3 gap-4">
              <StatCard label="Total return" value={fmtPct(totalReturn)} icon={TrendingUp} tone="good" />
              <StatCard label="Annualized volatility" value={fmtPct(annualVol)} icon={Gauge} tone="brand" />
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
