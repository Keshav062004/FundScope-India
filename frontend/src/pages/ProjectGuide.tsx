import { BookOpen, CheckCircle2 } from 'lucide-react';
import { Panel } from '../components/Card';

export default function ProjectGuide() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-surface)', color: 'var(--brand-ink)' }}>
          <BookOpen size={17} />
        </div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Project guide</h2>
      </div>

      <Panel title="What is included">
        <ul className="space-y-2 text-[13.5px] text-[color:var(--text-primary)]">
          {[
            ['Analytics pipeline', 'Python/pandas cleaning, fund-level metrics, monthly returns, and SQLite output.'],
            ['React website', 'pages for overview, scheme comparisons, AI analyst, and automation, backed by a FastAPI service.'],
            ['Local AI option', 'Ollama integration when installed and running; otherwise, rule-based answers are used.'],
            ['Power BI', 'A dashboard build guide is included in powerbi/; a .pbix report is not bundled.'],
          ].map(([title, text]) => (
            <li key={title} className="flex gap-2.5">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--status-good)' }} />
              <span><b>{title}:</b> {text}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Run it locally">
        <pre className="text-[12px] p-3.5 rounded-lg overflow-auto" style={{ background: '#0d1b2e', color: '#d8e7fb' }}>{`# Terminal 1 — backend (PowerShell)
.\\.venv\\Scripts\\Activate.ps1
python -m uvicorn backend.main:app --port 8000 --reload

# Terminal 2 — frontend
cd frontend
npm install
npm run dev`}</pre>
        <p className="text-[12px] text-[color:var(--text-muted)] mt-2">Open http://localhost:5173</p>
      </Panel>

      <Panel title="Before using real data">
        <ul className="space-y-2 text-[13.5px] text-[color:var(--text-primary)] list-disc pl-4">
          <li>Use a permitted, traceable data source for real NAV.</li>
          <li>Record source URL, retrieval date, scheme universe, and cleaning decisions.</li>
          <li>Do not present synthetic data as actual market performance.</li>
          <li>Do not interpret the application as investment advice.</li>
        </ul>
      </Panel>
    </div>
  );
}
