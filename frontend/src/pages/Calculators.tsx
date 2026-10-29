import { cloneElement, useId, useState, useMemo, type ReactElement } from 'react';
import {
  TrendingUp, Zap, Flame, Landmark, Coins, BarChart3,
  ArrowRight, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { SERIES, CHART } from '../theme';

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
function fmtCr(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}
function fmtL(v: number) { return `₹${(v / 1e5).toFixed(2)}L`; }

/* ─────────────────────────────────────────────────────────
   Calculator engines
───────────────────────────────────────────────────────── */

// SIP: FV = PMT × [((1+r)^n - 1) / r] × (1+r)
function calcSIP(monthly: number, rateAnnual: number, years: number) {
  const r = rateAnnual / 100 / 12;
  const n = years * 12;
  const fv = r === 0 ? monthly * n : monthly * (((1 + r) ** n - 1) / r) * (1 + r);
  const invested = monthly * n;
  const gain = fv - invested;
  // Year-by-year data
  const chart = Array.from({ length: years }, (_, i) => {
    const ni = (i + 1) * 12;
    const fvi = r === 0 ? monthly * ni : monthly * (((1 + r) ** ni - 1) / r) * (1 + r);
    return { year: `Y${i + 1}`, invested: monthly * ni, corpus: Math.round(fvi) };
  });
  return { fv, invested, gain, chart };
}

// Step-up SIP
function calcStepUpSIP(monthly: number, rateAnnual: number, stepupPct: number, years: number) {
  const r = rateAnnual / 100 / 12;
  let corpus = 0, invested = 0;
  const chart: { year: string; invested: number; corpus: number }[] = [];
  let sip = monthly;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      invested += sip;
      corpus = (corpus + sip) * (1 + r);
    }
    chart.push({ year: `Y${y}`, invested: Math.round(invested), corpus: Math.round(corpus) });
    sip = sip * (1 + stepupPct / 100);
  }
  return { fv: corpus, invested, gain: corpus - invested, chart };
}

// Lumpsum: FV = PV × (1 + r)^n
function calcLumpsum(principal: number, rateAnnual: number, years: number) {
  const fv = principal * (1 + rateAnnual / 100) ** years;
  const gain = fv - principal;
  const chart = Array.from({ length: years }, (_, i) => ({
    year: `Y${i + 1}`,
    invested: principal,
    corpus: Math.round(principal * (1 + rateAnnual / 100) ** (i + 1)),
  }));
  return { fv, gain, chart };
}

// SWP: each month withdraw W, remaining grows at r/12
function calcSWP(corpus: number, monthly: number, rateAnnual: number) {
  const r = rateAnnual / 100 / 12;
  let bal = corpus, months = 0, totalWithdrawn = 0;
  const chart: { year: string; balance: number }[] = [];
  while (bal > 0 && months < 600) {
    bal = bal * (1 + r) - monthly;
    months++;
    totalWithdrawn += monthly;
    if (months % 12 === 0) chart.push({ year: `Y${months / 12}`, balance: Math.max(0, Math.round(bal)) });
  }
  const years = months / 12;
  return { months, years, totalWithdrawn, chart };
}

// FIRE: corpus needed = expenses × 12 / withdrawal rate
// Years to FIRE via SIP
function calcFIRE(monthlyExp: number, inflationPct: number, returnPct: number, monthlyInv: number) {
  const inflation = inflationPct / 100;
  const annualReturn = returnPct / 100;
  const annualExp = monthlyExp * 12;
  const fireNumber = annualExp / 0.04; // 4% rule
  const monthlyReturn = (1 + annualReturn) ** (1 / 12) - 1;
  let corpus = 0, months = 0;
  const chart: { year: string; corpus: number; target: number }[] = [];
  while (months < 600) {
    const target = fireNumber * (1 + inflation) ** (months / 12);
    if (corpus >= target) break;
    corpus = (corpus + monthlyInv) * (1 + monthlyReturn);
    months++;
    if (months % 12 === 0) {
      const year = months / 12;
      chart.push({
        year: `Y${year}`,
        corpus: Math.round(corpus),
        target: Math.round(fireNumber * (1 + inflation) ** year),
      });
    }
  }
  const years = months / 12;
  const realReturn = (1 + annualReturn) / (1 + inflation) - 1;
  return { fireNumber, years, chart, realReturn };
}

/* ─────────────────────────────────────────────────────────
   Shared UI primitives
───────────────────────────────────────────────────────── */
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ labelId?: string }>;
}) {
  const labelId = useId();
  return (
    <div className="block">
      <span id={labelId} className="field-label">{label}</span>
      {cloneElement(children, { labelId })}
    </div>
  );
}

function Slider({ min, max, step, value, onChange, format, labelId }:
  { min: number; max: number; step: number; value: number; onChange: (v: number) => void; format?: (v: number) => string; labelId?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        aria-labelledby={labelId}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--brand)', cursor: 'pointer' }}
      />
      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--brand)', minWidth: 68, textAlign: 'right' }}>
        {format ? format(value) : value}
      </span>
    </div>
  );
}

function ResultBadge({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      background: accent ? `color-mix(in srgb, ${accent} 12%, transparent)` : 'var(--brand-surface)',
      border: `1px solid ${accent ? `color-mix(in srgb, ${accent} 30%, transparent)` : 'var(--brand-surface-strong)'}`,
      borderRadius: 12, padding: '12px 16px', flex: 1, minWidth: 130,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-muted)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function CalcCard({
  id, icon: Icon, title, subtitle, accent, children,
}: {
  id: string; icon: React.ElementType; title: string; subtitle: string;
  accent: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section id={id} className="card" style={{ overflow: 'hidden' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-content`}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '18px 22px', cursor: 'pointer', textAlign: 'left',
          border: 0,
          borderBottom: open ? '1px solid var(--border)' : 'none',
          background: open ? 'var(--surface)' : 'var(--surface-sunken)',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent, flexShrink: 0,
        }}>
          <Icon size={18} strokeWidth={2.1} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>
        </div>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>
      {open && <div id={`${id}-content`} style={{ padding: '20px 22px' }}>{children}</div>}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Individual calculators
───────────────────────────────────────────────────────── */
function SIPCalc() {
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(15);
  const res = useMemo(() => calcSIP(monthly, rate, years), [monthly, rate, years]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="calc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Monthly SIP (₹)">
          <Slider min={500} max={200000} step={500} value={monthly} onChange={setMonthly} format={v => fmtCr(v)} />
        </Field>
        <Field label="Expected Annual Return">
          <Slider min={4} max={30} step={0.5} value={rate} onChange={setRate} format={v => `${v}%`} />
        </Field>
        <Field label="Investment Period (Years)">
          <Slider min={1} max={40} step={1} value={years} onChange={setYears} format={v => `${v} yr`} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ResultBadge label="Total Corpus" value={fmtCr(res.fv)} accent={SERIES[0]} />
        <ResultBadge label="Invested" value={fmtCr(res.invested)} />
        <ResultBadge label="Wealth Gained" value={fmtCr(res.gain)} accent={SERIES[2]} />
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={res.chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sipCorpus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES[0]} stopOpacity={0.22} />
              <stop offset="95%" stopColor={SERIES[0]} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => fmtL(v)} tick={{ fontSize: 10, fill: CHART.tick }} axisLine={false} tickLine={false} width={60} />
          <Tooltip formatter={(v) => fmtCr(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
          <Area type="monotone" dataKey="corpus" stroke={SERIES[0]} fill="url(#sipCorpus)" strokeWidth={2} name="Corpus" />
          <Area type="monotone" dataKey="invested" stroke={SERIES[2]} fill="none" strokeWidth={1.5} strokeDasharray="4 3" name="Invested" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StepUpSIPCalc() {
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [stepup, setStepup] = useState(10);
  const [years, setYears] = useState(15);
  const res = useMemo(() => calcStepUpSIP(monthly, rate, stepup, years), [monthly, rate, stepup, years]);
  const flat = useMemo(() => calcSIP(monthly, rate, years), [monthly, rate, years]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="calc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Starting Monthly SIP (₹)">
          <Slider min={500} max={100000} step={500} value={monthly} onChange={setMonthly} format={v => fmtCr(v)} />
        </Field>
        <Field label="Expected Annual Return">
          <Slider min={4} max={30} step={0.5} value={rate} onChange={setRate} format={v => `${v}%`} />
        </Field>
        <Field label="Annual Step-Up %">
          <Slider min={0} max={50} step={1} value={stepup} onChange={setStepup} format={v => `${v}%`} />
        </Field>
        <Field label="Investment Period (Years)">
          <Slider min={1} max={40} step={1} value={years} onChange={setYears} format={v => `${v} yr`} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ResultBadge label="Step-Up Corpus" value={fmtCr(res.fv)} accent={SERIES[6]} />
        <ResultBadge label="Flat SIP Corpus" value={fmtCr(flat.fv)} />
        <ResultBadge label="Extra Gains" value={fmtCr(res.fv - flat.fv)} accent={SERIES[2]} />
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={res.chart} barCategoryGap={14}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => fmtL(v)} tick={{ fontSize: 10, fill: CHART.tick }} axisLine={false} tickLine={false} width={60} />
          <Tooltip formatter={(v) => fmtCr(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="invested" name="Invested" fill={SERIES[2]} opacity={0.7} radius={[2, 2, 0, 0]} />
          <Bar dataKey="corpus" name="Corpus" fill={SERIES[6]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LumpsumCalc() {
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const res = useMemo(() => calcLumpsum(principal, rate, years), [principal, rate, years]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="calc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Lumpsum Amount (₹)">
          <Slider min={10000} max={10000000} step={10000} value={principal} onChange={setPrincipal} format={v => fmtCr(v)} />
        </Field>
        <Field label="Expected Annual Return (CAGR)">
          <Slider min={4} max={30} step={0.5} value={rate} onChange={setRate} format={v => `${v}%`} />
        </Field>
        <Field label="Investment Period (Years)">
          <Slider min={1} max={40} step={1} value={years} onChange={setYears} format={v => `${v} yr`} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ResultBadge label="Future Value" value={fmtCr(res.fv)} accent={SERIES[3]} />
        <ResultBadge label="Invested" value={fmtCr(principal)} />
        <ResultBadge label="Absolute Gain" value={fmtCr(res.gain)} accent={SERIES[2]} />
        <ResultBadge label="Multiplier" value={`${(res.fv / principal).toFixed(2)}×`} accent={SERIES[1]} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={res.chart}>
          <defs>
            <linearGradient id="lsCorpus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES[3]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={SERIES[3]} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => fmtL(v)} tick={{ fontSize: 10, fill: CHART.tick }} axisLine={false} tickLine={false} width={60} />
          <Tooltip formatter={(v) => fmtCr(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
          <Area type="monotone" dataKey="corpus" stroke={SERIES[3]} fill="url(#lsCorpus)" strokeWidth={2} name="Corpus" />
          <Area type="monotone" dataKey="invested" stroke={SERIES[2]} fill="none" strokeWidth={1.5} strokeDasharray="4 3" name="Invested" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SWPCalc() {
  const [corpus, setCorpus] = useState(5000000);
  const [monthly, setMonthly] = useState(30000);
  const [rate, setRate] = useState(8);
  const res = useMemo(() => calcSWP(corpus, monthly, rate), [corpus, monthly, rate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="calc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Initial Corpus (₹)">
          <Slider min={100000} max={50000000} step={100000} value={corpus} onChange={setCorpus} format={v => fmtCr(v)} />
        </Field>
        <Field label="Monthly Withdrawal (₹)">
          <Slider min={1000} max={200000} step={1000} value={monthly} onChange={setMonthly} format={v => fmtCr(v)} />
        </Field>
        <Field label="Expected Annual Return">
          <Slider min={4} max={20} step={0.5} value={rate} onChange={setRate} format={v => `${v}%`} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ResultBadge label="Corpus Lasts" value={res.months < 600 ? `${res.years.toFixed(1)} yrs` : '40+ yrs'} accent={SERIES[4]} />
        <ResultBadge label="Total Withdrawn" value={res.months < 600 ? fmtCr(res.totalWithdrawn) : 'Perpetual'} accent={SERIES[2]} />
      </div>
      {res.chart.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={res.chart}>
            <defs>
              <linearGradient id="swpBal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={SERIES[4]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={SERIES[4]} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmtL(v)} tick={{ fontSize: 10, fill: CHART.tick }} axisLine={false} tickLine={false} width={60} />
            <Tooltip formatter={(v) => fmtCr(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
            <Area type="monotone" dataKey="balance" stroke={SERIES[4]} fill="url(#swpBal)" strokeWidth={2} name="Balance" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function FIRECalc() {
  const [expenses, setExpenses] = useState(50000);
  const [inflation, setInflation] = useState(6);
  const [returns, setReturns] = useState(12);
  const [monthlyInv, setMonthlyInv] = useState(30000);
  const res = useMemo(() => calcFIRE(expenses, inflation, returns, monthlyInv), [expenses, inflation, returns, monthlyInv]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="calc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Monthly Expenses (₹)">
          <Slider min={10000} max={500000} step={1000} value={expenses} onChange={setExpenses} format={v => fmtCr(v)} />
        </Field>
        <Field label="Expected Inflation (%)">
          <Slider min={2} max={15} step={0.5} value={inflation} onChange={setInflation} format={v => `${v}%`} />
        </Field>
        <Field label="Expected Portfolio Return (%)">
          <Slider min={6} max={24} step={0.5} value={returns} onChange={setReturns} format={v => `${v}%`} />
        </Field>
        <Field label="Monthly Investment (₹)">
          <Slider min={1000} max={200000} step={1000} value={monthlyInv} onChange={setMonthlyInv} format={v => fmtCr(v)} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ResultBadge label="FIRE Number (4% rule)" value={fmtCr(res.fireNumber)} accent={SERIES[1]} />
        <ResultBadge label="Years to FIRE" value={res.years < 50 ? `${res.years.toFixed(1)} yrs` : '50+ yrs'} accent={SERIES[0]} />
        <ResultBadge label="Real Return" value={`${(res.realReturn * 100).toFixed(1)}%`} accent={SERIES[2]} />
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={res.chart.slice(0, 50)}>
          <defs>
            <linearGradient id="fireCorpus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SERIES[1]} stopOpacity={0.22} />
              <stop offset="95%" stopColor={SERIES[1]} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: CHART.tick }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => fmtL(v)} tick={{ fontSize: 10, fill: CHART.tick }} axisLine={false} tickLine={false} width={60} />
          <Tooltip formatter={(v) => fmtCr(Number(v))} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12.5 }} />
          <Area type="monotone" dataKey="corpus" stroke={SERIES[1]} fill="url(#fireCorpus)" strokeWidth={2} name="Corpus" />
          <Area type="monotone" dataKey="target" stroke={SERIES[7]} fill="none" strokeWidth={1.5} strokeDasharray="5 4" name="FIRE Target" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CAGRCalc() {
  const [principal, setPrincipal] = useState(100000);
  const [finalValue, setFinalValue] = useState(250000);
  const [years, setYears] = useState(5);
  const cagr = useMemo(() => {
    if (principal <= 0 || finalValue <= 0 || years <= 0) return 0;
    return ((finalValue / principal) ** (1 / years) - 1) * 100;
  }, [principal, finalValue, years]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="calc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Initial Investment (₹)">
          <Slider min={1000} max={10000000} step={1000} value={principal} onChange={setPrincipal} format={v => fmtCr(v)} />
        </Field>
        <Field label="Final Value (₹)">
          <Slider min={1000} max={50000000} step={1000} value={finalValue} onChange={setFinalValue} format={v => fmtCr(v)} />
        </Field>
        <Field label="Investment Period (Years)">
          <Slider min={1} max={40} step={1} value={years} onChange={setYears} format={v => `${v} yr`} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <ResultBadge label="CAGR" value={`${cagr.toFixed(2)}%`} accent={SERIES[0]} />
        <ResultBadge label="Absolute Return" value={`${(((finalValue - principal) / principal) * 100).toFixed(1)}%`} accent={SERIES[2]} />
        <ResultBadge label="Multiplier" value={`${(finalValue / principal).toFixed(2)}×`} accent={SERIES[3]} />
      </div>
      <div className="insight-card" style={{ marginTop: 4 }}>
        <span style={{ fontWeight: 600 }}>Interpretation: </span>
        Your investment of <b>{fmtCr(principal)}</b> grew to <b>{fmtCr(finalValue)}</b> in <b>{years} years</b>,
        compounding at <b>{cagr.toFixed(2)}%</b> per year — that's a <b>{(finalValue / principal).toFixed(2)}×</b> multiplier.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Quick-jump tabs
───────────────────────────────────────────────────────── */
const CALCS = [
  { id: 'sip',    label: 'SIP',         icon: TrendingUp },
  { id: 'stepup', label: 'Step-Up SIP', icon: Zap },
  { id: 'fire',   label: 'FIRE',        icon: Flame },
  { id: 'swp',    label: 'SWP',         icon: Landmark },
  { id: 'lumpsum',label: 'Lumpsum',     icon: Coins },
  { id: 'cagr',   label: 'CAGR',        icon: BarChart3 },
];

/* ─────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────── */
export default function Calculators() {
  const [activeTab, setActiveTab] = useState('sip');

  function scrollTo(id: string) {
    setActiveTab(id);
    document.getElementById(`calc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--brand)', marginBottom: 6 }}>
          Financial Planning Suite
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>
          Mutual Fund Calculators
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 6 }}>
          SIP · Step-Up SIP · FIRE · SWP · Lumpsum · CAGR — illustrative tools using the assumptions you choose.
        </p>
      </div>

      {/* Quick-jump tab bar */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap',
        background: 'var(--surface-sunken)', borderRadius: 12,
        padding: 6, border: '1px solid var(--border)',
      }}>
        {CALCS.map(c => (
          <button
            key={c.id}
            onClick={() => scrollTo(c.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, transition: 'all .12s ease',
              background: activeTab === c.id ? 'var(--brand)' : 'transparent',
              color: activeTab === c.id ? 'var(--brand-contrast)' : 'var(--text-secondary)',
            }}
          >
            <c.icon size={13} strokeWidth={2.2} />
            {c.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowRight size={12} color="var(--text-muted)" />
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Jump to any calculator</span>
        </div>
      </div>

      {/* Calculator cards */}
      <CalcCard id="calc-sip" icon={TrendingUp} title="SIP Calculator" subtitle="Estimate future value of a monthly Systematic Investment Plan" accent={SERIES[0]}>
        <SIPCalc />
      </CalcCard>

      <CalcCard id="calc-stepup" icon={Zap} title="Step-Up SIP Calculator" subtitle="Annual SIP increment — see how step-ups compound your wealth" accent={SERIES[6]}>
        <StepUpSIPCalc />
      </CalcCard>

      <CalcCard id="calc-fire" icon={Flame} title="FIRE Calculator" subtitle="Estimate a target using the 4% rule and an inflation-adjusted timeline" accent={SERIES[1]}>
        <FIRECalc />
      </CalcCard>

      <CalcCard id="calc-swp" icon={Landmark} title="SWP Calculator" subtitle="Plan monthly withdrawals — see how long your corpus will last" accent={SERIES[4]}>
        <SWPCalc />
      </CalcCard>

      <CalcCard id="calc-lumpsum" icon={Coins} title="Lumpsum Calculator" subtitle="One-time investment future value via compound interest (CAGR)" accent={SERIES[3]}>
        <LumpsumCalc />
      </CalcCard>

      <CalcCard id="calc-cagr" icon={BarChart3} title="CAGR Calculator" subtitle="Reverse-calculate compound annual growth rate from known values" accent={SERIES[2]}>
        <CAGRCalc />
      </CalcCard>

      {/* Footer note */}
      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--surface-sunken)', border: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <RefreshCw size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          All calculations are deterministic and run entirely in your browser — no data is sent to a server.
          Results are illustrative, not forecasts or advice. Calculator assumptions do not include taxes, fees, changing contributions, or variable returns. The FIRE timeline inflates the annual-expense target and assumes a constant return; the 4% rule is a simplified planning heuristic.
        </p>
      </div>
    </div>
  );
}
