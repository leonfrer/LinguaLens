import {
  DEFAULT_LLM_ENDPOINT_CONFIG,
  DEFAULT_LLM_ENDPOINT_PRESET,
  OPENAI_COMPATIBLE_ENDPOINTS,
  isLlmProvider,
  isLlmEndpointPreset,
  normalizeBaseUrl
} from './providers';
import type {
  LlmEndpointPreset,
  LlmProvider,
  SavedItem,
  SaveItemMessage,
  Settings
} from './types';

export const DEFAULT_SETTINGS: Settings = {
  wordLookupEnabled: true,
  pronunciationLookupEnabled: false,
  explanationLanguage: 'zh-CN',
  llmProvider: 'openai-compatible',
  llmEndpointPreset: DEFAULT_LLM_ENDPOINT_PRESET,
  baseUrl: DEFAULT_LLM_ENDPOINT_CONFIG.baseUrl,
  llmModel: DEFAULT_LLM_ENDPOINT_CONFIG.defaultModel,
  apiKey: ''
};

export const SAVED_ITEMS_KEY = 'lingualens.savedItems';
export const SETTINGS_KEY = 'lingualens.settings';

export function createSavedItem(
  payload: Omit<SaveItemMessage, 'type'>,
  now = Date.now()
): SavedItem {
  return {
    id: `${now}-${crypto.randomUUID()}`,
    text: payload.text,
    translation: payload.translation,
    pronunciation: payload.pronunciation,
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
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const storedSettings = result[SETTINGS_KEY] as
    | (Partial<Omit<Settings, 'llmProvider' | 'baseUrl'>> & {
        llmProvider?: string;
        llmEndpointPreset?: string;
        baseUrl?: string;
        ipaLookupEnabled?: boolean;
        targetLanguage?: Settings['explanationLanguage'];
      })
    | undefined;
  const { ipaLookupEnabled, targetLanguage, ...currentSettings } = storedSettings ?? {};
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
    explanationLanguage:
      currentSettings.explanationLanguage ?? targetLanguage ?? DEFAULT_SETTINGS.explanationLanguage
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
    baseUrl:
      llmEndpointPreset === 'custom'
        ? normalizeBaseUrl(settings.baseUrl ?? currentSettings.baseUrl)
        : endpointConfig.baseUrl
  };

  await chrome.storage.local.set({ [SETTINGS_KEY]: nextSettings });
  return nextSettings;
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
