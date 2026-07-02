import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HandsFilters } from '../HandsFilters';

describe('HandsFilters', () => {
  it('uses neutral reference-verdict copy for the compliance filter', () => {
    const { container } = render(
      <HandsFilters
        searchKey=""
        setSearchKey={vi.fn()}
        posFilter=""
        setPosFilter={vi.fn()}
        scenarioFilter=""
        setScenarioFilter={vi.fn()}
        actionFilter=""
        setActionFilter={vi.fn()}
        complianceFilter=""
        setComplianceFilter={vi.fn()}
        stackFilter=""
        setStackFilter={vi.fn()}
        categoryFilter=""
        setCategoryFilter={vi.fn()}
      />,
    );

    expect(screen.getByText('Reference verdict')).toBeInTheDocument();
    expect(screen.getByText('Not graded')).toBeInTheDocument();
    expect(within(container).queryByText(/GTO/i)).not.toBeInTheDocument();
  });
});
