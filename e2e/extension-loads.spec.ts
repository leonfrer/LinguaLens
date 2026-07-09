import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from './fixtures/extension';

const savedItemsStorageKey = 'lingualens.savedItems';
const settingsStorageKey = 'lingualens.settings';
const testArticleUrl = 'https://lingualens.test/article';

type E2EProviderConfig = {
  provider: 'nvidia';
  label: string;
  apiKey?: string;
  model: string;
};

const providerConfigs: E2EProviderConfig[] = [
  {
    provider: 'nvidia',
    label: 'NVIDIA NIM',
    apiKey: process.env.LINGUALENS_E2E_NVIDIA_API_KEY,
    model: process.env.LINGUALENS_E2E_NVIDIA_MODEL ?? 'meta/llama-3.1-8b-instruct'
  }
];

async function routeTestArticle(
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

async function selectArticleText(
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

async function seedExtensionSettings(
  popupPage: Page,
  settings: {
    apiKey?: string;
    explanationLanguage?: string;
    model?: string;
    provider?: string;
  }
): Promise<void> {
  await popupPage.evaluate(
    async ([settingsKey, nextSettings]) => {
      await chrome.storage.local.set({
        [settingsKey]: {
          explanationLanguage: nextSettings.explanationLanguage ?? 'zh-CN',
          llmProvider: nextSettings.provider ?? 'nvidia',
          llmModel: nextSettings.model ?? 'meta/llama-3.1-8b-instruct',
          apiKey: nextSettings.apiKey ?? ''
        }
      });
    },
    [settingsStorageKey, settings]
  );
}

test('loads the extension popup', async ({ extensionId, popupPage }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
  expect(popupPage.url()).toBe(`chrome-extension://${extensionId}/index.html`);

  await expect(popupPage.getByRole('heading', { name: 'LinguaLens' })).toBeVisible();
  await expect(popupPage.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(popupPage.getByText('Current configuration')).toBeVisible();
  await expect(popupPage.getByRole('checkbox', { name: /Selection lookup/ })).toBeChecked();
  await expect(popupPage.getByText('简体中文')).toBeVisible();
  await expect(popupPage.getByText('NVIDIA NIM')).toBeVisible();
  await expect(popupPage.getByText('meta/llama-3.1-8b-instruct')).toBeVisible();
  await expect(popupPage.getByText('Not configured', { exact: true })).toBeVisible();
  await expect(
    popupPage.getByText('Add an API key, then select text on a web page to translate and save it.')
  ).toBeVisible();
  await expect(popupPage.locator('[aria-label="Recently saved items"]')).toHaveCount(1);
});

test.describe('localized Chrome i18n runtime', () => {
  test.use({ uiLocale: 'zh-CN' });

  test('localizes popup and content panel for Simplified Chinese', async ({
    context,
    popupPage
  }) => {
    await popupPage.evaluate(async ([settingsKey]) => {
      await chrome.storage.local.remove(settingsKey);
    }, [settingsStorageKey]);
    await popupPage.reload();

    await expect(popupPage.getByRole('heading', { name: '设置' })).toBeVisible();
    await expect(popupPage.getByText('当前配置')).toBeVisible();
    await expect(popupPage.getByRole('checkbox', { name: /划词查询/ })).toBeChecked();
    await expect(popupPage.getByText('未配置', { exact: true })).toBeVisible();
    await expect(
      popupPage.getByText('配置 API 密钥后，在网页中选中文本即可翻译并保存。')
    ).toBeVisible();
    await expect(popupPage.locator('[aria-label="最近保存的内容"]')).toHaveCount(1);

    await popupPage.getByRole('button', { name: '设置' }).click();
    await expect(popupPage.getByText('编辑配置')).toBeVisible();
    await expect(popupPage.getByLabel('API 密钥')).toHaveAttribute(
      'placeholder',
      'NVIDIA API 密钥'
    );
    await popupPage.getByRole('button', { name: '取消' }).click();

    await routeTestArticle(context);

    const page = await context.newPage();
    await page.goto(testArticleUrl);
    await page.locator('#article').waitFor();
    await selectArticleText(page, 'foreign-language reading');

    const panel = page.locator('#lingualens-selection-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('foreign-language reading')).toBeVisible();
    await expect(panel.getByText('请先在 LinguaLens 设置中添加 LLM API 密钥再翻译。')).toBeVisible();
    await expect(panel.getByRole('button', { name: '保存' })).toBeDisabled();

    await page.close();
  });
});

test('edits popup settings', async ({ popupPage }) => {
  await popupPage.getByRole('button', { name: 'Settings' }).click();

  await expect(popupPage.getByText('Edit configuration')).toBeVisible();

  const languageSelect = popupPage.getByLabel('Explanation language');
  const modelSelect = popupPage.locator('.settingsGrid select');
  const apiKeyInput = popupPage.getByLabel('API key');

  await expect(languageSelect).toHaveValue('zh-CN');
  await expect(modelSelect).toHaveValue('meta/llama-3.1-8b-instruct');
  await expect(apiKeyInput).toHaveValue('');

  await languageSelect.selectOption('en');
  await apiKeyInput.fill('test-api-key');
  await popupPage.getByRole('button', { name: 'Save' }).click();

  await expect(popupPage.getByText('Current configuration')).toBeVisible();
  await expect(popupPage.getByText('English')).toBeVisible();
  await expect(popupPage.getByText('NVIDIA NIM')).toBeVisible();
  await expect(popupPage.getByText('meta/llama-3.1-8b-instruct')).toBeVisible();
  await expect(popupPage.getByText('Configured', { exact: true })).toBeVisible();
});

test('persists popup settings after reopening the popup', async ({ context, extensionId, popupPage }) => {
  await popupPage.getByRole('button', { name: 'Settings' }).click();
  await popupPage.getByLabel('Explanation language').selectOption('ja');
  await popupPage.getByLabel('Manual model ID').fill('custom-e2e-model');
  await popupPage.getByLabel('API key').fill('persisted-e2e-key');
  await popupPage.getByRole('button', { name: 'Save' }).click();

  await expect(popupPage.getByText('日本語')).toBeVisible();
  await expect(popupPage.getByText('custom-e2e-model')).toBeVisible();
  await expect(popupPage.getByText('persisted-e2e-key')).toHaveCount(0);

  await popupPage.close();

  const reopenedPopupPage = await context.newPage();
  await reopenedPopupPage.goto(`chrome-extension://${extensionId}/index.html`);

  await expect(reopenedPopupPage.getByText('日本語')).toBeVisible();
  await expect(reopenedPopupPage.getByText('custom-e2e-model')).toBeVisible();
  await expect(reopenedPopupPage.getByText('Configured', { exact: true })).toBeVisible();
  await expect(reopenedPopupPage.getByText('persisted-e2e-key')).toHaveCount(0);

  await reopenedPopupPage.close();
});

test('cancels popup settings edits and updates the API key alert state', async ({ popupPage }) => {
  await expect(popupPage.locator('[aria-label="API key is not configured"]')).toBeVisible();

  await popupPage.getByRole('button', { name: 'Settings' }).click();
  await popupPage.getByLabel('Explanation language').selectOption('en');
  await popupPage.getByLabel('API key').fill('discarded-test-key');
  await popupPage.getByRole('button', { name: 'Cancel' }).click();

  await expect(popupPage.getByText('Current configuration')).toBeVisible();
  await expect(popupPage.getByText('简体中文')).toBeVisible();
  await expect(popupPage.getByText('NVIDIA NIM')).toBeVisible();
  await expect(popupPage.getByText('meta/llama-3.1-8b-instruct')).toBeVisible();
  await expect(popupPage.getByText('Not configured', { exact: true })).toBeVisible();
  await expect(popupPage.locator('[aria-label="API key is not configured"]')).toBeVisible();

  await popupPage.getByRole('button', { name: 'Settings' }).click();
  await popupPage.getByLabel('API key').fill('saved-test-key');
  await popupPage.getByRole('button', { name: 'Save' }).click();

  await expect(popupPage.getByText('Configured', { exact: true })).toBeVisible();
  await expect(popupPage.locator('[aria-label="API key is not configured"]')).toHaveCount(0);
  await expect(popupPage.getByText('saved-test-key')).toHaveCount(0);
});

test('shows an API key setup error from the content script selection flow', async ({
  context,
  popupPage
}) => {
  await popupPage.evaluate(async ([settingsKey]) => {
    await chrome.storage.local.remove(settingsKey);
  }, [settingsStorageKey]);
  await routeTestArticle(context);

  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await selectArticleText(page, 'foreign-language reading');

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('foreign-language reading')).toBeVisible();
  await expect(
    panel.getByText('Please add your LLM API key in LinguaLens settings before translating.')
  ).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Save' })).toBeDisabled();

  await page.close();
});

test('toggles word lookup from the popup and suppresses selection handling', async ({
  context,
  popupPage
}) => {
  await popupPage.evaluate(async ([settingsKey]) => {
    await chrome.storage.local.remove(settingsKey);
  }, [settingsStorageKey]);
  await popupPage.reload();

  const wordLookupToggle = popupPage.getByRole('checkbox', { name: /Selection lookup/ });
  await expect(wordLookupToggle).toBeChecked();

  await wordLookupToggle.uncheck();
  await expect(wordLookupToggle).not.toBeChecked();
  await expect(popupPage.getByText('Off', { exact: true })).toBeVisible();

  const disabledSettings = await popupPage.evaluate(async ([settingsKey]) => {
    const result = await chrome.storage.local.get(settingsKey);
    return result[settingsKey];
  }, [settingsStorageKey]);
  expect(disabledSettings).toEqual(expect.objectContaining({ wordLookupEnabled: false }));

  await routeTestArticle(context);

  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await selectArticleText(page, 'foreign-language reading');
  await expect(page.locator('#lingualens-selection-panel')).toHaveCount(0);

  await wordLookupToggle.check();
  await expect(wordLookupToggle).toBeChecked();
  await expect(popupPage.getByText('On', { exact: true })).toBeVisible();

  await selectArticleText(page, 'foreign-language reading');
  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel).toBeVisible();
  await expect(
    panel.getByText('Please add your LLM API key in LinguaLens settings before translating.')
  ).toBeVisible();

  await page.close();
});

test('shows provider errors without leaking the configured API key', async ({ context, popupPage }) => {
  await seedExtensionSettings(popupPage, { apiKey: 'invalid-provider-key' });
  await context.route('https://integrate.api.nvidia.com/v1/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 401,
      body: JSON.stringify({ error: { message: 'Invalid API key' } })
    });
  });
  await routeTestArticle(context);

  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await selectArticleText(page, 'foreign-language reading');

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Unable to translate with NVIDIA NIM.')).toBeVisible();
  await expect(panel.getByText('invalid-provider-key')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Save' })).toBeDisabled();

  await page.close();
});

test('supports keyboard selection, close, invalid selection, and scroll dismissal', async ({
  context
}) => {
  await routeTestArticle(context);

  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await selectArticleText(page, 'foreign-language reading', 'keyup');

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('foreign-language reading')).toBeVisible();

  await panel.getByRole('button', { name: 'Close' }).click();
  await expect(panel).toHaveCount(0);

  await selectArticleText(page, ' ');
  await expect(panel).toHaveCount(0);

  await selectArticleText(page, 'selected text');
  await expect(panel).toBeVisible();
  await page.evaluate(() => {
    window.scrollTo(0, 160);
  });
  await expect(panel).toHaveCount(0);

  await page.close();
});

test('shows saved items in the popup and deletes them', async ({ popupPage }) => {
  await popupPage.evaluate(async ([storageKey]) => {
    await chrome.storage.local.set({
      [storageKey]: [
        {
          id: 'saved-item-1',
          text: 'bonjour',
          translation: '你好',
          explanationLanguage: 'zh-CN',
          sentenceContext: 'bonjour tout le monde',
          explanation: 'A common French greeting.',
          provider: 'nvidia',
          model: 'meta/llama-3.1-8b-instruct',
          sourceUrl: 'https://lingualens.test/article',
          sourceTitle: 'LinguaLens Test Article',
          createdAt: 1
        }
      ]
    });
  }, [savedItemsStorageKey]);

  await popupPage.reload();

  await expect(popupPage.getByText('bonjour')).toBeVisible();
  await expect(popupPage.getByText('你好')).toBeVisible();
  await expect(popupPage.getByText('A common French greeting.')).toBeVisible();
  await expect(
    popupPage.getByText('LinguaLens Test Article · meta/llama-3.1-8b-instruct')
  ).toBeVisible();

  await popupPage.getByRole('button', { name: 'Delete bonjour' }).click();

  await expect(popupPage.getByText('bonjour')).toHaveCount(0);
  await expect(
    popupPage.getByText('Add an API key, then select text on a web page to translate and save it.')
  ).toBeVisible();
});

for (const providerConfig of providerConfigs) {
  test(`translates and saves selected text with ${providerConfig.label}`, async ({
    context,
    popupPage
  }) => {
    test.skip(
      !providerConfig.apiKey,
      `Set LINGUALENS_E2E_${providerConfig.provider.toUpperCase()}_API_KEY to run this provider test.`
    );

    await popupPage.evaluate(
      async ([storageKey, settingsKey, provider, model, apiKey]) => {
        await chrome.storage.local.clear();
        await chrome.storage.local.set({
          [settingsKey]: {
            explanationLanguage: 'zh-CN',
            llmProvider: provider,
            llmModel: model,
            apiKey
          },
          [storageKey]: []
        });
      },
      [
        savedItemsStorageKey,
        settingsStorageKey,
        providerConfig.provider,
        providerConfig.model,
        providerConfig.apiKey
      ]
    );

    await routeTestArticle(context, {
      url: 'https://lingualens.test/real-provider',
      title: 'LinguaLens Real Provider Test',
      body: 'The patient scientist observed a rare comet before sunrise.'
    });

    const page = await context.newPage();
    await page.goto('https://lingualens.test/real-provider');
    await page.locator('#article').waitFor();
    await selectArticleText(page, 'rare comet');

    const panel = page.locator('#lingualens-selection-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('rare comet')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Save' })).toBeEnabled({ timeout: 60000 });
    await expect(panel.getByText(providerConfig.model)).toBeVisible();

    await panel.getByRole('button', { name: 'Save' }).click();
    await expect(panel.getByText('Saved')).toBeVisible();

    const savedItems = await popupPage.evaluate(async ([storageKey]) => {
      const result = await chrome.storage.local.get(storageKey);
      return result[storageKey];
    }, [savedItemsStorageKey]);

    expect(savedItems).toEqual([
      expect.objectContaining({
        text: 'rare comet',
        explanationLanguage: 'zh-CN',
        sentenceContext: 'The patient scientist observed a rare comet before sunrise.',
        provider: providerConfig.provider,
        model: providerConfig.model,
        sourceUrl: 'https://lingualens.test/real-provider',
        sourceTitle: 'LinguaLens Real Provider Test'
      })
    ]);
    expect(savedItems[0].translation).toEqual(expect.any(String));
    expect(savedItems[0].translation.length).toBeGreaterThan(0);
    expect(savedItems[0]).not.toHaveProperty('apiKey');

    await popupPage.reload();
    await expect(
      popupPage.locator('.sourceText').getByText('rare comet', { exact: true })
    ).toBeVisible();

    await page.close();
  });
}
