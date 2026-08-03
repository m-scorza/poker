import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAppStore } from '../data/appStore';
import { VillainsPage } from '../pages/VillainsPage';

/**
 * UIR-001 — the app must not claim there is no data while data is on its way.
 *
 * A demo seed writes ~15k hands and takes over a minute. During that window the
 * villain table is legitimately empty, and the page used to say "Import hands to
 * track villains" — directly contradicting the "Demo Loading" indicator shown at
 * the same time. Empty states must distinguish "nothing here" from "not yet".
 */
function renderVillains() {
  return render(
    <MemoryRouter>
      <VillainsPage />
    </MemoryRouter>,
  );
}

describe('empty states during an in-flight seed/import (UIR-001)', () => {
  beforeEach(() => {
    useAppStore.getState().setDemoSeedProgress(false, null);
    useAppStore.getState().setImporting(false);
  });

  it('asks the user to import when genuinely idle and empty', async () => {
    renderVillains();
    expect(await screen.findByText(/Import hands to track villains/i)).toBeTruthy();
  });

  it('reports loading — not "import hands" — while a demo seed runs', async () => {
    useAppStore.getState().setDemoSeedProgress(true, 'Writing hands locally...');
    renderVillains();
    expect(await screen.findByText(/Loading data/i)).toBeTruthy();
    expect(screen.queryByText(/Import hands to track villains/i)).toBeNull();
  });

  it('reports loading while a file import runs', async () => {
    useAppStore.getState().setImporting(true);
    renderVillains();
    expect(await screen.findByText(/Loading data/i)).toBeTruthy();
    expect(screen.queryByText(/Import hands to track villains/i)).toBeNull();
  });
});
