import { afterEach, describe, expect, it, vi } from 'vitest';
import { CREDENTIALS_KEY, DEFAULT_SETTINGS, SETTINGS_KEY } from '../shared/storage';
import { toggleWordLookupEnabled } from './toggle-word-lookup';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubSettingsStorage(wordLookupEnabled: boolean) {
  const { apiKey, ...storedSettings } = {
    ...DEFAULT_SETTINGS,
    wordLookupEnabled
  };
  const get = vi.fn().mockResolvedValue({
    [SETTINGS_KEY]: storedSettings,
    [CREDENTIALS_KEY]: { apiKey }
  });
  const set = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', {
    storage: {
      local: { get, set }
    }
  });
  return { get, set };
}

describe('toggleWordLookupEnabled', () => {
  it('disables word lookup when it is currently enabled', async () => {
    const { set } = stubSettingsStorage(true);

    await expect(toggleWordLookupEnabled()).resolves.toBe(false);

    expect(set).toHaveBeenCalledTimes(1);
    const updates = set.mock.calls[0]?.[0] as Record<string, { wordLookupEnabled?: boolean }>;
    expect(updates[SETTINGS_KEY]).toMatchObject({ wordLookupEnabled: false });
    expect(updates).not.toHaveProperty(CREDENTIALS_KEY);
  });

  it('enables word lookup when it is currently disabled', async () => {
    const { set } = stubSettingsStorage(false);

    await expect(toggleWordLookupEnabled()).resolves.toBe(true);

    expect(set).toHaveBeenCalledTimes(1);
    const updates = set.mock.calls[0]?.[0] as Record<string, { wordLookupEnabled?: boolean }>;
    expect(updates[SETTINGS_KEY]).toMatchObject({ wordLookupEnabled: true });
    expect(updates).not.toHaveProperty(CREDENTIALS_KEY);
  });
});
