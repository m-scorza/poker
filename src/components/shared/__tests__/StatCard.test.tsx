import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { StatCard } from '../StatCard';
import '@testing-library/jest-dom';

describe('StatCard', () => {
  it('renders label and value correctly', () => {
    const { container } = render(<StatCard label="VPIP" value="25%" />);
    expect(within(container).getByText('VPIP')).toBeInTheDocument();
    expect(within(container).getByText('25%')).toBeInTheDocument();
  });

  it('renders subtext when provided', () => {
    const { container } = render(<StatCard label="VPIP" value="25%" subtext="+2% vs avg" />);
    expect(within(container).getByText('+2% vs avg')).toBeInTheDocument();
  });

  it('applies the correct accent color class', () => {
    const { container } = render(<StatCard label="VPIP" value="25%" accent="green" />);
    const valueElement = within(container).getByText('25%');
    expect(valueElement).toHaveClass('text-[var(--color-accent)]');
  });

  it('renders info tooltip trigger when info is provided', () => {
    const info = { text: 'Voluntarily Put In Pot' };
    const { container } = render(<StatCard label="VPIP" value="25%" info={info} />);
    expect(within(container).getByRole('button')).toBeInTheDocument();
  });
});
