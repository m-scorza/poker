import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom';
import { CommandPalette } from '../CommandPalette';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderPalette() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <CommandPalette />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function openPalette() {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
}

describe('CommandPalette', () => {
  it('opens on Ctrl+K, closes on Escape', async () => {
    renderPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    openPalette();
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText('Search pages'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('filters, keyboard-navigates, and jumps on Enter', async () => {
    renderPalette();
    openPalette();

    const input = screen.getByLabelText('Search pages');
    fireEvent.change(input, { target: { value: 'da' } });
    // "Dashboard" (startsWith) ranks above "Data Vault" ranks above nothing else matching.
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Dashboard');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('location')).toHaveTextContent('/data');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('reaches palette-only destinations like Demo Mode', () => {
    renderPalette();
    openPalette();

    const input = screen.getByLabelText('Search pages');
    fireEvent.change(input, { target: { value: 'demo' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('location')).toHaveTextContent('/demo');
  });

  it('says so when nothing matches', () => {
    renderPalette();
    openPalette();

    fireEvent.change(screen.getByLabelText('Search pages'), { target: { value: 'zzz' } });
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
  });
});
