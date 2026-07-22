import type { BrowserContext, Page } from '@playwright/test';

export const savedItemsStorageKey = 'lingualens.savedItems';
export const settingsStorageKey = 'lingualens.settings';
export const credentialsStorageKey = 'lingualens.credentials';
export const testArticleUrl = 'https://lingualens.test/article';

export async function routeTestArticle(
  context: BrowserContext,
  {
    url = testArticleUrl,
    title = 'LinguaLens Test Article',
    body = 'LinguaLens helps with foreign-language reading by translating selected text.'
  }: {
    url?: string;
    title?: string;
    body?: string;
  } = {}
): Promise<void> {
  await context.route(url, async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: `
        <!doctype html>
        <html lang="en">
          <head>
            <title>${title}</title>
            <style>
              body { font-family: sans-serif; margin: 32px; min-height: 200vh; }
              main { max-width: 680px; }
            </style>
          </head>
          <body>
            <main>
              <p id="article">${body}</p>
            </main>
          </body>
        </html>
      `
    });
  });
}

export async function selectArticleText(
  page: Page,
  selectedText: string,
  dispatchEvent: 'mouseup' | 'keyup' = 'mouseup'
): Promise<void> {
  await page.evaluate(
    ({ selectedText, dispatchEvent }) => {
      const paragraph = document.querySelector('#article');
      const textNode = paragraph?.firstChild;
      const selectedTextStart = textNode?.textContent?.indexOf(selectedText) ?? -1;

      if (!textNode || selectedTextStart < 0) {
        throw new Error('Unable to find test selection text');
      }

      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(textNode, selectedTextStart);
      range.setEnd(textNode, selectedTextStart + selectedText.length);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      document.dispatchEvent(
        dispatchEvent === 'mouseup'
          ? new MouseEvent('mouseup', { bubbles: true })
          : new KeyboardEvent('keyup', { bubbles: true })
      );
    },
    { selectedText, dispatchEvent }
  );
}

export async function seedExtensionSettings(
  popupPage: Page,
  settings: {
    appearance?: 'light' | 'dark' | 'system';
    interfaceLanguage?: 'system' | 'en' | 'zh-CN' | 'zh-TW';
    apiKey?: string;
    explanationLanguage?: string;
    pronunciationLookupEnabled?: boolean;
    skipLongTextPronunciation?: boolean;
    pronunciationPreferences?: Array<{
      id: string;
      languageLabel: string;
      notationLabel: string;
      enabled: boolean;
    }>;
    model?: string;
    endpointPreset?: string;
  }
): Promise<void> {
  await popupPage.evaluate(
    async ([settingsKey, credentialsKey, nextSettings]) => {
      await chrome.storage.local.set({
        [settingsKey]: {
          appearance: nextSettings.appearance ?? 'system',
          interfaceLanguage: nextSettings.interfaceLanguage ?? 'system',
          explanationLanguage: nextSettings.explanationLanguage ?? 'zh-CN',
          pronunciationLookupEnabled: nextSettings.pronunciationLookupEnabled ?? false,
          skipLongTextPronunciation: nextSettings.skipLongTextPronunciation ?? true,
          pronunciationPreferences: nextSettings.pronunciationPreferences ?? [
            {
              id: 'english',
              languageLabel: 'English',
              notationLabel: 'IPA',
              enabled: true
            },
            {
              id: 'japanese',
              languageLabel: 'Japanese',
              notationLabel: 'Kana',
              enabled: true
            },
            {
              id: 'chinese',
              languageLabel: 'Chinese',
              notationLabel: 'Hanyu Pinyin',
              enabled: true
            },
            {
              id: 'korean',
              languageLabel: 'Korean',
              notationLabel: 'Hangul',
              enabled: true
            }
          ],
          llmProvider: 'openai-compatible',
          llmEndpointPreset: nextSettings.endpointPreset ?? 'nvidia',
          llmModel: nextSettings.model ?? 'meta/llama-3.1-8b-instruct'
        },
        [credentialsKey]: { apiKey: nextSettings.apiKey ?? '' }
      });
    },
    [settingsStorageKey, credentialsStorageKey, settings]
  );
}
