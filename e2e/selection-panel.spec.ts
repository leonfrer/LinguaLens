import { expect, test } from './fixtures/extension';
import {
  routeTestArticle,
  selectArticleText,
  settingsStorageKey,
  testArticleUrl
} from './fixtures/helpers';

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

  await selectArticleText(page, 'foreign-language reading');
  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel).toBeVisible();
  await expect(
    panel.getByText('Please add your LLM API key in LinguaLens settings before translating.')
  ).toBeVisible();
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
