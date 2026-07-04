import { expect, test } from './fixtures/extension';

test('loads the extension popup', async ({ extensionId, popupPage }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
  expect(popupPage.url()).toBe(`chrome-extension://${extensionId}/index.html`);

  await expect(popupPage.getByRole('heading', { name: 'LinguaLens' })).toBeVisible();
  await expect(popupPage.locator('select')).toHaveValue('zh-CN');
  await expect(popupPage.getByText('在网页中选中文本即可查看模拟翻译并保存。')).toBeVisible();
  await expect(popupPage.locator('[aria-label="最近保存的内容"]')).toHaveCount(1);
});
