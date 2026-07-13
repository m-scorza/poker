import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// jsdom runs with an opaque origin here, so `localStorage` is undefined. The
// Zustand `persist` middleware behind useAppStore calls storage.setItem on every
// setState, so provide an in-memory shim before the store module initializes.
vi.hoisted(() => {
  const backing = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return backing.size;
    },
    getItem: (key) => (backing.has(key) ? backing.get(key)! : null),
    setItem: (key, value) => {
      backing.set(key, String(value));
    },
    removeItem: (key) => {
      backing.delete(key);
    },
    clear: () => {
      backing.clear();
    },
    key: (index) => Array.from(backing.keys())[index] ?? null,
  };
  globalThis.localStorage = memoryStorage;
});

// The Dexie settings table is the hero-name persistence sink and isn't backed by
// a real IndexedDB in this jsdom project — mock it so the save path is a spy.
const storeMocks = vi.hoisted(() => ({ saveHeroName: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../data/store', () => storeMocks);

import { useAppStore } from '../../../data/appStore';
import { SettingsCard } from '../SettingsCard';

const INITIAL_STATE = useAppStore.getState();

beforeEach(() => {
  act(() => {
    useAppStore.setState(INITIAL_STATE, true);
    useAppStore.getState().setHeroName('Maverick');
  });
  storeMocks.saveHeroName.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('SettingsCard', () => {
  it('renders the current hero name and selected strategy profile', () => {
    act(() => useAppStore.getState().setStrategyProfile('advanced'));
    render(<SettingsCard />);
    expect(screen.getByLabelText('Hero name')).toHaveValue('Maverick');
    expect(screen.getByRole('radio', { name: /Advanced Theory/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Baseline \(Game Plan\)/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('trims surrounding whitespace when saving the hero name', async () => {
    render(<SettingsCard />);
    fireEvent.change(screen.getByLabelText('Hero name'), { target: { value: '  newhero  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(storeMocks.saveHeroName).toHaveBeenCalledWith('newhero'));
    expect(useAppStore.getState().heroName).toBe('newhero');
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('rejects an empty-after-trim name and keeps the previous value', () => {
    render(<SettingsCard />);
    fireEvent.change(screen.getByLabelText('Hero name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Hero name cannot be blank.')).toBeInTheDocument();
    expect(storeMocks.saveHeroName).not.toHaveBeenCalled();
    expect(useAppStore.getState().heroName).toBe('Maverick');
  });

  it('switches the strategy profile and persists it to the settings store', () => {
    render(<SettingsCard />);
    fireEvent.click(screen.getByRole('radio', { name: /Advanced Theory/ }));

    expect(useAppStore.getState().strategyProfile).toBe('advanced');
    // Persisted through the Zustand persist middleware's localStorage backing.
    expect(localStorage.getItem('poker-app-settings')).toContain('advanced');
  });
});
