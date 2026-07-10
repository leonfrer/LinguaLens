import { expect, test } from './fixtures/extension';
import { savedItemsStorageKey } from './fixtures/helpers';

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
          provider: 'openai-compatible',
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
