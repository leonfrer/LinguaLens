import { DEFAULT_SETTINGS, getSettings, isAppearance, SETTINGS_KEY } from './storage';
import type { Appearance } from './types';

export type ResolvedAppearance = Exclude<Appearance, 'system'>;

export function resolveAppearance(
  appearance: Appearance,
  prefersDark: boolean
): ResolvedAppearance {
  return appearance === 'system' ? (prefersDark ? 'dark' : 'light') : appearance;
}

export function getStoredAppearance(value: unknown): Appearance {
  return isAppearance(value) ? value : DEFAULT_SETTINGS.appearance;
}

export function applyAppearance(
  appearance: Appearance,
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
): ResolvedAppearance {
  const resolvedAppearance = resolveAppearance(appearance, mediaQuery.matches);
  document.documentElement.dataset.theme = resolvedAppearance;
  document.documentElement.style.colorScheme = resolvedAppearance;
  document.documentElement.dataset.themeReady = 'true';
  return resolvedAppearance;
}

export async function initializeTheme(): Promise<Appearance> {
  let appearance = DEFAULT_SETTINGS.appearance;

  try {
    appearance = (await getSettings()).appearance;
  } finally {
    applyAppearance(appearance);
  }

  return appearance;
}

export function subscribeToAppearance(
  onChange: (appearance: Appearance) => void
): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  let currentAppearance = DEFAULT_SETTINGS.appearance;
  let isSubscribed = true;

  const setAppearance = (appearance: Appearance) => {
    currentAppearance = appearance;
    applyAppearance(appearance, mediaQuery);
    onChange(appearance);
  };
  const handleMediaChange = () => {
    if (currentAppearance === 'system') {
      applyAppearance(currentAppearance, mediaQuery);
    }
  };
  const handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) {
      return;
    }

    const nextSettings = changes[SETTINGS_KEY].newValue as { appearance?: unknown } | undefined;
    setAppearance(getStoredAppearance(nextSettings?.appearance));
  };

  void getSettings()
    .then((settings) => {
      if (isSubscribed) {
        setAppearance(settings.appearance);
      }
    })
    .catch(() => undefined);
  mediaQuery.addEventListener('change', handleMediaChange);
  chrome.storage.onChanged.addListener(handleStorageChange);

  return () => {
    isSubscribed = false;
    mediaQuery.removeEventListener('change', handleMediaChange);
    chrome.storage.onChanged.removeListener(handleStorageChange);
  };
}
