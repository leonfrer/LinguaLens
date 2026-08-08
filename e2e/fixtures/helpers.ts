import type { BrowserContext, Page } from '@playwright/test';

export const savedItemsStorageKey = 'lingualens.savedItems';
export const savedItemsViewStorageKey = 'lingualens.savedItemsView';
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
    /** Plain text or HTML placed inside `#article`. */
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
              <div id="article">${body}</div>
            </main>
          </body>
        </html>
      `
    });
  });
}

export type SelectArticleTextOptions = {
  dispatchEvent?: 'mouseup' | 'keyup';
  /** 0-based match index when `selectedText` appears more than once. */
  occurrence?: number;
};

/**
 * Select text inside `#article`, including matches that live inside inline elements
 * or span multiple text nodes.
 */
export async function selectArticleText(
  page: Page,
  selectedText: string,
  dispatchEventOrOptions: 'mouseup' | 'keyup' | SelectArticleTextOptions = 'mouseup'
): Promise<void> {
  const options: SelectArticleTextOptions =
    typeof dispatchEventOrOptions === 'string'
      ? { dispatchEvent: dispatchEventOrOptions }
      : dispatchEventOrOptions;
  const dispatchEvent = options.dispatchEvent ?? 'mouseup';
  const occurrence = options.occurrence ?? 0;

  await page.evaluate(
    ({ selectedText, dispatchEvent, occurrence }) => {
      const root = document.querySelector('#article');
      if (!root) {
        throw new Error('Unable to find #article');
      }

      const textNodes: Array<{ node: Text; start: number; end: number }> = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let fullText = '';

      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const value = node.textContent ?? '';
        textNodes.push({ node, start: fullText.length, end: fullText.length + value.length });
        fullText += value;
      }

      let matchStart = -1;
      let searchFrom = 0;
      for (let index = 0; index <= occurrence; index += 1) {
        matchStart = fullText.indexOf(selectedText, searchFrom);
        if (matchStart === -1) {
          throw new Error(
            `Unable to find test selection text "${selectedText}" (occurrence ${occurrence})`
          );
        }
        searchFrom = matchStart + 1;
      }

      const matchEnd = matchStart + selectedText.length;

      const locateOffset = (offset: number): { node: Text; offset: number } => {
        for (const entry of textNodes) {
          if (offset <= entry.end) {
            return { node: entry.node, offset: offset - entry.start };
          }
        }

        const last = textNodes[textNodes.length - 1];
        if (!last) {
          throw new Error('Unable to locate text nodes in #article');
        }

        return { node: last.node, offset: last.node.textContent?.length ?? 0 };
      };

      const startPoint = locateOffset(matchStart);
      const endPoint = locateOffset(matchEnd);
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(startPoint.node, startPoint.offset);
      range.setEnd(endPoint.node, endPoint.offset);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      document.dispatchEvent(
        dispatchEvent === 'mouseup'
          ? new MouseEvent('mouseup', { bubbles: true })
          : new KeyboardEvent('keyup', { bubbles: true })
      );
    },
    { selectedText, dispatchEvent, occurrence }
  );
}

export async function seedExtensionSettings(
  popupPage: Page,
  settings: {
    appearance?: 'light' | 'dark' | 'system';
    interfaceLanguage?: 'system' | 'en' | 'zh-CN' | 'zh-TW';
    apiKey?: string;
    explanationLanguage?: string;
    wordLookupEnabled?: boolean;
    instantTranslateOnSelect?: boolean;
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
    /** Used when `endpointPreset` is `custom`. */
    baseUrl?: string;
  }
): Promise<void> {
  await popupPage.evaluate(
    async ([settingsKey, credentialsKey, nextSettings]) => {
      await chrome.storage.local.set({
        [settingsKey]: {
          appearance: nextSettings.appearance ?? 'system',
          interfaceLanguage: nextSettings.interfaceLanguage ?? 'system',
          explanationLanguage: nextSettings.explanationLanguage ?? 'zh-CN',
          wordLookupEnabled: nextSettings.wordLookupEnabled ?? true,
          instantTranslateOnSelect: nextSettings.instantTranslateOnSelect ?? true,
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
          baseUrl: nextSettings.baseUrl,
          llmModel: nextSettings.model ?? 'meta/llama-3.1-8b-instruct'
        },
        [credentialsKey]: { apiKey: nextSettings.apiKey ?? '' }
      });
    },
    [settingsStorageKey, credentialsStorageKey, settings]
  );
}

/** Mock a custom OpenAI-compatible chat completions endpoint and capture request bodies. */
export async function mockTranslationEndpoint(
  context: BrowserContext,
  {
    url = 'https://translation.example.test/v1/chat/completions',
    translation = '模拟翻译',
    explanation = '用于稳定 E2E 的模拟响应。',
    model = 'mock-translation-model'
  }: {
    url?: string;
    translation?: string;
    explanation?: string;
    model?: string;
  } = {}
): Promise<{ getRequestBodies: () => Array<Record<string, unknown>> }> {
  const requestBodies: Array<Record<string, unknown>> = [];

  await context.route(url, async (route) => {
    requestBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'chatcmpl-lingualens-e2e',
        object: 'chat.completion',
        created: 1,
        model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                translation,
                explanation
              })
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 8,
          total_tokens: 20
        }
      })
    });
  });

  return {
    getRequestBodies: () => requestBodies
  };
}

export function getTranslationPromptPayload(
  requestBody: Record<string, unknown> | undefined
): { selectedText?: string; sentenceContext?: string | null } {
  const messages = requestBody?.messages as Array<{ role: string; content: string }> | undefined;
  const userMessage = messages?.find((message) => message.role === 'user');
  if (!userMessage?.content) {
    return {};
  }

  return JSON.parse(userMessage.content) as {
    selectedText?: string;
    sentenceContext?: string | null;
  };
}
