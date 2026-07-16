import { expect, test } from './fixtures/extension';

test('loads the extension popup', async ({ extensionId, popupPage }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
  expect(popupPage.url()).toBe(`chrome-extension://${extensionId}/index.html`);

  await expect(popupPage.getByRole('heading', { name: 'LinguaLens' })).toBeVisible();
  await expect(popupPage.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(popupPage.getByText('Current configuration')).toBeVisible();
  await expect(popupPage.getByRole('checkbox', { name: /Selection lookup/ })).toBeChecked();
  await expect(
    popupPage.getByRole('checkbox', { name: 'Pronunciation lookup' })
  ).not.toBeChecked();
  await expect(popupPage.getByText('简体中文')).toBeVisible();
  await expect(popupPage.getByText('NVIDIA NIM')).toBeVisible();
  await expect(popupPage.getByText('meta/llama-3.1-8b-instruct')).toBeVisible();
  await expect(popupPage.getByText('Not configured', { exact: true })).toBeVisible();
  await expect(
    popupPage.getByText('Add an API key, then select text on a web page to translate and save it.')
  ).toBeVisible();
  await expect(popupPage.locator('[aria-label="Recently saved items"]')).toHaveCount(1);
});

test('enables pronunciation lookup and persists the choice', async ({ popupPage }) => {
  const pronunciationToggle = popupPage.getByRole('checkbox', {
    name: 'Pronunciation lookup'
  });
  await pronunciationToggle.check();
  await expect(pronunciationToggle).toBeChecked();

  await popupPage.reload();
  await expect(
    popupPage.getByRole('checkbox', { name: 'Pronunciation lookup' })
  ).toBeChecked();
});

test('edits popup settings', async ({ popupPage }) => {
  await popupPage.getByRole('button', { name: 'Settings' }).click();
  await expect(popupPage.getByText('Edit configuration')).toBeVisible();

  const languageSelect = popupPage.getByLabel('Explanation language');
  const endpointSelect = popupPage.getByLabel('Endpoint');
  const baseUrlInput = popupPage.getByLabel('Base URL');
  const modelSelect = popupPage.locator('.settingsGrid select');
  const apiKeyInput = popupPage.getByLabel('API key');

  await expect(languageSelect).toHaveValue('zh-CN');
  await expect(endpointSelect).toHaveValue('nvidia');
  await expect(baseUrlInput).toHaveValue('https://integrate.api.nvidia.com/v1');
  await expect(baseUrlInput).toBeDisabled();
  await expect(modelSelect).toHaveValue('meta/llama-3.1-8b-instruct');
  await expect(apiKeyInput).toHaveValue('');

  await languageSelect.selectOption('en');
  await apiKeyInput.fill('test-api-key');
  await popupPage.getByRole('button', { name: 'Save' }).click();

  await expect(popupPage.getByText('Current configuration')).toBeVisible();
  await expect(popupPage.getByText('English')).toBeVisible();
  await expect(popupPage.getByText('NVIDIA NIM')).toBeVisible();
  await expect(popupPage.getByText('meta/llama-3.1-8b-instruct')).toBeVisible();
  await expect(popupPage.getByText('Configured', { exact: true })).toBeVisible();
});

test('switches endpoint presets and persists a custom endpoint', async ({ popupPage }) => {
  await popupPage.getByRole('button', { name: 'Settings' }).click();

  const endpointSelect = popupPage.getByLabel('Endpoint');
  const baseUrlInput = popupPage.getByLabel('Base URL');
  const modelInput = popupPage.getByLabel('Manual model ID');
  const loadModelsButton = popupPage.getByRole('button', { name: 'Load models' });

  const presetExpectations = [
    ['openai', 'https://api.openai.com/v1', 'gpt-4o-mini'],
    ['openrouter', 'https://openrouter.ai/api/v1', 'openai/gpt-4o-mini'],
    ['groq', 'https://api.groq.com/openai/v1', 'llama-3.1-8b-instant'],
    ['deepinfra', 'https://api.deepinfra.com/v1/openai', 'meta-llama/Meta-Llama-3.1-8B-Instruct'],
    ['together', 'https://api.together.xyz/v1', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'],
    ['local', 'http://localhost:1234/v1', 'local-model'],
    ['ollama', 'http://localhost:11434/v1', 'llama3.1']
  ] as const;

  for (const [preset, baseUrl, model] of presetExpectations) {
    await endpointSelect.selectOption(preset);
    await expect(baseUrlInput).toHaveValue(baseUrl);
    await expect(baseUrlInput).toBeDisabled();
    await expect(modelInput).toHaveValue(model);
  }

  await endpointSelect.selectOption('custom');
  await expect(baseUrlInput).toBeEnabled();
  await expect(baseUrlInput).toHaveValue('');
  await expect(modelInput).toHaveValue('');
  await expect(loadModelsButton).toBeDisabled();

  await baseUrlInput.fill(' https://api.example.test/v1/ ');
  await modelInput.fill('example-model');
  await popupPage.getByLabel('API key').fill('custom-endpoint-key');
  await expect(loadModelsButton).toBeEnabled();
  await popupPage.getByRole('button', { name: 'Save' }).click();

  await expect(popupPage.getByText('https://api.example.test/v1', { exact: true })).toHaveCount(2);
  await expect(popupPage.getByText('example-model', { exact: true })).toBeVisible();
  await expect(popupPage.getByText('custom-endpoint-key')).toHaveCount(0);

  await popupPage.reload();
  await popupPage.getByRole('button', { name: 'Settings' }).click();
  await expect(popupPage.getByLabel('Endpoint')).toHaveValue('custom');
  await expect(popupPage.getByLabel('Base URL')).toHaveValue('https://api.example.test/v1');
  await expect(popupPage.getByLabel('Manual model ID')).toHaveValue('example-model');
});

test('persists popup settings after reopening the popup', async ({ context, extensionId, popupPage }) => {
  await popupPage.getByRole('button', { name: 'Settings' }).click();
  await popupPage.getByLabel('Explanation language').selectOption('ja');
  await popupPage.getByLabel('Manual model ID').fill('custom-e2e-model');
  await popupPage.getByLabel('API key').fill('persisted-e2e-key');
  await popupPage.getByRole('button', { name: 'Save' }).click();

  await expect(popupPage.getByText('日本語')).toBeVisible();
  await expect(popupPage.getByText('custom-e2e-model')).toBeVisible();
  await expect(popupPage.getByText('persisted-e2e-key')).toHaveCount(0);

  await popupPage.close();
  const reopenedPopupPage = await context.newPage();
  await reopenedPopupPage.goto(`chrome-extension://${extensionId}/index.html`);

  await expect(reopenedPopupPage.getByText('日本語')).toBeVisible();
  await expect(reopenedPopupPage.getByText('custom-e2e-model')).toBeVisible();
  await expect(reopenedPopupPage.getByText('Configured', { exact: true })).toBeVisible();
  await expect(reopenedPopupPage.getByText('persisted-e2e-key')).toHaveCount(0);
  await reopenedPopupPage.close();
});

test('cancels popup settings edits and updates the API key alert state', async ({ popupPage }) => {
  await expect(popupPage.locator('[aria-label="API key is not configured"]')).toBeVisible();

  await popupPage.getByRole('button', { name: 'Settings' }).click();
  await popupPage.getByLabel('Explanation language').selectOption('en');
  await popupPage.getByLabel('API key').fill('discarded-test-key');
  await popupPage.getByRole('button', { name: 'Cancel' }).click();

  await expect(popupPage.getByText('Current configuration')).toBeVisible();
  await expect(popupPage.getByText('简体中文')).toBeVisible();
  await expect(popupPage.getByText('NVIDIA NIM')).toBeVisible();
  await expect(popupPage.getByText('meta/llama-3.1-8b-instruct')).toBeVisible();
  await expect(popupPage.getByText('Not configured', { exact: true })).toBeVisible();
  await expect(popupPage.locator('[aria-label="API key is not configured"]')).toBeVisible();

  await popupPage.getByRole('button', { name: 'Settings' }).click();
  await popupPage.getByLabel('API key').fill('saved-test-key');
  await popupPage.getByRole('button', { name: 'Save' }).click();

  await expect(popupPage.getByText('Configured', { exact: true })).toBeVisible();
  await expect(popupPage.locator('[aria-label="API key is not configured"]')).toHaveCount(0);
  await expect(popupPage.getByText('saved-test-key')).toHaveCount(0);
});
