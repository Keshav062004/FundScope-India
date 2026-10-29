import type { PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { DatasetResponse } from '../api';
import Overview from './Overview';

vi.mock('recharts', () => {
  const Chart = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    BarChart: Chart,
    Bar: () => null,
    CartesianGrid: () => null,
    Legend: () => null,
    Line: () => null,
    LineChart: Chart,
    ResponsiveContainer: Chart,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

const dataset: DatasetResponse = {
  synthetic: false,
  metrics: [
    {
      scheme_code: '100001',
      scheme_name: 'Test Equity Fund',
      category: 'Equity',
      observations: 3,
      start_date: '2024-01-01',
      end_date: '2026-01-01',
      starting_nav: 100,
      ending_nav: 125,
      period_return: 0.25,
      cagr: 0.1234,
      annualized_volatility: 0.15,
      max_drawdown: -0.1,
      sharpe_ratio: 0.9,
      sortino_ratio: 1.1,
      calmar_ratio: 1.2,
    },
  ],
  nav: [],
  monthly: [],
};

describe('Overview', () => {
  it('renders summary metrics from the supplied API dataset', () => {
    render(
      <MemoryRouter initialEntries={['/app/overview']}>
        <Routes>
          <Route element={<Outlet context={{ data: dataset }} />}>
            <Route path="/app/overview" element={<Overview />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Average CAGR')).toBeInTheDocument();
    expect(screen.getAllByText('12.34%')).toHaveLength(2);
    expect(screen.getAllByText('Test Equity Fund').length).toBeGreaterThan(0);
    expect(screen.getByText('1.10')).toBeInTheDocument();
    expect(screen.getByText('1.20')).toBeInTheDocument();
  });
});
