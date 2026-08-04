import { expect, test } from './fixtures/extension';
import {
  mockTranslationEndpoint,
  routeTestArticle,
  seedExtensionSettings,
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

test('supports keyboard selection, close, invalid selection, and stay-on-scroll', async ({
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
  await expect(panel).toBeVisible();
  await expect(panel.getByText('selected text')).toBeVisible();
  await page.close();
});

test('opens the panel above a selection near the viewport bottom', async ({ context }) => {
  await routeTestArticle(context, {
    body: `
      <span id="top-line">top anchor text for spacing</span>
      <div style="height: 85vh"></div>
      <span id="bottom-target">bottom-edge lookup phrase</span>
    `
  });

  const page = await context.newPage();
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto(testArticleUrl);
  await page.locator('#bottom-target').waitFor();
  await page.locator('#bottom-target').scrollIntoViewIfNeeded();
  await selectArticleText(page, 'bottom-edge lookup phrase');

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('bottom-edge lookup phrase')).toBeVisible();

  const geometry = await page.evaluate(() => {
    const host = document.querySelector('#lingualens-selection-panel');
    const target = document.querySelector('#bottom-target');
    if (!(host instanceof HTMLElement) || !(target instanceof HTMLElement)) {
      return null;
    }

    const panelRect = host.getBoundingClientRect();
    const selectionRect = target.getBoundingClientRect();
    return {
      panelTop: panelRect.top,
      panelBottom: panelRect.bottom,
      panelLeft: panelRect.left,
      panelRight: panelRect.right,
      selectionTop: selectionRect.top,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry!.panelBottom).toBeLessThanOrEqual(geometry!.selectionTop + 1);
  expect(geometry!.panelTop).toBeGreaterThanOrEqual(0);
  expect(geometry!.panelBottom).toBeLessThanOrEqual(geometry!.viewportHeight);
  expect(geometry!.panelLeft).toBeGreaterThanOrEqual(0);
  expect(geometry!.panelRight).toBeLessThanOrEqual(geometry!.viewportWidth);
  await expect(panel.getByRole('button', { name: 'Close' })).toBeVisible();
  await page.close();
});

test('does not re-translate when a click keeps the same selection', async ({
  context,
  popupPage
}) => {
  const mockBaseUrl = 'https://translation.example.test/v1';
  const mockModel = 'mock-stable-selection-model';
  await seedExtensionSettings(popupPage, {
    apiKey: 'mocked-selection-key',
    endpointPreset: 'custom',
    baseUrl: mockBaseUrl,
    model: mockModel
  });
  const mock = await mockTranslationEndpoint(context, {
    url: `${mockBaseUrl}/chat/completions`,
    translation: '外语阅读',
    model: mockModel
  });

  await routeTestArticle(context);
  const page = await context.newPage();
  await page.goto(testArticleUrl);
  await page.locator('#article').waitFor();
  await selectArticleText(page, 'foreign-language reading');

  const panel = page.locator('#lingualens-selection-panel');
  await expect(panel.getByText('外语阅读')).toBeVisible();
  await expect.poll(() => mock.getRequestBodies().length).toBe(1);

  // Simulate a page click that leaves the selection intact (common on some sites).
  await page.evaluate(() => {
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
    document.dispatchEvent(new Event('selectionchange'));
  });

  // Debounce is 160ms; wait long enough that a duplicate would have been sent.
  await page.waitForTimeout(400);
  expect(mock.getRequestBodies()).toHaveLength(1);
  await expect(panel.getByText('外语阅读')).toBeVisible();
  await expect(panel.getByText('Generating translation')).toHaveCount(0);

  await page.close();
});
