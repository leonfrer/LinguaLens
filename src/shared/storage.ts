import {
  DEFAULT_LLM_ENDPOINT_CONFIG,
  DEFAULT_LLM_ENDPOINT_PRESET,
  OPENAI_COMPATIBLE_ENDPOINTS,
  isLlmProvider,
  isLlmEndpointPreset,
  normalizeBaseUrl
} from './providers';
import {
  DEFAULT_PRONUNCIATION_PREFERENCES,
  normalizePronunciationPreferences
} from './pronunciation';
import type {
  LlmEndpointPreset,
  LlmProvider,
  Appearance,
  ContentSettings,
  Credentials,
  InterfaceLanguage,
  SavedItem,
  SaveItemMessage,
  Settings
} from './types';

export const DEFAULT_SETTINGS: Settings = {
  appearance: 'system',
  interfaceLanguage: 'system',
  wordLookupEnabled: true,
  pronunciationLookupEnabled: false,
  skipLongTextPronunciation: true,
  pronunciationPreferences: DEFAULT_PRONUNCIATION_PREFERENCES,
  explanationLanguage: 'zh-CN',
  llmProvider: 'openai-compatible',
  llmEndpointPreset: DEFAULT_LLM_ENDPOINT_PRESET,
  baseUrl: DEFAULT_LLM_ENDPOINT_CONFIG.baseUrl,
  llmModel: DEFAULT_LLM_ENDPOINT_CONFIG.defaultModel,
  apiKey: ''
};

export const SAVED_ITEMS_KEY = 'lingualens.savedItems';
export const SETTINGS_KEY = 'lingualens.settings';
export const CREDENTIALS_KEY = 'lingualens.credentials';
export const CONTENT_SETTINGS_KEY = 'lingualens.contentSettings';

type StoredSettings = Omit<Settings, 'apiKey'>;

export function isAppearance(value: unknown): value is Appearance {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return value === 'system' || value === 'en' || value === 'zh-CN' || value === 'zh-TW';
}

export function createSavedItem(
  payload: Omit<SaveItemMessage, 'type'>,
  now = Date.now()
): SavedItem {
  return {
    id: `${now}-${crypto.randomUUID()}`,
    text: payload.text,
    translation: payload.translation,
    pronunciation: payload.pronunciation,
    pronunciationNotation: payload.pronunciationNotation,
    explanationLanguage: payload.explanationLanguage,
    sentenceContext: payload.sentenceContext,
    explanation: payload.explanation,
    provider: payload.provider,
    model: payload.model,
    sourceUrl: payload.sourceUrl,
    sourceTitle: payload.sourceTitle,
    createdAt: now
  };
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get([SETTINGS_KEY, CREDENTIALS_KEY]);
  const storedSettings = result[SETTINGS_KEY] as
    | (Partial<Omit<StoredSettings, 'llmProvider' | 'baseUrl'>> & {
        llmProvider?: string;
        llmEndpointPreset?: string;
        baseUrl?: string;
        apiKey?: unknown;
        ipaLookupEnabled?: boolean;
        skipSentencePronunciation?: boolean;
        targetLanguage?: Settings['explanationLanguage'];
      })
    | undefined;
  const storedCredentials = result[CREDENTIALS_KEY] as Partial<Credentials> | undefined;
  const {
    apiKey: _ignoredLegacyApiKey,
    ipaLookupEnabled,
    skipSentencePronunciation,
    targetLanguage,
    ...currentSettings
  } = storedSettings ?? {};
  const hasSupportedProvider = isLlmProvider(currentSettings.llmProvider);
  const llmProvider: LlmProvider = hasSupportedProvider
    ? (currentSettings.llmProvider as LlmProvider)
    : DEFAULT_SETTINGS.llmProvider;
  const migratedEndpointPreset = isLlmEndpointPreset(currentSettings.llmProvider)
    ? currentSettings.llmProvider
    : undefined;
  const hasSupportedEndpointPreset =
    isLlmEndpointPreset(currentSettings.llmEndpointPreset) || Boolean(migratedEndpointPreset);
  const llmEndpointPreset: LlmEndpointPreset = isLlmEndpointPreset(
    currentSettings.llmEndpointPreset
  )
    ? currentSettings.llmEndpointPreset
    : (migratedEndpointPreset ?? DEFAULT_LLM_ENDPOINT_PRESET);
  const endpointConfig = OPENAI_COMPATIBLE_ENDPOINTS[llmEndpointPreset];
  const baseUrl =
    llmEndpointPreset === 'custom' && currentSettings.baseUrl
      ? normalizeBaseUrl(currentSettings.baseUrl)
      : endpointConfig.baseUrl;

  const nextSettings: Settings = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    appearance: isAppearance(currentSettings.appearance)
      ? currentSettings.appearance
      : DEFAULT_SETTINGS.appearance,
    interfaceLanguage: isInterfaceLanguage(currentSettings.interfaceLanguage)
      ? currentSettings.interfaceLanguage
      : DEFAULT_SETTINGS.interfaceLanguage,
    llmProvider,
    llmEndpointPreset,
    baseUrl,
    llmModel: hasSupportedEndpointPreset
      ? (currentSettings.llmModel ?? endpointConfig.defaultModel)
      : endpointConfig.defaultModel,
    pronunciationLookupEnabled:
      currentSettings.pronunciationLookupEnabled ??
      ipaLookupEnabled ??
      DEFAULT_SETTINGS.pronunciationLookupEnabled,
    skipLongTextPronunciation:
      currentSettings.skipLongTextPronunciation ??
      skipSentencePronunciation ??
      DEFAULT_SETTINGS.skipLongTextPronunciation,
    pronunciationPreferences: normalizePronunciationPreferences(
      currentSettings.pronunciationPreferences
    ),
    explanationLanguage:
      currentSettings.explanationLanguage ?? targetLanguage ?? DEFAULT_SETTINGS.explanationLanguage,
    apiKey:
      typeof storedCredentials?.apiKey === 'string'
        ? storedCredentials.apiKey
        : DEFAULT_SETTINGS.apiKey
  };

  if (endpointConfig.legacyModels?.includes(nextSettings.llmModel)) {
    return {
      ...nextSettings,
      llmModel: endpointConfig.defaultModel
    };
  }

  return nextSettings;
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const currentSettings = await getSettings();
  const llmEndpointPreset = settings.llmEndpointPreset ?? currentSettings.llmEndpointPreset;
  const endpointConfig = OPENAI_COMPATIBLE_ENDPOINTS[llmEndpointPreset];
  const nextSettings = {
    ...currentSettings,
    ...settings,
    pronunciationPreferences: normalizePronunciationPreferences(
      settings.pronunciationPreferences ?? currentSettings.pronunciationPreferences
    ),
    baseUrl:
      llmEndpointPreset === 'custom'
        ? normalizeBaseUrl(settings.baseUrl ?? currentSettings.baseUrl)
        : endpointConfig.baseUrl
  };

  const { apiKey, ...storedSettings } = nextSettings;
  const updates: Record<string, StoredSettings | Credentials> = {
    [SETTINGS_KEY]: storedSettings
  };

  if (typeof settings.apiKey === 'string') {
    updates[CREDENTIALS_KEY] = { apiKey };
  }

  await chrome.storage.local.set(updates);
  return nextSettings;
}

export function getContentSettings(settings: Settings): ContentSettings {
  return {
    appearance: settings.appearance,
    interfaceLanguage: settings.interfaceLanguage,
    wordLookupEnabled: settings.wordLookupEnabled,
    explanationLanguage: settings.explanationLanguage
  };
}

export const DEFAULT_CONTENT_SETTINGS = getContentSettings(DEFAULT_SETTINGS);

export async function publishContentSettings(settings: Settings): Promise<ContentSettings> {
  const contentSettings = getContentSettings(settings);
  await chrome.storage.session.set({ [CONTENT_SETTINGS_KEY]: contentSettings });
  return contentSettings;
}

export async function initializeStorage(): Promise<Settings> {
  await Promise.all([
    chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
    chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
  ]);
  const settings = await getSettings();
  await publishContentSettings(settings);
  return settings;
}

export async function getSavedItems(): Promise<SavedItem[]> {
  const result = await chrome.storage.local.get(SAVED_ITEMS_KEY);
  const savedItems = result[SAVED_ITEMS_KEY];
  if (!Array.isArray(savedItems)) {
    return [];
  }

  return savedItems.map((savedItem) => {
    const { ipa, ...item } = savedItem as SavedItem & { ipa?: string };
    return {
      ...item,
      pronunciation: item.pronunciation ?? ipa
    };
  });
}

export async function saveItem(payload: Omit<SaveItemMessage, 'type'>): Promise<SavedItem> {
  const item = createSavedItem(payload);
  const items = await getSavedItems();
  await chrome.storage.local.set({ [SAVED_ITEMS_KEY]: [item, ...items] });
  return item;
}

export async function deleteSavedItem(itemId: string): Promise<void> {
  const items = await getSavedItems();
  await chrome.storage.local.set({
    [SAVED_ITEMS_KEY]: items.filter((item) => item.id !== itemId)
  });
}
