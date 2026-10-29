import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, CheckCircle2, CircleAlert, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

type Tab = 'login' | 'signup' | 'reset';
type Notice = { type: 'error' | 'success'; text: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Login() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const { refresh, error: authError } = useAuth();
  const [params] = useSearchParams();
  const oauthError = params.get('error');
  const requestedPath = params.get('next');
  const nextPath = requestedPath?.startsWith('/app/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/app/overview';

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    setNotice(null);
    setPassword('');
    setConfirm('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!isValidEmail(email.trim())) {
      setNotice({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    if (tab !== 'reset' && !password) {
      setNotice({ type: 'error', text: 'Enter your password.' });
      return;
    }
    if (tab === 'signup' && password.length < 6) {
      setNotice({ type: 'error', text: 'Use a password with at least 6 characters.' });
      return;
    }
    if (tab === 'signup' && password !== confirm) {
      setNotice({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setPending(true);
    try {
      if (tab === 'login') {
        const result = await api.firebaseLogin(email.trim(), password);
        if (result.error) {
          setNotice({ type: 'error', text: result.error });
          return;
        }
        await refresh();
        navigate(nextPath, { replace: true });
        return;
      }

      if (tab === 'signup') {
        const result = await api.firebaseSignup(email.trim(), password);
        if (result.error) {
          setNotice({ type: 'error', text: result.error });
          return;
        }
        setNotice({ type: 'success', text: result.message ?? 'Check your email for next steps.' });
        setTab('login');
        setPassword('');
        setConfirm('');
        return;
      }

      const result = await api.firebaseReset(email.trim());
      if (result.error) {
        setNotice({ type: 'error', text: result.error });
        return;
      }
      setNotice({ type: 'success', text: result.message ?? 'If this address can receive a reset email, instructions will be sent.' });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'The authentication service is unavailable. Please try again.',
      });
    } finally {
      setPending(false);
    }
  }

  const heading = tab === 'login' ? 'Welcome back' : tab === 'signup' ? 'Create your account' : 'Reset your password';
  const description = tab === 'login'
    ? 'Sign in to continue to your analytics workspace.'
    : tab === 'signup'
      ? 'Create an account to access the project workspace.'
      : 'Enter your account email and we’ll request a reset link.';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{ background: 'radial-gradient(ellipse at 18% 0%,var(--brand-surface),transparent 38%),var(--page-plane)' }}>
      <Link to="/" className="absolute left-5 top-5 inline-flex items-center gap-2 text-[12px] font-medium ink-secondary transition hover:text-white sm:left-8 sm:top-7">
        <ArrowLeft size={15} /> Back to home
      </Link>

      <div className="grid w-full max-w-[920px] overflow-hidden rounded-2xl border shadow-2xl md:grid-cols-[.9fr_1.1fr]"
        style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}>
        <section className="hidden flex-col justify-between border-r p-9 md:flex" style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg,var(--surface),var(--surface-sunken))' }}>
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 text-[14px] font-extrabold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--brand-contrast)]" style={{ background: 'linear-gradient(145deg,var(--brand-ink),var(--brand))' }}>
                <BarChart3 size={19} />
              </span>
              <span>FundScope <span style={{ color: 'var(--brand-ink)' }}>India</span></span>
            </Link>
            <div className="mt-16 max-w-sm">
              <span className="text-[10px] font-bold uppercase tracking-[.16em]" style={{ color: 'var(--brand-ink)' }}>Research with context</span>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight">A clearer view of historical fund data.</h1>
              <p className="mt-4 text-[13px] leading-6 ink-secondary">
                Review available data, understand its limitations, and explore performance and risk in one workspace.
              </p>
            </div>
          </div>
          <p className="text-[10.5px] leading-relaxed ink-muted">Educational analytics only. Mutual fund investments are subject to market risks.</p>
        </section>

        <section className="p-6 sm:p-9">
          <div className="mb-7 flex items-center gap-2.5 md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--brand-contrast)]" style={{ background: 'linear-gradient(145deg,var(--brand-ink),var(--brand))' }}>
              <BarChart3 size={19} />
            </span>
            <span className="text-[15px] font-extrabold">FundScope <span style={{ color: 'var(--brand-ink)' }}>India</span></span>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border"
              style={{ color: 'var(--brand-ink)', borderColor: 'var(--brand-surface-strong)', background: 'var(--brand-surface)' }}>
              <LockKeyhole size={17} />
            </div>
            <h2 className="text-[21px] font-bold tracking-tight text-[var(--text-primary)]">{heading}</h2>
            <p className="mt-1 text-[12px] ink-muted">{description}</p>
          </div>

          {oauthError && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-[11px]"
              style={{ borderColor: 'var(--status-warning-surface)', color: 'var(--status-warning)', background: 'var(--status-warning-surface)' }}>
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              Google sign-in could not complete. Try again or use email below.
            </div>
          )}
          {authError && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-[11px]"
              style={{ borderColor: 'var(--status-critical-surface)', color: 'var(--status-critical)', background: 'var(--status-critical-surface)' }}>
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              Could not check the current sign-in session: {authError}
            </div>
          )}

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border p-1"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-sunken)' }}>
            {([
              ['login', 'Sign in'],
              ['signup', 'Create account'],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => changeTab(id)}
                className="rounded-md px-2 py-2 text-[11px] font-semibold transition"
                style={tab === id ? { color: 'var(--text-primary)', background: 'var(--brand-surface-strong)', boxShadow: 'inset 0 0 0 1px var(--brand-surface-strong)' } : { color: 'var(--text-muted)' }}>
                {label}
              </button>
            ))}
          </div>

                   {(tab === 'login' || tab === 'signup') && (
            <a
              href={api.googleLoginUrl()}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[12px] font-semibold transition"
              style={{ borderColor: '#d8dce1', background: '#ffffff', color: '#1f1f1f', opacity: 1 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f1f1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
            >
              <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.4-17.7 10.2z" />
                <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-5c-1.9 1.3-4.3 2-6.9 2-5.3 0-9.7-2.6-11.3-6.9l-6.6 5C9.6 39.1 16.2 43.5 24 43.5z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.3-2.5 4.3-4.5 5.6l6 5c-.4.4 7.2-5.1 7.2-14.6 0-1.2-.1-2.3-.4-3.5z" />
              </svg>
              <span style={{ color: '#1f1f1f' }}>Continue with Google</span>
            </a>
          )}

          {(tab === 'login' || tab === 'signup') && (
            <div className="mb-4 flex items-center gap-3 text-[10px] ink-muted">
              <span className="h-px flex-1" style={{ background: 'var(--border-strong)' }} />
              or use email
              <span className="h-px flex-1" style={{ background: 'var(--border-strong)' }} />
            </div>
          )}

          <form onSubmit={(event) => void handleSubmit(event)} noValidate>
            <div className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider ink-secondary">Email address</label>
                <input id="auth-email" name="email" type="email" autoComplete="email" required className="input"
                  placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>

              {tab !== 'reset' && (
                <div>
                  <label htmlFor="auth-password" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider ink-secondary">Password</label>
                  <div className="relative">
                    <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                      required className="input pr-11" placeholder={tab === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                      value={password} onChange={(event) => setPassword(event.target.value)} />
                    <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center ink-muted hover:text-white"
                      onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider ink-secondary">Confirm password</label>
                  <input id="auth-confirm" name="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required className="input"
                    value={confirm} onChange={(event) => setConfirm(event.target.value)} />
                </div>
              )}

              {notice && (
                <div role={notice.type === 'error' ? 'alert' : 'status'} className="flex items-start gap-2 rounded-lg border p-3 text-[11px]"
                  style={notice.type === 'error'
                    ? { borderColor: 'var(--status-critical-surface)', color: 'var(--status-critical)', background: 'var(--status-critical-surface)' }
                    : { borderColor: 'var(--status-good-surface)', color: 'var(--brand-ink)', background: 'var(--status-good-surface)' }}>
                  {notice.type === 'error' ? <CircleAlert size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
                  {notice.text}
                </div>
              )}

              <button type="submit" disabled={pending} className="btn btn-primary w-full py-3">
                {pending ? 'Please wait…' : tab === 'login' ? 'Sign in' : tab === 'signup' ? 'Create account' : 'Send reset email'}
              </button>

              {tab !== 'reset' && (
                <button type="button" onClick={() => changeTab('reset')} className="w-full text-center text-[11px] ink-muted transition hover:text-[var(--brand-ink)]">
                  Forgot your password?
                </button>
              )}
              {tab === 'reset' && (
                <button type="button" onClick={() => changeTab('login')} className="w-full text-center text-[11px] ink-muted transition hover:text-[var(--brand-ink)]">
                  Back to sign in
                </button>
              )}
            </div>
          </form>

          <p className="mt-6 border-t pt-4 text-center text-[10px] leading-relaxed ink-muted" style={{ borderColor: 'var(--border)' }}>
            Educational analytics only · Not investment advice
          </p>
        </section>
      </div>
    </main>
  );
}
