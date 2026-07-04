import { saveItem } from '../shared/storage';
import { createMockTranslation } from '../shared/translation';
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
    const response: TranslateResponse = {
      ok: true,
      translation: createMockTranslation(message.text, message.targetLanguage),
      provider: 'mock'
    };
    sendResponse(response);
    return false;
  }

  void saveItem({
    text: message.text,
    translation: message.translation,
    targetLanguage: message.targetLanguage,
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
