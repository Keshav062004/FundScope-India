import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Inbox, Database, Clock, Play, RefreshCw, Download } from 'lucide-react';
import { Panel, StatCard } from '../components/Card';
import { api, type DatasetResponse } from '../api';

type Ctx = { data: DatasetResponse | null; reload: () => Promise<void> };

export default function Automation() {
  const { reload } = useOutletContext<Ctx>();
  const [status, setStatus] = useState<any>(null);
  const [statusError, setStatusError] = useState('');
  const [runOutput, setRunOutput] = useState<{ ok: boolean; stdout: string; stderr: string } | null>(null);
  const [refreshOutput, setRefreshOutput] = useState<{ ok: boolean; stdout: string; stderr: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState<'demo' | 'real'>('demo');

  async function loadStatus() {
    setStatusError('');
    try { setStatus(await api.getStatus()); }
    catch (error) {
      setStatus(null);
      setStatusError(error instanceof Error ? error.message : 'Could not load pipeline status.');
    }
  }
  useEffect(() => {
    let active = true;
    api.getStatus().then((result) => {
      if (active) setStatus(result);
    }).catch((error: unknown) => {
      if (!active) return;
      setStatus(null);
      setStatusError(error instanceof Error ? error.message : 'Could not load pipeline status.');
    });
    return () => { active = false; };
  }, []);

  async function runPipeline() {
    setRunning(true); setRunOutput(null);
    try { setRunOutput(await api.runPipeline(source)); await loadStatus(); await reload(); }
    catch (error) {
      setRunOutput({ ok: false, stdout: '', stderr: error instanceof Error ? error.message : 'Pipeline request failed.' });
    }
    finally { setRunning(false); }
  }

  async function refreshNav() {
    setRefreshing(true); setRefreshOutput(null);
    try { setRefreshOutput(await api.refreshNav()); await loadStatus(); await reload(); }
    catch (error) {
      setRefreshOutput({ ok: false, stdout: '', stderr: error instanceof Error ? error.message : 'NAV refresh request failed.' });
    }
    finally { setRefreshing(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Automation Center</h2>
        <p className="text-[color:var(--text-muted)] text-sm mt-1">Run the data pipeline, inspect data quality, and download generated outputs.</p>
      </div>

      {status && (
        <div className="responsive-grid-3 grid grid-cols-3 gap-4">
          <StatCard label="Raw input" value={status.raw_present ? 'Present' : 'Missing'} foot="Configured source file" icon={Inbox} tone={status.raw_present ? 'good' : 'critical'} />
          <StatCard label="Metrics output" value={status.metrics_present ? 'Present' : 'Missing'} foot="fund_metrics.csv" icon={Database} tone={status.metrics_present ? 'good' : 'critical'} />
          <StatCard label="Scheme records" value={status.scheme_codes?.toLocaleString?.() ?? '—'} foot="Available in the raw input" icon={Clock} tone="neutral" />
        </div>
      )}

      {statusError && (
        <Panel><div role="alert" className="flex items-center justify-between gap-3 text-sm text-[color:var(--status-critical)]">
          <span>Pipeline status unavailable: {statusError}</span>
          <button type="button" onClick={() => void loadStatus()} className="btn btn-secondary btn-sm">Retry</button>
        </div></Panel>
      )}

      <Panel title="Run data pipeline" subtitle="Select the source explicitly; demo mode uses synthetic inputs.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label htmlFor="pipeline-source" className="field-label">Input source</label>
            <select id="pipeline-source" className="input" value={source} onChange={(event) => setSource(event.target.value as 'demo' | 'real')}>
              <option value="demo">Synthetic demo data</option>
              <option value="real">Configured historical source</option>
            </select>
          </div>
          <button type="button" onClick={() => void runPipeline()} disabled={running} className="btn btn-primary">
            <Play size={14} /> {running ? 'Running pipeline…' : 'Run selected pipeline'}
          </button>
        </div>
        {source === 'real' && <p className="mt-3 text-[11px] text-[color:var(--text-muted)]">Real mode uses the locally configured input file; it does not fetch new data by itself.</p>}
        {runOutput && (
          <div className="mt-3">
            <span className={`badge ${runOutput.ok ? 'badge-good' : ''}`} style={!runOutput.ok ? { background: 'var(--status-critical-surface)', color: 'var(--status-critical)' } : undefined}>
              {runOutput.ok ? 'Completed successfully' : 'Returned an error'}
            </span>
            <pre className="text-[11.5px] p-3 rounded-lg mt-2 overflow-auto max-h-60 scrollbar-thin" style={{ background: '#0d1b2e', color: '#d8e7fb' }}>
              {runOutput.ok ? runOutput.stdout : (runOutput.stderr || runOutput.stdout)}
            </pre>
          </div>
        )}
      </Panel>

      <Panel title="Refresh NAV from API">
        <button type="button" onClick={() => void refreshNav()} disabled={refreshing} className="btn btn-secondary">
          <RefreshCw size={14} /> {refreshing ? 'Fetching latest NAV data…' : 'Refresh NAV from API'}
        </button>
        {refreshOutput && (
          <div className="mt-3">
            <span className={`badge ${refreshOutput.ok ? 'badge-good' : ''}`} style={!refreshOutput.ok ? { background: 'var(--status-critical-surface)', color: 'var(--status-critical)' } : undefined}>
              {refreshOutput.ok ? 'Completed successfully' : 'Refresh failed'}
            </span>
            <pre className="text-[11.5px] p-3 rounded-lg mt-2 overflow-auto max-h-60 scrollbar-thin" style={{ background: '#0d1b2e', color: '#d8e7fb' }}>
              {refreshOutput.ok ? refreshOutput.stdout : (refreshOutput.stderr || refreshOutput.stdout)}
            </pre>
          </div>
        )}
      </Panel>

      {status && (
        <Panel title="Data-quality snapshot">
          <div className="responsive-grid-4 grid grid-cols-4 gap-4">
            {[
              ['Raw rows', status.raw_rows?.toLocaleString() ?? '—'],
              ['Duplicate rows', status.duplicate_rows ?? '—'],
              ['Missing NAV', status.missing_nav ?? '—'],
              ['Scheme codes', status.scheme_codes ?? '—'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="text-[11.5px] text-[color:var(--text-muted)]">{label}</div>
                <div className="font-bold text-lg text-[color:var(--text-primary)] tabular">{value}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {status?.report_text && (
        <Panel title="Latest pipeline report">
          <pre className="text-[11.5px] p-3 rounded-lg overflow-auto max-h-80 scrollbar-thin" style={{ background: 'var(--surface-sunken)' }}>{status.report_text}</pre>
          <a href={api.downloadUrl('data_quality_report.txt')} className="btn btn-primary mt-3 inline-flex">
            <Download size={14} /> Download report
          </a>
        </Panel>
      )}

      <Panel title="Download generated files">
        <div className="flex flex-wrap gap-3">
          {['fund_metrics.csv', 'cleaned_nav.csv', 'monthly_returns.csv', 'summary_insights.md'].map((f) => (
            <a key={f} href={api.downloadUrl(f)} className="btn btn-secondary btn-sm"><Download size={13} /> {f}</a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
