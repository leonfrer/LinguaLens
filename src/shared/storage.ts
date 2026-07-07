import type { LlmProvider, SavedItem, SaveItemMessage, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  explanationLanguage: 'zh-CN',
  llmProvider: 'nvidia',
  llmModel: 'meta/llama-3.1-8b-instruct',
  apiKey: ''
};

const NVIDIA_DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';
const LEGACY_NVIDIA_MODEL = 'nvidia/llama-3.1-nemotron-nano-8b-v1';
const SUPPORTED_LLM_PROVIDER: LlmProvider = 'nvidia';

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
    | (Partial<Omit<Settings, 'llmProvider'>> & {
        llmProvider?: string;
        targetLanguage?: Settings['explanationLanguage'];
      })
    | undefined;
  const { targetLanguage, ...currentSettings } = storedSettings ?? {};
  const removedProviderModel =
    currentSettings.llmProvider && currentSettings.llmProvider !== SUPPORTED_LLM_PROVIDER
      ? DEFAULT_SETTINGS.llmModel
      : currentSettings.llmModel;

  const nextSettings = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    llmProvider: SUPPORTED_LLM_PROVIDER,
    llmModel: removedProviderModel ?? DEFAULT_SETTINGS.llmModel,
    explanationLanguage:
      currentSettings.explanationLanguage ?? targetLanguage ?? DEFAULT_SETTINGS.explanationLanguage
  };

  if (nextSettings.llmProvider === 'nvidia' && nextSettings.llmModel === LEGACY_NVIDIA_MODEL) {
    return {
      ...nextSettings,
      llmModel: NVIDIA_DEFAULT_MODEL
    };
  }

  return nextSettings;
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const nextSettings = {
    ...(await getSettings()),
    ...settings
  };

  await chrome.storage.local.set({ [SETTINGS_KEY]: nextSettings });
  return nextSettings;
}

export async function getSavedItems(): Promise<SavedItem[]> {
  const result = await chrome.storage.local.get(SAVED_ITEMS_KEY);
  const savedItems = result[SAVED_ITEMS_KEY];
  return Array.isArray(savedItems) ? (savedItems as SavedItem[]) : [];
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
