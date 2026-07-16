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
          pronunciation: '/bɔ̃.ʒuʁ/',
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
  await expect(popupPage.getByText('/bɔ̃.ʒuʁ/')).toBeVisible();
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

test('shows sentence context and source links on the saved items page', async ({
  context,
  extensionId,
  popupPage
}) => {
  await popupPage.evaluate(async ([storageKey]) => {
    await chrome.storage.local.set({
      [storageKey]: [
        {
          id: 'saved-page-item-1',
          text: 'bonjour',
          translation: '你好',
          pronunciation: '/bɔ̃.ʒuʁ/',
          explanationLanguage: 'zh-CN',
          sentenceContext: 'She said bonjour to everyone in the room.',
          explanation: 'A common French greeting.',
          provider: 'openai-compatible',
          model: 'meta/llama-3.1-8b-instruct',
          sourceUrl: 'https://lingualens.test/article',
          sourceTitle: 'LinguaLens Test Article',
          createdAt: Date.UTC(2026, 6, 16)
        }
      ]
    });
  }, [savedItemsStorageKey]);

  await popupPage.reload();
  const pagePromise = context.waitForEvent('page');
  await popupPage.getByRole('link', { name: 'View all' }).click();
  const savedPage = await pagePromise;
  await savedPage.waitForLoadState();

  await expect(savedPage).toHaveURL(`chrome-extension://${extensionId}/saved.html`);
  await expect(savedPage.getByRole('heading', { name: 'Saved items' })).toBeVisible();
  await expect(savedPage.locator('.contextText')).toHaveText(
    'She said bonjour to everyone in the room.'
  );
  await expect(savedPage.locator('.contextText mark')).toHaveText('bonjour');
  await expect(savedPage.locator('.contextText mark')).toHaveCSS('font-weight', '700');
  await expect(savedPage.locator('.translationText')).toHaveText('你好');
  await expect(savedPage.locator('.pronunciationText')).toHaveText('/bɔ̃.ʒuʁ/');
  await expect(savedPage.locator('.explanationText')).toHaveText('A common French greeting.');

  const sourceLink = savedPage.getByRole('link', {
    name: 'Open source: LinguaLens Test Article'
  });
  await expect(sourceLink).toHaveAttribute('href', 'https://lingualens.test/article');
  await expect(savedPage.locator('.cardFooter')).toContainText('LinguaLens Test Article');

  await savedPage.getByRole('button', { name: 'Delete bonjour' }).click();
  await expect(savedPage.locator('.savedCard')).toHaveCount(0);
  await expect(savedPage.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();

  await savedPage.close();
});
