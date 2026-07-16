import { expect, test } from './fixtures/extension';

test('loads the extension popup with quick settings', async ({ extensionId, popupPage }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
  expect(popupPage.url()).toBe(`chrome-extension://${extensionId}/index.html`);

  await expect(popupPage.getByRole('heading', { name: 'LinguaLens' })).toBeVisible();
  await expect(popupPage.getByRole('heading', { name: 'Quick settings' })).toBeVisible();
  await expect(popupPage.getByText('Frequently used reading controls')).toBeVisible();
  await expect(popupPage.getByRole('checkbox', { name: 'Selection lookup' })).toBeChecked();
  await expect(
    popupPage.getByRole('checkbox', { name: 'Pronunciation lookup' })
  ).not.toBeChecked();
  await expect(popupPage.getByLabel('Explanation language')).toHaveValue('zh-CN');
  await expect(popupPage.getByText('Set up AI service')).toBeVisible();
  await expect(popupPage.getByRole('link', { name: 'Open settings' })).toBeVisible();
  await expect(
    popupPage.getByText('Add an API key, then select text on a web page to translate and save it.')
  ).toBeVisible();
  await expect(popupPage.locator('[aria-label="Recently saved items"]')).toHaveCount(1);
});

test('persists quick settings after reopening the popup', async ({
  context,
  extensionId,
  popupPage
}) => {
  await popupPage.getByRole('checkbox', { name: 'Selection lookup' }).uncheck();
  await popupPage.getByRole('checkbox', { name: 'Pronunciation lookup' }).check();
  await popupPage.getByLabel('Explanation language').selectOption('ja');

  await popupPage.close();
  const reopenedPopupPage = await context.newPage();
  await reopenedPopupPage.goto(`chrome-extension://${extensionId}/index.html`);

  await expect(
    reopenedPopupPage.getByRole('checkbox', { name: 'Selection lookup' })
  ).not.toBeChecked();
  await expect(
    reopenedPopupPage.getByRole('checkbox', { name: 'Pronunciation lookup' })
  ).toBeChecked();
  await expect(reopenedPopupPage.getByLabel('Explanation language')).toHaveValue('ja');
  await reopenedPopupPage.close();
});

test('opens the full settings page from the popup', async ({ context, extensionId, popupPage }) => {
  const pagePromise = context.waitForEvent('page');
  await popupPage.getByRole('link', { name: 'Open settings' }).click();
  const settingsPage = await pagePromise;
  await settingsPage.waitForLoadState();

  await expect(settingsPage).toHaveURL(`chrome-extension://${extensionId}/settings.html`);
  await expect(settingsPage.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(
    settingsPage.getByRole('navigation', { name: 'LinguaLens management' })
  ).toBeVisible();
  await settingsPage.close();
});
