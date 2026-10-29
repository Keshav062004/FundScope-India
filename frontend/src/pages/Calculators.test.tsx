import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Calculators from './Calculators';

vi.mock('recharts', () => {
  const Chart = () => null;
  return {
    Area: () => null,
    AreaChart: Chart,
    Bar: () => null,
    BarChart: Chart,
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

describe('Calculators', () => {
  it('updates the displayed lumpsum estimate for a hand-checkable one-year period', () => {
    render(<Calculators />);

    const lumpsum = document.getElementById('calc-lumpsum');
    if (!(lumpsum instanceof HTMLElement)) throw new Error('Lumpsum calculator section is not rendered.');
    const calculator = within(lumpsum);

    expect(calculator.getByText('₹15.53 L')).toBeInTheDocument();
    fireEvent.change(calculator.getByRole('slider', { name: 'Investment Period (Years)' }), { target: { value: '1' } });

    expect(calculator.getByText('₹5.60 L')).toBeInTheDocument();
  });
});
