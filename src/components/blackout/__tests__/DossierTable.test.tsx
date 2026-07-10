import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DossierTable, type DossierColumn } from '../DossierTable';

interface Row {
  id: string;
  hand: string;
  net: number;
}

const rows: Row[] = [
  { id: 'a', hand: 'AKs', net: 12 },
  { id: 'b', hand: 'QQ', net: -8 },
];

const columns: DossierColumn<Row>[] = [
  { id: 'hand', header: 'Hand', render: (r) => r.hand, sortable: true },
  { id: 'net', header: 'Net BB', numeric: true, render: (r) => r.net, sortable: true },
];

describe('DossierTable', () => {
  it('renders headers and rows', () => {
    const { container } = render(
      <DossierTable columns={columns} rows={rows} rowKey={(r) => r.id} />,
    );
    expect(within(container).getByText('Hand')).toBeInTheDocument();
    expect(within(container).getByText('AKs')).toBeInTheDocument();
    expect(within(container).getByText('QQ')).toBeInTheDocument();
  });

  it('renders the empty label when there are no rows', () => {
    const { container } = render(
      <DossierTable columns={columns} rows={[]} rowKey={(r) => r.id} emptyLabel="Nothing filed." />,
    );
    expect(within(container).getByText('Nothing filed.')).toBeInTheDocument();
  });

  it('marks the active sort column and fires onSort', () => {
    const onSort = vi.fn();
    const { container } = render(
      <DossierTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ columnId: 'net', direction: 'desc' }}
        onSort={onSort}
      />,
    );
    const netHeader = within(container).getByText('Net BB').closest('th');
    expect(netHeader).toHaveAttribute('aria-sort', 'descending');
    fireEvent.click(within(container).getByText('Hand'));
    expect(onSort).toHaveBeenCalledWith('hand');
  });

  it('fires onRowClick', () => {
    const onRowClick = vi.fn();
    const { container } = render(
      <DossierTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick} />,
    );
    fireEvent.click(within(container).getByText('AKs'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
