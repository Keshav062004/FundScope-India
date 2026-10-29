import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { DatasetResponse } from '../api';
import ExploreFunds from './ExploreFunds';

vi.mock('recharts', () => {
  const Chart = () => null;
  return {
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
  synthetic: true,
  metrics: [
    {
      scheme_code: 'test-alpha',
      scheme_name: 'Synthetic Test Alpha',
      category: 'Equity',
      observations: 3,
      start_date: '2024-01-01',
      end_date: '2026-01-01',
      starting_nav: 100,
      ending_nav: 140,
      period_return: 0.4,
      cagr: 0.18,
      annualized_volatility: 0.2,
      max_drawdown: -0.15,
      sharpe_ratio: 0.8,
      sortino_ratio: 1.0,
      calmar_ratio: 1.2,
    },
    {
      scheme_code: 'test-beta',
      scheme_name: 'Synthetic Test Beta',
      category: 'Index',
      observations: 3,
      start_date: '2024-01-01',
      end_date: '2026-01-01',
      starting_nav: 100,
      ending_nav: 125,
      period_return: 0.25,
      cagr: 0.12,
      annualized_volatility: 0.1,
      max_drawdown: -0.08,
      sharpe_ratio: 1.2,
      sortino_ratio: 1.4,
      calmar_ratio: 1.5,
    },
  ],
  nav: [],
  monthly: [],
  benchmarks: [],
  findings: [],
};

function renderExploreFunds() {
  return render(
    <MemoryRouter initialEntries={['/app/explore']}>
      <Routes>
        <Route element={<Outlet context={{ data: dataset, dataState: 'ready' }} />}>
          <Route path="/app/explore" element={<ExploreFunds />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ExploreFunds filters', () => {
  it('sorts the comparison table and filters it to selected schemes', async () => {
    const user = userEvent.setup();
    renderExploreFunds();

    const table = screen.getByRole('region', { name: 'Fund historical metrics' });
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Synthetic Test Alpha');

    await user.selectOptions(screen.getByLabelText('Rank by'), 'sharpe_ratio');
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Synthetic Test Beta');

    const schemeSelect = screen.getByLabelText('Choose schemes to compare');
    await user.selectOptions(schemeSelect, 'Synthetic Test Beta');
    await user.deselectOptions(schemeSelect, 'Synthetic Test Alpha');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByText('Synthetic Test Beta')).toBeInTheDocument();
    expect(within(table).queryByText('Synthetic Test Alpha')).not.toBeInTheDocument();
  });
});
