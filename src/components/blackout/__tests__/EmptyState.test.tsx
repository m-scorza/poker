import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the folio number and message', () => {
    const { container } = render(
      <EmptyState folio="00" message="No hands filed yet." />,
    );
    expect(within(container).getByText('00')).toBeInTheDocument();
    expect(within(container).getByText('No hands filed yet.')).toBeInTheDocument();
  });

  it('renders a button CTA and fires onClick', () => {
    const onClick = vi.fn();
    const { container } = render(
      <EmptyState folio="00" message="Nothing filed." cta={{ label: 'Import', onClick }} />,
    );
    fireEvent.click(within(container).getByRole('button', { name: /Import/ }));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders a link CTA when href is provided', () => {
    const { container } = render(
      <EmptyState folio="00" message="Nothing filed." cta={{ label: 'Go', href: '/hands' }} />,
    );
    expect(within(container).getByRole('link', { name: /Go/ })).toHaveAttribute('href', '/hands');
  });
});
