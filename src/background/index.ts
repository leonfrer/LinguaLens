import { t } from '../shared/i18n';
import { applyInterfaceLanguage, initializeInterfaceLanguage } from '../shared/localization';
import { getSettings, saveItem, SETTINGS_KEY } from '../shared/storage';
import { translateWithConfiguredProvider } from '../shared/translation';
import type {
  LinguaLensMessage,
  SaveItemResponse,
  Settings,
  TranslateResponse
} from '../shared/types';
import { updateActionIcon } from './action-icon';

async function syncActionIcon(): Promise<void> {
  const { wordLookupEnabled } = await getSettings();
  await updateActionIcon(wordLookupEnabled);
}

function handleSettingsChange(
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
): void {
  if (areaName !== 'local' || !(SETTINGS_KEY in changes)) {
    return;
  }

  const nextSettings = changes[SETTINGS_KEY]?.newValue as Partial<Settings> | undefined;

  if (nextSettings?.interfaceLanguage) {
    applyInterfaceLanguage(nextSettings.interfaceLanguage);
  }

  if (typeof nextSettings?.wordLookupEnabled === 'boolean') {
    void updateActionIcon(nextSettings.wordLookupEnabled).catch(() => undefined);
    return;
  }

  void syncActionIcon().catch(() => undefined);
}

chrome.storage.onChanged.addListener(handleSettingsChange);
void initializeInterfaceLanguage().catch(() => undefined);
void syncActionIcon().catch(() => undefined);

function isLinguaLensMessage(message: unknown): message is LinguaLensMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  return (
    'type' in message &&
    (message.type === 'LINGUALENS_TRANSLATE' || message.type === 'LINGUALENS_SAVE_ITEM')
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isLinguaLensMessage(message)) {
    return false;
  }

  if (message.type === 'LINGUALENS_TRANSLATE') {
    void getSettings()
      .then((settings) => {
        applyInterfaceLanguage(settings.interfaceLanguage);
        return translateWithConfiguredProvider({
          text: message.text,
          sentenceContext: message.sentenceContext,
          settings: {
            ...settings,
            explanationLanguage: message.explanationLanguage
          }
        });
      })
      .then((response) => {
        sendResponse(response);
      })
      .catch(() => {
        const response: TranslateResponse = {
          ok: false,
          error: t('panelTranslationFailed')
        };
        sendResponse(response);
      });
    return true;
  }

  void saveItem({
    text: message.text,
    translation: message.translation,
    pronunciation: message.pronunciation,
    pronunciationNotation: message.pronunciationNotation,
    explanationLanguage: message.explanationLanguage,
    sentenceContext: message.sentenceContext,
    explanation: message.explanation,
    provider: message.provider,
    model: message.model,
    sourceUrl: message.sourceUrl,
    sourceTitle: message.sourceTitle
  })
    .then((item) => {
      const response: SaveItemResponse = { ok: true, item };
      sendResponse(response);
    })
    .catch((error: unknown) => {
      const response: SaveItemResponse = {
        ok: false,
        error: error instanceof Error ? error.message : t('panelTranslationFailed')
      };
      sendResponse(response);
    });

  return true;
});
