import {
  BookOpen, Calculator, Cog, GitBranch, LayoutGrid, LineChart, Search, Sparkles,
  TrendingUp, Wallet, type LucideIcon,
} from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { to: '/app/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/app/explore', label: 'Explore Funds', icon: LineChart },
  { to: '/app/stocks', label: 'Stock Analytics', icon: TrendingUp },
  { to: '/app/live-nav', label: 'Live Mutual Fund NAV', icon: Search },
  { to: '/app/portfolio', label: 'My Portfolio', icon: Wallet },
  { to: '/app/ai-analyst', label: 'AI Data Analyst', icon: Sparkles },
  { to: '/app/automation', label: 'Automation Center', icon: Cog },
  { to: '/app/lineage', label: 'Data Lineage', icon: GitBranch },
  { to: '/app/guide', label: 'Project Guide', icon: BookOpen },
  { to: '/app/calculators', label: 'Calculators', icon: Calculator },
];
