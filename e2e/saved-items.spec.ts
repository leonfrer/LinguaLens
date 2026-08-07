import type { BrowserContext, Page } from '@playwright/test';
import { expect, test } from './fixtures/extension';
import { savedItemsStorageKey } from './fixtures/helpers';

const BACKUP_FORMAT = 'lingualens-saved-items-backup';

function makeSavedItem(overrides: {
  id: string;
  text: string;
  translation: string;
  createdAt: number;
  sentenceContext?: string;
}) {
  return {
    explanationLanguage: 'zh-CN',
    sourceUrl: 'https://lingualens.test/article',
    sourceTitle: 'LinguaLens Test Article',
    provider: 'openai-compatible',
    model: 'mock-model',
    ...overrides
  };
}

async function openSavedPage(context: BrowserContext, extensionId: string): Promise<Page> {
  const savedPage = await context.newPage();
  await savedPage.goto(`chrome-extension://${extensionId}/saved.html`);
  await savedPage.waitForLoadState();
  return savedPage;
}

async function restoreBackupFile(
  savedPage: Page,
  payload: unknown,
  fileName = 'restore-test.lingualens-backup'
): Promise<void> {
  await savedPage.getByRole('button', { name: 'More actions' }).click();
  await expect(savedPage.getByRole('menu', { name: 'Saved items actions' })).toBeVisible();

  const [fileChooser] = await Promise.all([
    savedPage.waitForEvent('filechooser'),
    savedPage.getByRole('menuitem', { name: 'Restore' }).click()
  ]);

  await fileChooser.setFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  });
}

test('shows saved items in the popup and deletes them', async ({ popupPage }) => {
  await popupPage.evaluate(async ([storageKey]) => {
    await chrome.storage.local.set({
      [storageKey]: [
        {
          id: 'saved-item-1',
          text: 'bonjour',
          translation: '你好',
          pronunciation: '/bɔ̃.ʒuʁ/',
          pronunciationNotation: 'IPA',
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
  await expect(popupPage.getByText('IPA', { exact: true })).toBeVisible();
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
          pronunciationNotation: 'IPA',
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
  await expect(savedPage.locator('.pronunciationNotation')).toHaveText('IPA');
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

test('highlights a whole-word match instead of a longer-word prefix', async ({
  context,
  extensionId,
  popupPage
}) => {
  await popupPage.evaluate(async ([storageKey]) => {
    await chrome.storage.local.set({
      [storageKey]: [
        {
          id: 'saved-page-item-na',
          text: 'Na',
          translation: '钠',
          explanationLanguage: 'zh-CN',
          sentenceContext: 'Nato and Na.',
          provider: 'openai-compatible',
          model: 'mock-model',
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
  await expect(savedPage.locator('.contextText')).toHaveText('Nato and Na.');
  await expect(savedPage.locator('.contextText mark')).toHaveText('Na');

  const highlighted = await savedPage.locator('.contextText').evaluate((node) => {
    const mark = node.querySelector('mark');
    if (!mark || !mark.parentNode) {
      return null;
    }

    const before = mark.previousSibling?.textContent ?? '';
    const after = mark.nextSibling?.textContent ?? '';
    return { before, marked: mark.textContent, after };
  });

  expect(highlighted).toEqual({
    before: 'Nato and ',
    marked: 'Na',
    after: '.'
  });

  await savedPage.close();
});

test('highlights the stored occurrence when the same word appears twice', async ({
  context,
  extensionId,
  popupPage
}) => {
  await popupPage.evaluate(async ([storageKey]) => {
    await chrome.storage.local.set({
      [storageKey]: [
        {
          id: 'saved-page-item-bank',
          text: 'bank',
          translation: '银行',
          explanationLanguage: 'zh-CN',
          sentenceContext: 'The bank by the river and the bank downtown.',
          selectionStartInContext: 32,
          provider: 'openai-compatible',
          model: 'mock-model',
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

  const highlighted = await savedPage.locator('.contextText').evaluate((node) => {
    const mark = node.querySelector('mark');
    if (!mark) {
      return null;
    }

    return {
      before: mark.previousSibling?.textContent ?? '',
      marked: mark.textContent,
      after: mark.nextSibling?.textContent ?? ''
    };
  });

  expect(highlighted).toEqual({
    before: 'The bank by the river and the ',
    marked: 'bank',
    after: ' downtown.'
  });

  await expect(savedPage).toHaveURL(`chrome-extension://${extensionId}/saved.html`);
  await savedPage.close();
});

test('restores a backup by merging on id and shows a success toast', async ({
  context,
  extensionId,
  popupPage
}) => {
  await popupPage.evaluate(async ([storageKey]) => {
    await chrome.storage.local.set({
      [storageKey]: [
        {
          id: 'a',
          text: 'local-a',
          translation: 'A-local',
          explanationLanguage: 'zh-CN',
          sourceUrl: 'https://lingualens.test/article',
          sourceTitle: 'LinguaLens Test Article',
          provider: 'openai-compatible',
          model: 'mock-model',
          createdAt: 10
        },
        {
          id: 'b',
          text: 'local-b',
          translation: 'B-local',
          explanationLanguage: 'zh-CN',
          sourceUrl: 'https://lingualens.test/article',
          sourceTitle: 'LinguaLens Test Article',
          provider: 'openai-compatible',
          model: 'mock-model',
          createdAt: 20
        }
      ]
    });
  }, [savedItemsStorageKey]);

  const savedPage = await openSavedPage(context, extensionId);

  await expect(savedPage.getByRole('heading', { name: 'Saved items' })).toBeVisible();
  await expect(savedPage.locator('.savedCard')).toHaveCount(2);
  await expect(savedPage.locator('.itemCount')).toHaveText('2 saved');

  await restoreBackupFile(savedPage, {
    format: BACKUP_FORMAT,
    version: 1,
    createdAt: 1,
    items: [
      makeSavedItem({
        id: 'a',
        text: 'backup-a',
        translation: 'A-backup',
        createdAt: 10,
        sentenceContext: 'Context for backup-a.'
      }),
      makeSavedItem({
        id: 'c',
        text: 'backup-c',
        translation: 'C-backup',
        createdAt: 30,
        sentenceContext: 'Context for backup-c.'
      })
    ]
  });

  await expect(savedPage.getByRole('status')).toHaveText('Restored: 1 added, 1 updated.');
  await expect(savedPage.locator('.savedCard')).toHaveCount(3);
  await expect(savedPage.locator('.itemCount')).toHaveText('3 saved');
  await expect(savedPage.locator('.translationText')).toHaveText([
    'C-backup',
    'B-local',
    'A-backup'
  ]);
  await expect(savedPage.locator('.contextText')).toContainText(['backup-c', 'local-b', 'backup-a']);

  const storedItems = await savedPage.evaluate(async ([storageKey]) => {
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey] as Array<{ id: string; translation: string }>;
  }, [savedItemsStorageKey]);

  expect(storedItems.map((item) => item.id)).toEqual(['c', 'b', 'a']);
  expect(storedItems.find((item) => item.id === 'a')?.translation).toBe('A-backup');
  expect(storedItems.find((item) => item.id === 'b')?.translation).toBe('B-local');
  expect(storedItems.find((item) => item.id === 'c')?.translation).toBe('C-backup');

  await savedPage.close();
});

test('shows an error toast when restore file is invalid', async ({ context, extensionId }) => {
  const savedPage = await openSavedPage(context, extensionId);

  await expect(savedPage.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();

  await restoreBackupFile(savedPage, {
    format: 'not-a-lingualens-backup',
    version: 1,
    items: []
  });

  await expect(savedPage.getByRole('status')).toHaveText(
    'That file is not a valid LinguaLens saved-items backup.'
  );
  await expect(savedPage.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
  await expect(savedPage.locator('.savedCard')).toHaveCount(0);

  await savedPage.close();
});
