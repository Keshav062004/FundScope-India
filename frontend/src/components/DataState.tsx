import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingState({ label = 'Loading data' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="state-panel">
      <span className="supporting-copy">{label}…</span>
      <span className="state-skeleton w-full" />
      <span className="state-skeleton w-4/5" />
      <span className="state-skeleton w-3/5" />
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div role="status" className="state-panel">
      <h3 className="section-title">{title}</h3>
      <p className="body-copy">{detail}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Data could not be loaded',
  detail,
  onRetry,
}: {
  title?: string;
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="state-panel state-error">
      <div className="flex items-center gap-2 text-[color:var(--status-critical)]">
        <AlertCircle size={16} aria-hidden="true" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="body-copy">{detail}</p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
        <RefreshCw size={14} aria-hidden="true" /> Retry
      </button>
    </div>
  );
}

export function SyntheticDataBanner() {
  return (
    <div role="note" className="warning-banner flex items-start gap-2.5">
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        <b>Synthetic demo data:</b> these records are illustrative test data, not actual mutual-fund market performance.
      </span>
    </div>
  );
}
