import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/extension';
import {
  getTranslationPromptPayload,
  mockTranslationEndpoint,
  routeTestArticle,
  seedExtensionSettings,
  selectArticleText,
  testArticleUrl
} from './fixtures/helpers';

const mockBaseUrl = 'https://translation.example.test/v1';
const mockModel = 'mock-context-model';

async function seedMockTranslator(popupPage: Page): Promise<void> {
  await seedExtensionSettings(popupPage, {
    apiKey: 'mocked-context-key',
    endpointPreset: 'custom',
    baseUrl: mockBaseUrl,
    model: mockModel
  });
}

test('uses the full sentence when the selection is inside inline markup', async ({
  context,
  popupPage
}) => {
  await seedMockTranslator(popupPage);
  const mock = await mockTranslationEndpoint(context, {
    url: `${mockBaseUrl}/chat/completions`,
    translation: '提交',
    model: mockModel
  });

  await routeTestArticle(context, {
    body: 'Click the <b>Submit</b> button to continue. Next sentence stays out.'
  });

  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await selectArticleText(page, 'Submit');

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel.getByText('提交')).toBeVisible();

  await expect.poll(() => mock.getRequestBodies().length).toBe(1);
  expect(getTranslationPromptPayload(mock.getRequestBodies()[0])).toEqual({
    selectedText: 'Submit',
    sentenceContext: 'Click the Submit button to continue.'
  });

  await page.close();
});

test('uses the sentence for the selected occurrence of a repeated word', async ({
  context,
  popupPage
}) => {
  await seedMockTranslator(popupPage);
  const mock = await mockTranslationEndpoint(context, {
    url: `${mockBaseUrl}/chat/completions`,
    translation: '银行',
    model: mockModel
  });

  await routeTestArticle(context, {
    body: 'He sat by the river bank. Later he went to the bank to open an account.'
  });

  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await selectArticleText(page, 'bank', { occurrence: 1 });

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel.getByText('银行')).toBeVisible();

  await expect.poll(() => mock.getRequestBodies().length).toBe(1);
  expect(getTranslationPromptPayload(mock.getRequestBodies()[0])).toEqual({
    selectedText: 'bank',
    sentenceContext: 'Later he went to the bank to open an account.'
  });

  await page.close();
});
