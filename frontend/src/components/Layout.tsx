import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { api, type DatasetResponse } from '../api';
import { NAV_ITEMS } from '../navigation';
import { ErrorState, SyntheticDataBanner } from './DataState';
import TopNav from './TopNav';
import ChatWidget from './ChatWidget';
import BrandLogo from './BrandLogo';

type DataState = 'loading' | 'ready' | 'error';

const PAGE_DESCRIPTIONS: Record<string, string> = {
  '/app/overview': 'A high-level view of historical performance and risk.',
  '/app/explore': 'Filter schemes and compare returns against index funds over matched dates.',
  '/app/calculators': 'Illustrative financial calculators, not forecasts.',
  '/app/portfolio': 'An in-browser estimate; holdings are not saved to an account.',
};

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [data, setData] = useState<DatasetResponse | null>(null);
  const [dataState, setDataState] = useState<DataState>('loading');
  const [dataError, setDataError] = useState('');

  async function reloadData() {
    setDataState('loading');
    setDataError('');
    try {
      setData(await api.getData());
      setDataState('ready');
    } catch (error) {
      setData(null);
      setDataState('error');
      setDataError(error instanceof Error ? error.message : 'Dataset could not be loaded.');
    }
  }

  useEffect(() => {
    let active = true;
    api.getData().then((result) => {
      if (!active) return;
      setData(result);
      setDataState('ready');
    }).catch((error: unknown) => {
      if (!active) return;
      setData(null);
      setDataState('error');
      setDataError(error instanceof Error ? error.message : 'Dataset could not be loaded.');
    });
    return () => { active = false; };
  }, []);

  const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const title = current?.label ?? 'Dashboard';
  const schemeCount = data ? new Set(data.metrics.map((metric) => metric.scheme_name)).size : 0;
  const navCount = data?.nav.length ?? 0;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--page-plane)' }}>
      <aside
        className="app-sidebar sticky top-0 h-screen w-[248px] shrink-0 flex-col border-r"
        style={{ display: 'flex', background: 'var(--surface)', borderColor: 'var(--border)' }}
        aria-label="Main sidebar"
      >
        <a href="/" className="flex h-[72px] items-center gap-3 border-b px-5" style={{ borderColor: 'var(--border)' }}>
          <BrandLogo />
          <span className="text-[14px] font-extrabold tracking-tight ink-primary">
            FundScope <span style={{ color: 'var(--brand-ink)' }}>India</span>
          </span>
        </a>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5" aria-label="Dashboard">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                    isActive
                      ? 'nav-item-active border'
                      : 'nav-item border border-transparent ink-secondary hover:bg-[color:var(--surface-sunken)]'
                  }`
                }
                end={item.to === '/app/overview'}
              >
                <item.icon size={16} strokeWidth={2} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="space-y-3 border-t p-4" style={{ borderColor: 'var(--border)' }}>
          {dataState === 'ready' ? (
            <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
              style={{ borderColor: data?.synthetic ? 'var(--status-warning-surface)' : 'var(--status-good-surface)', background: data?.synthetic ? 'var(--status-warning-surface)' : 'var(--status-good-surface)' }}>
              {data?.synthetic
                ? <CircleAlert size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning)' }} />
                : <CircleCheck size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--status-good)' }} />}
              <span className="text-[11px] leading-relaxed" style={{ color: data?.synthetic ? 'var(--status-warning)' : 'var(--status-good)' }}>
                {data?.synthetic ? 'Synthetic demo dataset' : 'Historical NAV dataset'}
              </span>
            </div>
          ) : (
            <div className="rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              {dataState === 'loading' ? 'Connecting to the data service…' : 'Dataset unavailable'}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Schemes', dataState === 'ready' ? String(schemeCount) : '—'],
              ['NAV rows', dataState === 'ready' ? navCount.toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border px-3 py-2" style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border)' }}>
                <div className="text-[10px] ink-muted">{label}</div>
                <div className="mt-0.5 text-sm font-bold tabular ink-primary">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="app-main flex min-w-0 flex-1 flex-col">
        <TopNav />
        <div className="app-page-heading flex items-center justify-between gap-4 border-b px-7 py-5" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--surface) 72%, transparent)' }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[color:var(--brand-ink)]">FundScope workspace</div>
            <h1 className="page-title mt-1">{title}</h1>
            <p className="mt-1 text-[12px] ink-muted">{PAGE_DESCRIPTIONS[current?.to ?? '']}</p>
          </div>
          <div className="hidden items-center gap-2 text-[11px] ink-muted sm:flex">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: dataState === 'ready' ? 'var(--status-good)' : dataState === 'error' ? 'var(--status-critical)' : 'var(--status-warning)' }} />
            {dataState === 'ready' ? 'Data connected' : dataState === 'error' ? 'Data unavailable' : 'Connecting'}
          </div>
        </div>

        <main className="app-content mx-auto w-full max-w-[1480px] flex-1 px-7 py-6">
          {dataState === 'error' && (
            <div className="mb-5">
              <ErrorState
                title="Dataset unavailable"
                detail={`Could not load project data: ${dataError}. Restore the FastAPI service, then retry.`}
                onRetry={() => void reloadData()}
              />
            </div>
          )}
          {data?.synthetic && <div className="mb-5"><SyntheticDataBanner /></div>}
          <Outlet context={{ data, dataState, reload: reloadData, user }} />
        </main>
        <ChatWidget />
      </div>
    </div>
  );
}
