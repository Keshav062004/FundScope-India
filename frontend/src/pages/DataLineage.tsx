import { useEffect, useState } from 'react';
import { GitBranch, CircleAlert } from 'lucide-react';
import { Panel } from '../components/Card';
import { DataTable, type Column } from '../components/DataTable';
import { api } from '../api';

const CHECKLIST = [
  'Dates parsed and sorted',
  'Numeric values validated',
  'Duplicate dates checked',
  'Missing values and date coverage reviewed',
  'Large jumps investigated rather than silently removed',
  'Source URL, parameters and UTC retrieval time recorded',
];

export default function DataLineage() {
  const [rows, setRows] = useState<any[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadLineage() {
    setLoading(true);
    setError('');
    try { setRows(await api.lineage()); }
    catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : 'Data lineage could not be loaded.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    api.lineage().then((result) => {
      if (active) setRows(result);
    }).catch((cause: unknown) => {
      if (active) {
        setRows([]);
        setError(cause instanceof Error ? cause.message : 'Data lineage could not be loaded.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const columns: Column<any>[] = rows[0]
    ? Object.keys(rows[0]).map((k) => ({ key: k, header: k, render: (r: any) => <span className="text-[13px]">{r[k]}</span> }))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-surface)', color: 'var(--brand-ink)' }}>
          <GitBranch size={17} />
        </div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Data lineage and quality controls</h2>
      </div>

      <Panel title="Provenance" subtitle="Source and processing information returned by the backend.">
        {error ? (
          <div role="alert" className="flex items-center justify-between gap-3 text-sm text-[color:var(--status-critical)]">
            <span>{error}</span>
            <button type="button" onClick={() => void loadLineage()} className="btn btn-secondary btn-sm">Retry</button>
          </div>
        ) : loading ? (
          <div role="status" className="text-sm text-[color:var(--text-muted)]">Loading provenance…</div>
        ) : rows.length ? (
          <DataTable columns={columns} rows={rows} rowKey={(r) => String(r.Dataset ?? JSON.stringify(r))} />
        ) : (
          <div className="text-sm text-[color:var(--text-muted)]">No provenance records were returned by the service.</div>
        )}
      </Panel>

      <Panel title="Source and quality checklist">
        <div className="space-y-2.5">
          {CHECKLIST.map((label) => (
            <label key={label} className="flex items-center gap-2.5 text-[13.5px] text-[color:var(--text-primary)]">
              <input type="checkbox" checked={!!checked[label]} onChange={(e) => setChecked({ ...checked, [label]: e.target.checked })} className="h-4 w-4 accent-[var(--brand)]" />
              {label}
            </label>
          ))}
        </div>
      </Panel>

      <div className="warning-banner flex items-start gap-2.5">
        <CircleAlert size={16} className="mt-0.5 shrink-0" />
        This checklist is manual. Full automated ingestion logging and persisted validation reports remain planned work.
      </div>
    </div>
  );
}
