import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilterRail, FilterSelect, FilterButtons } from '../FilterRail';

const options = [
  { label: 'All', value: 'all' },
  { label: 'BTN', value: 'BTN' },
];

describe('FilterRail', () => {
  it('renders a native select and fires onChange', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FilterRail>
        <FilterSelect label="Position" value="all" options={options} onChange={onChange} />
      </FilterRail>,
    );
    expect(within(container).getByText('Position')).toBeInTheDocument();
    const select = within(container).getByRole('combobox');
    fireEvent.change(select, { target: { value: 'BTN' } });
    expect(onChange).toHaveBeenCalledWith('BTN');
  });

  it('marks the active button segment and fires onChange', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FilterRail>
        <FilterButtons label="View" value="all" options={options} onChange={onChange} />
      </FilterRail>,
    );
    const all = within(container).getByRole('tab', { name: 'All' });
    expect(all).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(container).getByRole('tab', { name: 'BTN' }));
    expect(onChange).toHaveBeenCalledWith('BTN');
  });
});
