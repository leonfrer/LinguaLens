import { getInterfaceLocale, setInterfaceLanguage } from './i18n';
import {
  DEFAULT_SETTINGS,
  getSettings,
  isInterfaceLanguage,
  SETTINGS_KEY
} from './storage';
import type { InterfaceLanguage } from './types';

export function getStoredInterfaceLanguage(value: unknown): InterfaceLanguage {
  return isInterfaceLanguage(value) ? value : DEFAULT_SETTINGS.interfaceLanguage;
}

export function applyInterfaceLanguage(interfaceLanguage: InterfaceLanguage): InterfaceLanguage {
  setInterfaceLanguage(interfaceLanguage);

  if (typeof document !== 'undefined') {
    document.documentElement.lang = getInterfaceLocale();
  }

  return interfaceLanguage;
}

export async function initializeInterfaceLanguage(): Promise<InterfaceLanguage> {
  let interfaceLanguage = DEFAULT_SETTINGS.interfaceLanguage;

  try {
    interfaceLanguage = (await getSettings()).interfaceLanguage;
  } finally {
    applyInterfaceLanguage(interfaceLanguage);
  }

  return interfaceLanguage;
}

export function subscribeToInterfaceLanguage(
  onChange: (interfaceLanguage: InterfaceLanguage) => void
): () => void {
  const handleStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) {
      return;
    }

    const nextSettings = changes[SETTINGS_KEY].newValue as
      | { interfaceLanguage?: unknown }
      | undefined;
    const interfaceLanguage = getStoredInterfaceLanguage(nextSettings?.interfaceLanguage);
    applyInterfaceLanguage(interfaceLanguage);
    onChange(interfaceLanguage);
  };

  chrome.storage.onChanged.addListener(handleStorageChange);

  return () => {
    chrome.storage.onChanged.removeListener(handleStorageChange);
  };
}
