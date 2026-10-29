import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BarChart3, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { NAV_ITEMS } from '../navigation';

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleLogout() {
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Sign out failed. Please try again.');
    }
  }

  return (
    <>
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-7"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="topnav-hamburger hidden h-9 w-9 items-center justify-center rounded-lg border"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-dashboard-navigation"
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
          <div className="hidden items-center gap-2 text-[12px] font-semibold ink-muted sm:flex">
            <BarChart3 size={15} style={{ color: 'var(--brand-ink)' }} />
            Historical analytics workspace
          </div>
          <div className="flex items-center gap-2 text-[13px] font-bold ink-primary sm:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg ink-on-brand" style={{ background: 'var(--brand)' }}>
              <BarChart3 size={15} />
            </span>
            FundScope India
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden max-w-[220px] truncate text-[12px] ink-muted sm:block" title={user?.email}>
            {user?.email ?? 'Signed in'}
          </div>
          <button type="button" onClick={() => void handleLogout()} className="btn btn-ghost btn-sm" aria-label="Sign out">
            <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {logoutError && (
        <div role="alert" className="mx-4 mt-3 rounded-lg border px-3 py-2 text-xs sm:mx-7"
          style={{ borderColor: 'var(--status-critical)', color: 'var(--status-critical)', background: 'var(--status-critical-surface)' }}>
          {logoutError}
        </div>
      )}

      {mobileOpen && (
        <div
          id="mobile-dashboard-navigation"
          className="mobile-dashboard-navigation fixed inset-x-0 bottom-0 top-14 z-40 overflow-y-auto border-t p-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <nav aria-label="Dashboard" className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app/overview'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-[color:var(--brand-surface)] text-[color:var(--brand-ink)]'
                      : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-sunken)]'
                  }`
                }
              >
                <item.icon size={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button type="button" onClick={() => void handleLogout()} className="btn btn-secondary mt-6 w-full">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </>
  );
}
