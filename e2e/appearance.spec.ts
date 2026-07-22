import { expect, test } from './fixtures/extension';
import type { Page } from '@playwright/test';
import {
  routeTestArticle,
  selectArticleText,
  settingsStorageKey,
  testArticleUrl
} from './fixtures/helpers';

async function chooseAppearance(
  page: Page,
  appearance: 'Light' | 'Dark' | 'System'
) {
  await page.getByRole('button', { name: /^Appearance:/ }).click();
  await page.getByRole('menuitemradio', { name: appearance }).click();
  await expect(page.getByRole('button', { name: `Appearance: ${appearance}` })).toBeVisible();
}

test('shares and persists appearance across popup and management pages', async ({
  context,
  extensionId,
  popupPage
}) => {
  const settingsPage = await context.newPage();
  const savedPage = await context.newPage();
  await Promise.all([
    settingsPage.goto(`chrome-extension://${extensionId}/settings.html`),
    savedPage.goto(`chrome-extension://${extensionId}/saved.html`)
  ]);

  for (const page of [popupPage, settingsPage, savedPage]) {
    await expect(page.getByRole('button', { name: 'Appearance: System' })).toBeVisible();
  }

  await chooseAppearance(popupPage, 'Dark');
  for (const page of [popupPage, settingsPage, savedPage]) {
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Appearance: Dark' })).toBeVisible();
  }

  const storedSettings = await popupPage.evaluate(async ([settingsKey]) => {
    const result = await chrome.storage.local.get(settingsKey);
    return result[settingsKey];
  }, [settingsStorageKey]);
  expect(storedSettings).toEqual(expect.objectContaining({ appearance: 'dark' }));

  await savedPage.reload();
  await expect(savedPage.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(savedPage.getByRole('button', { name: 'Appearance: Dark' })).toBeVisible();

  await settingsPage.close();
  await savedPage.close();
});

test('follows system appearance only while System is selected', async ({ popupPage }) => {
  await popupPage.emulateMedia({ colorScheme: 'dark' });
  await chooseAppearance(popupPage, 'System');
  await expect(popupPage.locator('html')).toHaveAttribute('data-theme', 'dark');

  await popupPage.emulateMedia({ colorScheme: 'light' });
  await expect(popupPage.locator('html')).toHaveAttribute('data-theme', 'light');

  await chooseAppearance(popupPage, 'Dark');
  await popupPage.emulateMedia({ colorScheme: 'light' });
  await expect(popupPage.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('supports keyboard navigation in the appearance menu', async ({ popupPage }) => {
  const switcher = popupPage.getByRole('button', { name: 'Appearance: System' });
  await switcher.focus();
  await switcher.press('ArrowDown');
  await expect(popupPage.getByRole('menuitemradio', { name: 'System' })).toBeFocused();
  await popupPage.keyboard.press('Home');
  await expect(popupPage.getByRole('menuitemradio', { name: 'Light' })).toBeFocused();
  await popupPage.keyboard.press('ArrowDown');
  await expect(popupPage.getByRole('menuitemradio', { name: 'Dark' })).toBeFocused();
  await popupPage.keyboard.press('Escape');
  await expect(switcher).toBeFocused();
  await expect(popupPage.getByRole('menu')).toHaveCount(0);
});

test('keeps immediate appearance changes when other settings are discarded', async ({
  context,
  extensionId
}) => {
  const settingsPage = await context.newPage();
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);

  await settingsPage.getByLabel('Explanation language').selectOption('ja');
  await chooseAppearance(settingsPage, 'Dark');
  await settingsPage.getByRole('button', { name: 'Cancel' }).click();

  await expect(settingsPage.getByLabel('Explanation language')).toHaveValue('zh-CN');
  await expect(settingsPage.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(settingsPage.getByRole('button', { name: 'Appearance: Dark' })).toBeVisible();
  await settingsPage.close();
});

test('updates an open content-script panel without changing the host page', async ({
  context,
  popupPage
}) => {
  await routeTestArticle(context);

  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await chooseAppearance(popupPage, 'Dark');
  await selectArticleText(page, 'foreign-language reading');

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-theme', 'dark');
  await expect
    .poll(() =>
      panel.evaluate((host) => {
        const panelElement = host.shadowRoot?.querySelector('.panel');
        return panelElement ? getComputedStyle(panelElement).backgroundColor : '';
      })
    )
    .toBe('rgb(24, 30, 41)');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);

  await chooseAppearance(popupPage, 'Light');
  await expect(panel).toHaveAttribute('data-theme', 'light');
  await expect
    .poll(() =>
      panel.evaluate((host) => {
        const panelElement = host.shadowRoot?.querySelector('.panel');
        return panelElement ? getComputedStyle(panelElement).backgroundColor : '';
      })
    )
    .toBe('rgb(255, 255, 255)');
  await page.close();
});
