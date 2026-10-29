import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Sparkles, Send, TrendingUp, Shield, Waves, RefreshCw } from 'lucide-react';
import { Panel } from '../components/Card';
import { api, fmtPct, type DatasetResponse } from '../api';

type Ctx = { data: DatasetResponse | null };

const EXAMPLES = [
  'Which fund has the highest CAGR?',
  'Which fund has the lowest drawdown?',
  'Compare all funds',
  'Explain the Sharpe ratio',
  'Summarize monthly returns',
];

export default function AIAnalyst() {
  const { data } = useOutletContext<Ctx>();
  const metrics = data?.metrics ?? [];
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ answer: string; mode: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [ollamaModel, setOllamaModel] = useState('qwen2.5:1.5b');
  const [insights, setInsights] = useState<{ insights: string; mode: string } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  async function loadInsights() {
    setInsightsLoading(true);
    try { setInsights(await api.aiInsights()); }
    catch (e: unknown) { setInsights({ insights: e instanceof Error ? e.message : 'Could not generate insights.', mode: 'error' }); }
    finally { setInsightsLoading(false); }
  }

  async function ask(q: string) {
    if (!q.trim() || metrics.length === 0) return;
    setLoading(true); setAnswer(null);
    try { setAnswer(await api.aiAsk(q.trim(), ollamaModel)); }
    catch (e: unknown) { setAnswer({ answer: e instanceof Error ? e.message : 'Something went wrong.', mode: 'error' }); }
    finally { setLoading(false); }
  }

  const best = [...metrics].filter((m) => m.cagr != null).sort((a, b) => b.cagr! - a.cagr!)[0];
  const leastDrawdown = [...metrics].filter((m) => m.max_drawdown != null).sort((a, b) => b.max_drawdown! - a.max_drawdown!)[0];
  const mostVolatile = [...metrics].filter((m) => m.annualized_volatility != null).sort((a, b) => b.annualized_volatility! - a.annualized_volatility!)[0];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-surface)', color: 'var(--brand-ink)' }}>
          <Sparkles size={17} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">AI Data Analyst</h2>
          <p className="text-[color:var(--text-muted)] text-sm">Ask in plain English — answers use project metrics and an optional local model.</p>
        </div>
      </div>

      <Panel
        title="AI-generated summary"
        subtitle="A summary from the configured backend analysis mode; the mode is shown with each response."
        action={
          <button onClick={() => void loadInsights()} disabled={insightsLoading || metrics.length === 0} className="btn btn-secondary btn-sm">
            <RefreshCw size={13} className={insightsLoading ? 'animate-spin' : ''} /> {insights ? 'Refresh summary' : 'Generate summary'}
          </button>
        }
      >
        {!data ? (
          <div className="text-sm text-[color:var(--text-muted)]">The dataset is unavailable. Check the data-service status and retry.</div>
        ) : metrics.length === 0 ? (
          <div className="text-sm text-[color:var(--text-muted)]">No fund metrics are available. Run the pipeline to prepare the dataset.</div>
        ) : insightsLoading && !insights ? (
          <div className="text-sm text-[color:var(--text-muted)]">Generating…</div>
        ) : insights ? (
          <div className="insight-card">
            <div className="flex items-center justify-between mb-2">
              <span className="badge badge-brand">{insights.mode}</span>
            </div>
            <div className="whitespace-pre-wrap text-[13.5px]">{insights.insights}</div>
          </div>
        ) : null}
      </Panel>

      <details className="card card-pad">
        <summary className="cursor-pointer font-semibold text-[13px] text-[color:var(--text-primary)]">Enable optional local AI (free, via Ollama)</summary>
        <div className="mt-3 text-[13px] text-[color:var(--text-secondary)] space-y-2">
          <p>Install Ollama from ollama.com, then run <code className="bg-[color:var(--surface-sunken)] px-1.5 py-0.5 rounded">ollama pull qwen2.5:1.5b</code>.</p>
          <input className="input w-64" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} />
          <p className="text-[11.5px] text-[color:var(--text-muted)]">Ollama runs on your machine. A hosted app cannot reach Ollama running on your laptop.</p>
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} disabled={loading || metrics.length === 0} onClick={() => { setQuestion(ex); void ask(ex); }} className="btn btn-secondary btn-sm">{ex}</button>
        ))}
      </div>

      <div className="flex gap-3">
        <input className="input flex-1" placeholder="e.g. Compare CAGR and drawdown across schemes"
          value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && void ask(question)} />
        <button onClick={() => void ask(question)} disabled={loading || !question.trim() || metrics.length === 0} className="btn btn-primary">
          <Send size={14} /> {loading ? 'Analyzing…' : 'Ask'}
        </button>
      </div>

      {answer && (
        <div className="insight-card">
          <div className="flex items-center justify-between">
            <b className="text-[color:var(--text-primary)]">FundScope Analyst</b>
            <span className="badge badge-brand">{answer.mode}</span>
          </div>
          <div className="mt-2 whitespace-pre-wrap text-[13.5px]">{answer.answer}</div>
        </div>
      )}
      {answer && <p className="text-[11.5px] text-[color:var(--text-muted)]">Answers are descriptive, not investment advice. Verify metrics before making decisions.</p>}

      <h2 className="text-lg font-bold text-[color:var(--text-primary)] pt-2">Automatic AI insights</h2>
      {metrics.length === 0 ? (
        <Panel><div className="text-sm text-[color:var(--text-muted)]">Run the pipeline to generate insights.</div></Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {best && (
            <div className="insight-card flex gap-3">
              <TrendingUp size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--status-good)' }} />
              <div><b>Highest CAGR</b><div className="text-[13px] mt-1">{best.scheme_name} at {fmtPct(best.cagr)}.</div></div>
            </div>
          )}
          {leastDrawdown && (
            <div className="insight-card flex gap-3">
              <Shield size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} />
              <div><b>Least severe drawdown</b><div className="text-[13px] mt-1">{leastDrawdown.scheme_name} at {fmtPct(leastDrawdown.max_drawdown)}.</div></div>
            </div>
          )}
          {mostVolatile && (
            <div className="insight-card flex gap-3">
              <Waves size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--status-serious)' }} />
              <div><b>Highest volatility</b><div className="text-[13px] mt-1">{mostVolatile.scheme_name} at {fmtPct(mostVolatile.annualized_volatility)}.</div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
