import { expect, test } from './fixtures/extension';
import {
  routeTestArticle,
  savedItemsStorageKey,
  selectArticleText,
  settingsStorageKey
} from './fixtures/helpers';

type E2EProviderConfig = {
  endpointPreset: 'nvidia';
  label: string;
  apiKey?: string;
  model: string;
};

const providerConfigs: E2EProviderConfig[] = [
  {
    endpointPreset: 'nvidia',
    label: 'NVIDIA NIM',
    apiKey: process.env.LINGUALENS_E2E_NVIDIA_API_KEY,
    model: process.env.LINGUALENS_E2E_NVIDIA_MODEL ?? 'meta/llama-3.1-8b-instruct'
  }
];

for (const providerConfig of providerConfigs) {
  test(`translates and saves selected text with ${providerConfig.label}`, async ({
    context,
    popupPage
  }) => {
    test.skip(
      !providerConfig.apiKey,
      `Set LINGUALENS_E2E_${providerConfig.endpointPreset.toUpperCase()}_API_KEY to run this provider test.`
    );

    await popupPage.evaluate(
      async ([storageKey, settingsKey, endpointPreset, model, apiKey]) => {
        await chrome.storage.local.clear();
        await chrome.storage.local.set({
          [settingsKey]: {
            explanationLanguage: 'zh-CN',
            llmProvider: 'openai-compatible',
            llmEndpointPreset: endpointPreset,
            llmModel: model,
            apiKey
          },
          [storageKey]: []
        });
      },
      [
        savedItemsStorageKey,
        settingsStorageKey,
        providerConfig.endpointPreset,
        providerConfig.model,
        providerConfig.apiKey
      ]
    );

    const realProviderUrl = 'https://lingualens.test/real-provider';
    await routeTestArticle(context, {
      url: realProviderUrl,
      title: 'LinguaLens Real Provider Test',
      body: 'The patient scientist observed a rare comet before sunrise.'
    });

    const page = await context.newPage();
    await page.goto(realProviderUrl);
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
        provider: 'openai-compatible',
        model: providerConfig.model,
        sourceUrl: realProviderUrl,
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
