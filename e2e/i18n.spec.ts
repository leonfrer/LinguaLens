import { expect, test } from './fixtures/extension';
import {
  routeTestArticle,
  selectArticleText,
  settingsStorageKey,
  testArticleUrl
} from './fixtures/helpers';

test.describe('localized Chrome i18n runtime', () => {
  test.use({ uiLocale: 'zh-CN' });

  test('localizes popup and content panel for Simplified Chinese', async ({
    context,
    popupPage
  }) => {
    await popupPage.evaluate(async ([settingsKey]) => {
      await chrome.storage.local.remove(settingsKey);
    }, [settingsStorageKey]);
    await popupPage.reload();

    await expect(popupPage.getByRole('heading', { name: '快捷设置' })).toBeVisible();
    await expect(popupPage.getByRole('checkbox', { name: /划词查询/ })).toBeChecked();
    await expect(popupPage.getByLabel('解释语言')).toHaveValue('zh-CN');
    await expect(popupPage.getByText('配置 AI 服务', { exact: true })).toBeVisible();
    await expect(
      popupPage.getByText('配置 API 密钥后，在网页中选中文本即可翻译并保存。')
    ).toBeVisible();
    await expect(popupPage.locator('[aria-label="最近保存的内容"]')).toHaveCount(1);

    const settingsPagePromise = context.waitForEvent('page');
    await popupPage.getByRole('link', { name: '打开设置' }).click();
    const settingsPage = await settingsPagePromise;
    await settingsPage.waitForLoadState();

    await expect(settingsPage.getByRole('heading', { name: '设置', level: 1 })).toBeVisible();
    await expect(settingsPage.getByRole('heading', { name: '阅读偏好' })).toBeVisible();
    await expect(settingsPage.getByLabel('Base URL')).toHaveValue(
      'https://integrate.api.nvidia.com/v1'
    );
    await expect(settingsPage.getByLabel('Base URL')).toBeDisabled();
    await expect(settingsPage.getByLabel('API 密钥')).toHaveAttribute(
      'placeholder',
      '服务商 API 密钥'
    );
    await settingsPage.close();

    await routeTestArticle(context);
    const page = await context.newPage();
    await page.goto(testArticleUrl);
    await page.locator('#article').waitFor();
    await selectArticleText(page, 'foreign-language reading');

    const panel = page.locator('#lingualens-selection-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('foreign-language reading')).toBeVisible();
    await expect(panel.getByText('请先在 LinguaLens 设置中添加 LLM API 密钥再翻译。')).toBeVisible();
    await expect(panel.getByRole('button', { name: '保存' })).toBeDisabled();
    await page.close();
  });
});
