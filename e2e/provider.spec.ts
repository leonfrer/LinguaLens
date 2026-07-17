import { expect, test } from './fixtures/extension';
import {
  routeTestArticle,
  savedItemsStorageKey,
  seedExtensionSettings,
  selectArticleText,
  testArticleUrl
} from './fixtures/helpers';

test('loads models from a custom endpoint and shows provider errors', async ({
  context,
  extensionId
}) => {
  let modelsRequestCount = 0;
  const settingsPage = await context.newPage();
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);

  await context.route('https://models.example.test/v1/models', async (route) => {
    modelsRequestCount += 1;
    expect(route.request().headers().authorization).toBe('Bearer model-list-key');
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'z-model' }, { id: 'a-model' }, { id: 'z-model' }]
      })
    });
  });

  await settingsPage.getByLabel('Endpoint').selectOption('custom');
  await settingsPage.getByLabel('Base URL').fill('https://models.example.test/v1/');
  await settingsPage.getByLabel('API key').fill('model-list-key');
  await settingsPage.getByRole('button', { name: 'Load models' }).click();

  const modelSelect = settingsPage.locator('.modelRow select');
  await expect(modelSelect).toHaveValue('a-model');
  await expect(modelSelect.locator('option')).toHaveText(['a-model', 'z-model']);
  expect(modelsRequestCount).toBe(1);

  await context.route('https://empty.example.test/v1/models', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ data: [] })
    });
  });
  await settingsPage.getByLabel('Base URL').fill('https://empty.example.test/v1');
  await settingsPage.getByRole('button', { name: 'Load models' }).click();
  await expect(
    settingsPage.getByText('The provider did not return any available models.')
  ).toBeVisible();

  await context.route('https://failure.example.test/v1/models', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 401,
      body: JSON.stringify({ error: { message: 'Invalid model-list-key' } })
    });
  });
  await settingsPage.getByLabel('Base URL').fill('https://failure.example.test/v1');
  await settingsPage.getByRole('button', { name: 'Load models' }).click();

  await expect(
    settingsPage.getByText('Unable to load models from https://failure.example.test/v1.')
  ).toBeVisible();
  await expect(settingsPage.getByText('model-list-key')).toHaveCount(0);
  await settingsPage.close();
});

test('translates and saves with a mocked custom OpenAI-compatible endpoint', async ({
  context,
  extensionId,
  popupPage
}) => {
  let translationRequestBody: Record<string, unknown> | undefined;

  await context.route('https://translation.example.test/v1/chat/completions', async (route) => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer mocked-translation-key');
    translationRequestBody = request.postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'chatcmpl-lingualens-e2e',
        object: 'chat.completion',
        created: 1,
        model: 'mock-translation-model',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                translation: '稀有的彗星',
                pronunciation: '/reər ˈkɒmɪt/',
                pronunciationNotation: 'IPA',
                explanation: '用于稳定 E2E 的模拟响应。'
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

  const settingsPage = await context.newPage();
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);
  await settingsPage.getByLabel('Endpoint').selectOption('custom');
  await settingsPage.getByLabel('Base URL').fill('https://translation.example.test/v1');
  await settingsPage.getByLabel('Manual model ID').fill('mock-translation-model');
  await settingsPage.getByLabel('API key').fill('mocked-translation-key');
  await settingsPage.getByRole('checkbox', { name: 'Pronunciation lookup' }).check();
  await settingsPage.getByRole('checkbox', { name: 'Enabled: Japanese' }).uncheck();
  await settingsPage.getByRole('button', { name: 'Save changes' }).click();
  await settingsPage.close();

  await routeTestArticle(context, {
    body: 'The patient scientist observed a rare comet before sunrise.'
  });
  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await selectArticleText(page, 'rare comet');

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel.getByText('稀有的彗星')).toBeVisible();
  await expect(panel.getByText('/reər ˈkɒmɪt/')).toBeVisible();
  await expect(panel.getByText('IPA', { exact: true })).toBeVisible();
  const explanation = panel.getByText('用于稳定 E2E 的模拟响应。');
  await expect(explanation).toBeVisible();
  await expect(explanation).toHaveCSS('color', 'rgb(104, 115, 134)');
  await expect(explanation).toHaveCSS('font-size', '12px');
  await expect(panel.getByText('mock-translation-model')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Save' })).toBeEnabled();
  expect(translationRequestBody).toEqual(
    expect.objectContaining({ model: 'mock-translation-model' })
  );
  const requestMessages = translationRequestBody?.messages as
    | Array<{ role: string; content: string }>
    | undefined;
  const systemMessage = requestMessages?.find((message) => message.role === 'system');
  const userMessage = requestMessages?.find((message) => message.role === 'user');
  expect(systemMessage?.content).toContain(
    '"English":"IPA","Chinese":"Hanyu Pinyin","Korean":"Hangul"'
  );
  expect(systemMessage?.content).not.toContain('"Japanese"');
  expect(userMessage?.content).not.toContain('pronunciationPreferences');

  await panel.getByRole('button', { name: 'Save' }).click();
  await expect(panel.getByText('Saved')).toBeVisible();

  const savedItems = await popupPage.evaluate(async ([storageKey]) => {
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey];
  }, [savedItemsStorageKey]);
  expect(savedItems).toEqual([
    expect.objectContaining({
      text: 'rare comet',
      translation: '稀有的彗星',
      pronunciation: '/reər ˈkɒmɪt/',
      pronunciationNotation: 'IPA',
      explanation: '用于稳定 E2E 的模拟响应。',
      provider: 'openai-compatible',
      model: 'mock-translation-model'
    })
  ]);
  expect(savedItems[0]).not.toHaveProperty('apiKey');
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
