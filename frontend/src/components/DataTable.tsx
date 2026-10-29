import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  maxHeight,
  ariaLabel = 'Scrollable data table',
  emptyMessage = 'No rows to show.',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  maxHeight?: number;
  ariaLabel?: string;
  emptyMessage?: string;
}) {
  return (
    <div
      className="table-scroll scrollbar-thin"
      role="region"
      tabIndex={0}
      aria-label={ariaLabel}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="table-modern">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={{ textAlign: c.align ?? 'left' }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? 'left' }} className="tabular">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div role="status" className="text-center supporting-copy py-8">{emptyMessage}</div>
      )}
    </div>
  );
}
