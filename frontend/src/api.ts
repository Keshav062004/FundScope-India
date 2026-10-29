export type Metric = {
  scheme_code: string;
  scheme_name: string;
  category: string;
  observations: number;
  start_date: string;
  end_date: string;
  starting_nav: number;
  ending_nav: number;
  period_return: number | null;
  cagr: number | null;
  annualized_volatility: number | null;
  max_drawdown: number | null;
  sharpe_ratio: number | null;
  sortino_ratio?: number | null;
  calmar_ratio?: number | null;
};

export type NavPoint = {
  scheme_code: string;
  scheme_name: string;
  date: string;
  nav: number;
  category: string;
  daily_return: number | null;
};

export type MonthlyPoint = {
  scheme_code: string;
  scheme_name: string;
  month: string;
  month_end_nav: number;
  monthly_return: number | null;
};

export type BenchmarkComparison = {
  scheme_code: string;
  scheme_name: string;
  category: string;
  benchmark_code: string;
  benchmark_name: string;
  benchmark_category: string;
  start_date: string | null;
  end_date: string | null;
  observations: number;
  fund_return: number | null;
  benchmark_return: number | null;
  return_difference: number | null;
};

export type KeyFinding = {
  title: string;
  value: string;
  detail: string;
  source: string;
};

export type DatasetResponse = {
  metrics: Metric[];
  nav: NavPoint[];
  monthly: MonthlyPoint[];
  benchmarks?: BenchmarkComparison[];
  findings?: KeyFinding[];
  source_mode?: string;
  source_url?: string | null;
  generated_at_utc?: string | null;
  synthetic: boolean;
};

export type User = { email: string; local_id: string };

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const BASE = (configuredApiBase || '/api').replace(/\/+$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getData: () => request<DatasetResponse>('/data'),
  getStatus: () => request<any>('/status'),
  runPipeline: (source: 'demo' | 'real') =>
    request<any>('/pipeline/run', { method: 'POST', body: JSON.stringify({ source }) }),
  refreshNav: () => request<any>('/pipeline/refresh-nav', { method: 'POST' }),
  downloadUrl: (filename: string) => `${BASE}/downloads/${filename}`,

  stockTickers: () => request<string[]>('/stocks/tickers'),
  stockHistory: (ticker: string, start: string, end: string, mode: 'synthetic' | 'provider') =>
    request<any[]>(`/stocks/history?ticker=${encodeURIComponent(ticker)}&start=${start}&end=${end}&mode=${mode}`),

  mfSearch: (q: string) => request<any[]>(`/mf/search?q=${encodeURIComponent(q)}`),
  mfNav: (code: string, start: string, end: string) =>
    request<{ data: any[]; meta: any }>(`/mf/nav?code=${encodeURIComponent(code)}&start=${start}&end=${end}`),

  portfolioCalculate: (holdings: any[]) =>
    request<any[]>('/portfolio/calculate', { method: 'POST', body: JSON.stringify({ holdings }) }),

  lineage: () => request<any[]>('/lineage'),

  aiAsk: (question: string, ollama_model = 'qwen2.5:1.5b') =>
    request<{ answer: string; mode: string }>('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question, ollama_model }),
    }),
  aiChat: (messages: { role: 'user' | 'model'; content: string }[]) =>
    request<{ reply: string; mode: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    }),
  aiInsights: () => request<{ insights: string; mode: string }>('/ai/insights'),

  session: () => request<{ user: User | null }>('/auth/session'),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  firebaseLogin: (email: string, password: string) =>
    request<any>('/auth/firebase/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  firebaseSignup: (email: string, password: string) =>
    request<any>('/auth/firebase/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  firebaseReset: (email: string) =>
    request<any>('/auth/firebase/reset', { method: 'POST', body: JSON.stringify({ email }) }),
  googleLoginUrl: () => `${BASE}/auth/google/login`,
};

export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(2)}%`;
}

export function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
