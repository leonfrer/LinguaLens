import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  extensionPath: string;
  popupPage: Page;
  serviceWorker: Worker;
};

type ExtensionOptions = {
  uiLocale: string;
};

async function seedChromeLocalePreferences(userDataDir: string, uiLocale: string): Promise<void> {
  await fs.mkdir(path.join(userDataDir, 'Default'), { recursive: true });
  await fs.writeFile(
    path.join(userDataDir, 'Local State'),
    JSON.stringify({
      intl: {
        app_locale: uiLocale
      }
    })
  );
  await fs.writeFile(
    path.join(userDataDir, 'Default', 'Preferences'),
    JSON.stringify({
      intl: {
        accept_languages: uiLocale
      }
    })
  );
}

export const test = base.extend<ExtensionFixtures, ExtensionOptions>({
  uiLocale: ['en-US', { option: true }],

  extensionPath: async ({}, use) => {
    await use(path.join(process.cwd(), 'dist'));
  },

  context: async ({ extensionPath, headless, uiLocale }, use, testInfo) => {
    const userDataDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `lingualens-e2e-${testInfo.workerIndex}-`)
    );
    await seedChromeLocalePreferences(userDataDir, uiLocale);

    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless,
      locale: uiLocale,
      args: [
        `--lang=${uiLocale}`,
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    await use(context);

    await context.close();
    await fs.rm(userDataDir, { force: true, recursive: true });
  },

  serviceWorker: async ({ context }, use) => {
    const existingServiceWorker = context.serviceWorkers()[0];
    const serviceWorker = existingServiceWorker ?? (await context.waitForEvent('serviceworker'));

    await use(serviceWorker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    const extensionUrl = new URL(serviceWorker.url());

    await use(extensionUrl.hostname);
  },

  popupPage: async ({ context, extensionId }, use) => {
    const popupPage = await context.newPage();

    await popupPage.goto(`chrome-extension://${extensionId}/index.html`);
    await use(popupPage);
    await popupPage.close();
  }
});

export { expect } from '@playwright/test';
