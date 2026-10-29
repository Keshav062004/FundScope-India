import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, LoadingState, SyntheticDataBanner } from './DataState';

describe('shared data states', () => {
  it('announces loading and renders skeletons', () => {
    render(<LoadingState label="Loading test data" />);

    expect(screen.getByRole('status', { name: 'Loading test data' })).toBeInTheDocument();
    expect(document.querySelectorAll('.state-skeleton')).toHaveLength(3);
  });

  it('shows an empty state with its next action', () => {
    const onRefresh = vi.fn();
    render(
      <EmptyState
        title="No test records"
        detail="Refresh the dataset to try again."
        action={<button onClick={onRefresh}>Refresh dataset</button>}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh dataset' }));
    expect(screen.getByRole('status')).toHaveTextContent('No test records');
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('exposes an error and invokes retry', () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Request failed" detail="The test service is unavailable." onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('The test service is unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('labels synthetic records clearly', () => {
    render(<SyntheticDataBanner />);

    expect(screen.getByRole('note')).toHaveTextContent(/synthetic demo data/i);
    expect(screen.getByRole('note')).toHaveTextContent(/not actual mutual-fund market performance/i);
  });
});
