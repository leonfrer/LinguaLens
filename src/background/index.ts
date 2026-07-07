import { getSettings, saveItem } from '../shared/storage';
import { translateWithConfiguredProvider } from '../shared/translation';
import type { LinguaLensMessage, SaveItemResponse, TranslateResponse } from '../shared/types';

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
      .then((settings) =>
        translateWithConfiguredProvider({
          text: message.text,
          sentenceContext: message.sentenceContext,
          settings: {
            ...settings,
            explanationLanguage: message.explanationLanguage
          }
        })
      )
      .then((response) => {
        sendResponse(response);
      })
      .catch(() => {
        const response: TranslateResponse = {
          ok: false,
          error: 'Unable to translate selected text.'
        };
        sendResponse(response);
      });
    return true;
  }

  void saveItem({
    text: message.text,
    translation: message.translation,
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
        error: error instanceof Error ? error.message : 'Unable to save item'
      };
      sendResponse(response);
    });

  return true;
});
