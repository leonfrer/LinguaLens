import { expect, test } from './fixtures/extension';

test('shows all settings and links back to saved items', async ({ context, extensionId }) => {
  const settingsPage = await context.newPage();
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);

  await expect(settingsPage.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(settingsPage.getByRole('heading', { name: 'Reading preferences' })).toBeVisible();
  await expect(settingsPage.getByRole('heading', { name: 'AI service' })).toBeVisible();
  await expect(settingsPage.getByRole('checkbox', { name: 'Selection lookup' })).toBeChecked();
  await expect(
    settingsPage.getByRole('checkbox', { name: 'Pronunciation lookup' })
  ).not.toBeChecked();
  await expect(
    settingsPage.getByRole('heading', { name: 'Pronunciation notation preferences' })
  ).toHaveCount(0);
  await expect(
    settingsPage.getByRole('checkbox', { name: 'Skip pronunciation for long text' })
  ).toHaveCount(0);
  await expect(settingsPage.getByLabel('Explanation language')).toHaveValue('zh-CN');
  await expect(settingsPage.getByLabel('Endpoint')).toHaveValue('nvidia');
  await expect(settingsPage.getByLabel('Base URL')).toHaveValue(
    'https://integrate.api.nvidia.com/v1'
  );
  await expect(settingsPage.getByLabel('Base URL')).toBeDisabled();
  await expect(settingsPage.getByLabel('Manual model ID')).toHaveValue(
    'meta/llama-3.1-8b-instruct'
  );
  await expect(settingsPage.getByText('Set up AI service')).toBeVisible();

  await settingsPage.getByRole('link', { name: 'Saved items' }).click();
  await expect(settingsPage).toHaveURL(`chrome-extension://${extensionId}/saved.html`);
  await expect(settingsPage.getByRole('heading', { name: 'Saved items', level: 1 })).toBeVisible();
  await expect(settingsPage.getByRole('link', { name: 'Settings' })).toBeVisible();
  await settingsPage.close();
});
test('saves reading and AI service settings', async ({ context, extensionId }) => {
  const settingsPage = await context.newPage();
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);

  await settingsPage.getByRole('checkbox', { name: 'Pronunciation lookup' }).check();
  const skipLongTextPronunciation = settingsPage.getByRole('checkbox', {
    name: 'Skip pronunciation for long text'
  });
  await expect(skipLongTextPronunciation).toBeChecked();
  await expect(
    settingsPage.getByText(
      'Definitions vary by model, so this setting may not always take effect.'
    )
  ).toBeVisible();
  await skipLongTextPronunciation.uncheck();
  await expect(settingsPage.locator('.preferenceRow')).toHaveCount(4);
  await expect(settingsPage.getByLabel('Language: 1')).toHaveValue('English');
  await expect(settingsPage.getByLabel('Pronunciation notation: 1')).toHaveValue('IPA');
  await expect(settingsPage.getByLabel('Pronunciation notation: 1')).toHaveAttribute(
    'list',
    'pronunciation-notation-options-1'
  );
  expect(
    await settingsPage
      .locator('#pronunciation-notation-options-1 option')
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value)
      )
  ).toEqual(['IPA', 'KK']);
  await expect(settingsPage.getByLabel('Language: 2')).toHaveValue('Japanese');
  await expect(settingsPage.getByLabel('Pronunciation notation: 2')).toHaveValue('Kana');
  await expect(settingsPage.getByText('Auto', { exact: true })).toHaveCount(0);

  await settingsPage.getByLabel('Pronunciation notation: 1').fill('Custom English Notation');
  await settingsPage.getByRole('checkbox', { name: 'Enabled: Japanese' }).uncheck();
  await settingsPage.getByRole('button', { name: 'Remove: Korean' }).click();
  await settingsPage.getByRole('button', { name: 'Add notation' }).click();
  await settingsPage.getByLabel('Language: 4').fill('Cantonese');
  await expect(settingsPage.getByLabel('Pronunciation notation: 4')).not.toHaveAttribute('list');
  await settingsPage.getByLabel('Pronunciation notation: 4').fill('Jyutping');
  await settingsPage.getByLabel('Explanation language').selectOption('en');
  await settingsPage.getByLabel('API key').fill('test-api-key');
  await settingsPage.getByRole('button', { name: 'Save changes' }).click();

  await expect(settingsPage.getByText('Settings saved')).toBeVisible();
  await expect(settingsPage.getByText('AI service configured')).toBeVisible();
  await expect(settingsPage.getByText('test-api-key')).toHaveCount(0);

  await settingsPage.reload();
  await expect(
    settingsPage.getByRole('checkbox', { name: 'Pronunciation lookup' })
  ).toBeChecked();
  await expect(
    settingsPage.getByRole('checkbox', { name: 'Skip pronunciation for long text' })
  ).not.toBeChecked();
  await expect(settingsPage.locator('.preferenceRow')).toHaveCount(4);
  await expect(settingsPage.getByLabel('Pronunciation notation: 1')).toHaveValue(
    'Custom English Notation'
  );
  await expect(settingsPage.getByRole('checkbox', { name: 'Enabled: Japanese' })).not.toBeChecked();
  await expect(settingsPage.getByRole('button', { name: 'Remove: Korean' })).toHaveCount(0);
  await expect(settingsPage.getByLabel('Language: 4')).toHaveValue('Cantonese');
  await expect(settingsPage.getByLabel('Pronunciation notation: 4')).toHaveValue('Jyutping');
  await expect(settingsPage.getByLabel('Explanation language')).toHaveValue('en');
  await expect(settingsPage.getByLabel('API key')).toHaveValue('test-api-key');
  await settingsPage.close();
});

test('restores pronunciation defaults only after confirmation', async ({
  context,
  extensionId
}) => {
  const settingsPage = await context.newPage();
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);
  await settingsPage.getByRole('checkbox', { name: 'Pronunciation lookup' }).check();
  await settingsPage.getByLabel('Pronunciation notation: 1').fill('KK');
  await settingsPage.getByRole('button', { name: 'Remove: Chinese' }).click();

  settingsPage.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Restore the default pronunciation notation preferences?');
    await dialog.dismiss();
  });
  await settingsPage.getByRole('button', { name: 'Restore defaults' }).click();
  await expect(settingsPage.getByLabel('Pronunciation notation: 1')).toHaveValue('KK');
  await expect(settingsPage.locator('.preferenceRow')).toHaveCount(3);

  settingsPage.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await settingsPage.getByRole('button', { name: 'Restore defaults' }).click();
  await expect(settingsPage.locator('.preferenceRow')).toHaveCount(4);
  await expect(settingsPage.getByLabel('Pronunciation notation: 1')).toHaveValue('IPA');
  await expect(settingsPage.getByLabel('Language: 3')).toHaveValue('Chinese');
  await expect(settingsPage.getByRole('checkbox', { name: 'Enabled: Japanese' })).toBeChecked();
  await settingsPage.close();
});

test('switches endpoint presets and persists a custom endpoint', async ({ context, extensionId }) => {
  const settingsPage = await context.newPage();
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);

  const endpointSelect = settingsPage.getByLabel('Endpoint');
  const baseUrlInput = settingsPage.getByLabel('Base URL');
  const modelInput = settingsPage.getByLabel('Manual model ID');
  const loadModelsButton = settingsPage.getByRole('button', { name: 'Load models' });

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
  await settingsPage.getByLabel('API key').fill('custom-endpoint-key');
  await expect(loadModelsButton).toBeEnabled();
  await settingsPage.getByRole('button', { name: 'Save changes' }).click();

  await settingsPage.reload();
  await expect(settingsPage.getByLabel('Endpoint')).toHaveValue('custom');
  await expect(settingsPage.getByLabel('Base URL')).toHaveValue('https://api.example.test/v1');
  await expect(settingsPage.getByLabel('Manual model ID')).toHaveValue('example-model');
  await settingsPage.close();
});

test('discards unsaved changes', async ({ context, extensionId }) => {
  const settingsPage = await context.newPage();
  await settingsPage.goto(`chrome-extension://${extensionId}/settings.html`);

  await settingsPage.getByLabel('Explanation language').selectOption('ja');
  await settingsPage.getByLabel('API key').fill('discarded-test-key');
  await settingsPage.getByRole('button', { name: 'Cancel' }).click();

  await expect(settingsPage.getByLabel('Explanation language')).toHaveValue('zh-CN');
  await expect(settingsPage.getByLabel('API key')).toHaveValue('');
  await expect(settingsPage.getByText('Set up AI service')).toBeVisible();
  await settingsPage.close();
});
