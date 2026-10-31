import { BarChart3 } from 'lucide-react';

export default function BrandLogo() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ink-on-brand"
      style={{ background: 'linear-gradient(145deg,var(--brand-ink),var(--brand))' }}
    >
      <BarChart3 size={19} strokeWidth={2.5} />
    </span>
  );
}
