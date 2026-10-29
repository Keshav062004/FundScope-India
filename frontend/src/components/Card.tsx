import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  foot,
  icon: Icon,
  tone = 'brand',
}: {
  label: string;
  value: string;
  foot?: string;
  icon: LucideIcon;
  tone?: 'brand' | 'good' | 'critical' | 'neutral';
}) {
  const toneMap: Record<string, { bg: string; fg: string }> = {
    brand: { bg: 'var(--brand-surface)', fg: 'var(--brand-ink)' },
    good: { bg: 'var(--status-good-surface)', fg: 'var(--status-good)' },
    critical: { bg: 'var(--status-critical-surface)', fg: 'var(--status-critical)' },
    neutral: { bg: 'var(--surface-sunken)', fg: 'var(--text-secondary)' },
  };
  const t = toneMap[tone];
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between">
        <div className="text-[13px] font-semibold ink-secondary">{label}</div>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: t.bg, color: t.fg }}
        >
          <Icon size={16} strokeWidth={2.25} />
        </div>
      </div>
      <div className="font-extrabold text-[1.65rem] tracking-tight ink-primary mt-3 tabular">
        {value}
      </div>
      {foot && <div className="text-[12px] ink-muted mt-1.5">{foot}</div>}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card card-pad ${className}`}>
      {title && (
        <div className="panel-header">
          <div>
            <div className="panel-title">{title}</div>
            {subtitle && <div className="panel-sub">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
