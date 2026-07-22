import { t } from '../shared/i18n';
import { applyInterfaceLanguage } from '../shared/localization';
import {
  getContentSettings,
  getSettings,
  initializeStorage,
  publishContentSettings,
  saveItem,
  SETTINGS_KEY
} from '../shared/storage';
import { translateWithConfiguredProvider } from '../shared/translation';
import type {
  ContentSettingsResponse,
  LinguaLensMessage,
  SaveItemResponse,
  TranslateResponse
} from '../shared/types';
import { updateActionIcon } from './action-icon';

const storageReady = initializeStorage();

function handleSettingsChange(
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
): void {
  if (areaName !== 'local' || !(SETTINGS_KEY in changes)) {
    return;
  }

  void storageReady
    .then(getSettings)
    .then(async (settings) => {
      applyInterfaceLanguage(settings.interfaceLanguage);
      await Promise.all([
        updateActionIcon(settings.wordLookupEnabled),
        publishContentSettings(settings)
      ]);
    })
    .catch(() => undefined);
}

chrome.storage.onChanged.addListener(handleSettingsChange);
void storageReady
  .then(async (settings) => {
    applyInterfaceLanguage(settings.interfaceLanguage);
    await updateActionIcon(settings.wordLookupEnabled);
  })
  .catch(() => undefined);

function isLinguaLensMessage(message: unknown): message is LinguaLensMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  return (
    'type' in message &&
    (message.type === 'LINGUALENS_TRANSLATE' ||
      message.type === 'LINGUALENS_SAVE_ITEM' ||
      message.type === 'LINGUALENS_GET_CONTENT_SETTINGS')
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isLinguaLensMessage(message)) {
    return false;
  }

  if (message.type === 'LINGUALENS_GET_CONTENT_SETTINGS') {
    void storageReady
      .then(getSettings)
      .then((settings) => {
        const response: ContentSettingsResponse = {
          ok: true,
          settings: getContentSettings(settings)
        };
        sendResponse(response);
      })
      .catch((error: unknown) => {
        const response: ContentSettingsResponse = {
          ok: false,
          error: error instanceof Error ? error.message : t('runtimeMessageFailed')
        };
        sendResponse(response);
      });
    return true;
  }

  if (message.type === 'LINGUALENS_TRANSLATE') {
    void storageReady
      .then(getSettings)
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

  void storageReady
    .then(() =>
      saveItem({
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
    )
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
