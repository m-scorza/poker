import { describe, it, expect } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import { InfoTooltip } from '../InfoTooltip';
import '@testing-library/jest-dom';

describe('InfoTooltip', () => {
  it('renders trigger button', () => {
    const { container } = render(<InfoTooltip text="Some info" />);
    expect(within(container).getByRole('button')).toBeInTheDocument();
  });

  it('shows tooltip content on hover', () => {
    const { container } = render(<InfoTooltip text="Hidden Information" />);
    const trigger = within(container).getByRole('button');

    fireEvent.mouseEnter(trigger);
    expect(within(container).getByText('Hidden Information')).toBeInTheDocument();
  });
});
