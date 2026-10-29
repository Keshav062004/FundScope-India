import {
  Calculator, LayoutGrid, LineChart, Wallet, type LucideIcon,
} from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { to: '/app/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/app/explore', label: 'Fund Explorer', icon: LineChart },
  { to: '/app/calculators', label: 'Calculators', icon: Calculator },
  { to: '/app/portfolio', label: 'Portfolio', icon: Wallet },
];
