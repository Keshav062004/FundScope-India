import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, Calculator, Download, Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { Panel, StatCard } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import { DataTable, type Column } from '../components/DataTable';
import { api } from '../api';
import { SERIES } from '../theme';

type Row = { asset_type: string; name: string; quantity: number; buy_price: number; current_price: number };
type EditableRow = Row & { rowIndex: number };

export default function Portfolio() {
  const [rows, setRows] = useState<Row[]>([]);
  const [result, setResult] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [retryableError, setRetryableError] = useState(false);
  const [calculating, setCalculating] = useState(false);

  function update(i: number, key: keyof Row, value: string) {
    const next = [...rows];
    if (key === 'asset_type') next[i] = { ...next[i], asset_type: value };
    else if (key === 'name') next[i] = { ...next[i], name: value };
    else if (key === 'quantity') next[i] = { ...next[i], quantity: Number(value) };
    else if (key === 'buy_price') next[i] = { ...next[i], buy_price: Number(value) };
    else next[i] = { ...next[i], current_price: Number(value) };
    setRows(next);
    setResult(null);
    setError('');
    setRetryableError(false);
  }
  function addRow() {
    setRows([...rows, { asset_type: 'Stock', name: '', quantity: 0, buy_price: 0, current_price: 0 }]);
    setResult(null);
    setError('');
    setRetryableError(false);
  }
  function removeRow(i: number) {
    setRows(rows.filter((_, idx) => idx !== i));
    setResult(null);
    setError('');
    setRetryableError(false);
  }

  async function calculate() {
    setError('');
    setRetryableError(false);
    if (!rows.length) {
      setError('Add at least one holding before calculating.');
      setResult(null);
      return;
    }
    if (rows.some((row) => !row.name.trim() || !Number.isFinite(row.quantity) || !Number.isFinite(row.buy_price) || !Number.isFinite(row.current_price) || row.quantity < 0 || row.buy_price < 0 || row.current_price < 0)) {
      setError('Enter a name and non-negative numeric values for every holding.');
      setResult(null);
      return;
    }
    setCalculating(true);
    try { setResult(await api.portfolioCalculate(rows)); }
    catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Check the holdings table and try again.');
      setRetryableError(true);
      setResult(null);
    }
    finally { setCalculating(false); }
  }

  const invested = result?.reduce((s, r) => s + r.invested, 0) ?? 0;
  const current = result?.reduce((s, r) => s + r.current_value, 0) ?? 0;
  const pnl = current - invested;

  const byType: Record<string, number> = {};
  result?.forEach((r) => { byType[r['Asset Type']] = (byType[r['Asset Type']] || 0) + r.current_value; });
  const pieData = Object.entries(byType).map(([name, value]) => ({ name, value }));

  function downloadCsv() {
    if (!result?.length) return;
    const header = Object.keys(result[0]).join(',');
    const body = result.map((r) => Object.values(r).join(',')).join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fundscope_portfolio.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<any>[] = result?.[0]
    ? Object.keys(result[0]).map((k) => ({
        key: k, header: k, align: typeof result[0][k] === 'number' ? 'right' : 'left',
        render: (r: any) => (typeof r[k] === 'number' ? r[k].toFixed(2) : r[k]),
      }))
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Unified stock + mutual fund portfolio</h2>
        <p className="ink-muted text-sm mt-1">
          Manual estimate only. Current prices are entered by you, not fetched from a broker. Taxes, fees, exit loads, and transaction-level accounting are excluded.
        </p>
      </div>

      <Panel title="Holdings">
        <p className="mb-4 text-[11px] leading-relaxed ink-muted">
          Add your own figures for an in-session estimate. Nothing is saved, and current prices are user-entered rather than fetched from a broker.
        </p>
        <DataTable
          ariaLabel="Portfolio holdings"
          emptyMessage="No holdings added. Use Add holding below to start an estimate."
          rowKey={(r: EditableRow) => String(r.rowIndex)}
          rows={rows.map((r, rowIndex) => ({ ...r, rowIndex }))}
          columns={[
            { key: 'asset_type', header: 'Asset Type', render: (r: EditableRow) => (
              <select aria-label={`Holding ${r.rowIndex + 1} asset type`} className="input py-1" value={r.asset_type} onChange={(e) => update(r.rowIndex, 'asset_type', e.target.value)}>
                <option>Stock</option><option>Mutual Fund</option>
              </select>
            ) },
            { key: 'name', header: 'Name', render: (r: EditableRow) => <input aria-label={`Holding ${r.rowIndex + 1} name`} className="input py-1 min-w-36" value={r.name} onChange={(e) => update(r.rowIndex, 'name', e.target.value)} /> },
            { key: 'quantity', header: 'Quantity', render: (r: EditableRow) => <input aria-label={`Holding ${r.rowIndex + 1} quantity`} type="number" min="0" step="any" className="input py-1 w-24" value={r.quantity} onChange={(e) => update(r.rowIndex, 'quantity', e.target.value)} /> },
            { key: 'buy_price', header: 'Buy Price', render: (r: EditableRow) => <input aria-label={`Holding ${r.rowIndex + 1} buy price`} type="number" min="0" step="any" className="input py-1 w-24" value={r.buy_price} onChange={(e) => update(r.rowIndex, 'buy_price', e.target.value)} /> },
            { key: 'current_price', header: 'Current Price', render: (r: EditableRow) => <input aria-label={`Holding ${r.rowIndex + 1} current price`} type="number" min="0" step="any" className="input py-1 w-24" value={r.current_price} onChange={(e) => update(r.rowIndex, 'current_price', e.target.value)} /> },
            { key: 'actions', header: '', render: (r: EditableRow) => <button type="button" aria-label={`Remove holding ${r.rowIndex + 1}`} onClick={() => removeRow(r.rowIndex)} className="btn-ghost rounded p-1 text-[color:var(--status-critical)]"><Trash2 size={14} /></button> },
          ]}
        />
        <div className="flex gap-3 mt-4">
          <button type="button" onClick={addRow} className="btn btn-secondary btn-sm"><Plus size={14} /> Add holding</button>
          <button type="button" onClick={calculate} disabled={calculating || !rows.length} className="btn btn-primary btn-sm"><Calculator size={14} /> {calculating ? 'Calculating…' : 'Calculate estimate'}</button>
        </div>
      </Panel>

      {error && retryableError
        ? <ErrorState title="Portfolio estimate failed" detail={error} onRetry={() => void calculate()} />
        : error && <div role="alert" className="warning-banner">{error}</div>}

      {calculating && <LoadingState label="Calculating portfolio estimate" />}

      {!result && !error && !calculating && (
        <EmptyState
          title="No portfolio estimate yet"
          detail="Add one or more holdings above and calculate an estimate. Entries stay in this session and are not saved."
        />
      )}

      {result && (
        <>
          <div className="responsive-grid-3 grid grid-cols-3 gap-4">
            <StatCard label="Invested value" value={`₹${invested.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={PiggyBank} tone="neutral" />
            <StatCard label="Current value" value={`₹${current.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={Wallet} tone="brand" />
            <StatCard label="Unrealized P/L" value={`₹${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} foot={invested ? `${((pnl / invested) * 100).toFixed(2)}%` : undefined} icon={TrendingUp} tone={pnl >= 0 ? 'good' : 'critical'} />
          </div>

          <Panel title="Current asset allocation">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label stroke="var(--surface)" strokeWidth={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Holdings breakdown" action={<button onClick={downloadCsv} className="btn btn-secondary btn-sm"><Download size={14} /> Export CSV</button>}>
            <DataTable ariaLabel="Calculated portfolio breakdown" columns={columns} rows={result.map((r, i) => ({ ...r, __key: i }))} rowKey={(r: any) => String(r.__key)} />
          </Panel>
        </>
      )}
    </div>
  );
}
