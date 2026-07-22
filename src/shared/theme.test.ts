import { describe, expect, it, vi } from 'vitest';
import { SETTINGS_KEY } from './storage';
import {
  applyAppearance,
  getStoredAppearance,
  resolveAppearance,
  subscribeToAppearance
} from './theme';

describe('theme appearance', () => {
  it('resolves system appearance while keeping explicit choices fixed', () => {
    expect(resolveAppearance('system', false)).toBe('light');
    expect(resolveAppearance('system', true)).toBe('dark');
    expect(resolveAppearance('light', true)).toBe('light');
    expect(resolveAppearance('dark', false)).toBe('dark');
  });

  it('defaults unsupported stored values to system', () => {
    expect(getStoredAppearance('light')).toBe('light');
    expect(getStoredAppearance('sepia')).toBe('system');
    expect(getStoredAppearance(undefined)).toBe('system');
  });

  it('applies the resolved appearance to the document root', () => {
    const documentElement: {
      dataset: Record<string, string>;
      style: Record<string, string>;
    } = { dataset: {}, style: {} };
    vi.stubGlobal('document', { documentElement });

    expect(applyAppearance('system', { matches: true } as MediaQueryList)).toBe('dark');
    expect(documentElement).toEqual({
      dataset: { theme: 'dark', themeReady: 'true' },
      style: { colorScheme: 'dark' }
    });
  });

  it('syncs storage changes and only follows system changes in system mode', async () => {
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    const documentElement: {
      dataset: Record<string, string>;
      style: Record<string, string>;
    } = { dataset: {}, style: {} };
    let storageListener:
      | ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void)
      | undefined;
    let mediaListener: (() => void) | undefined;
    mediaQuery.addEventListener.mockImplementation((_event, listener) => {
      mediaListener = listener as () => void;
    });
    const removeStorageListener = vi.fn();

    vi.stubGlobal('window', { matchMedia: () => mediaQuery });
    vi.stubGlobal('document', { documentElement });
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ [SETTINGS_KEY]: { appearance: 'light' } })
        },
        onChanged: {
          addListener: vi.fn().mockImplementation((listener) => {
            storageListener = listener;
          }),
          removeListener: removeStorageListener
        }
      }
    });
    const onChange = vi.fn();
    const unsubscribe = subscribeToAppearance(onChange);
    await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith('light'));

    mediaQuery.matches = true;
    mediaListener?.();
    expect(documentElement.dataset.theme).toBe('light');

    storageListener?.(
      { [SETTINGS_KEY]: { newValue: { appearance: 'system' } } },
      'local'
    );
    expect(documentElement.dataset.theme).toBe('dark');

    mediaQuery.matches = false;
    mediaListener?.();
    expect(documentElement.dataset.theme).toBe('light');

    unsubscribe();
    expect(mediaQuery.removeEventListener).toHaveBeenCalled();
    expect(removeStorageListener).toHaveBeenCalled();
  });
});
