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

export const test = base.extend<ExtensionFixtures>({
  extensionPath: async ({}, use) => {
    await use(path.join(process.cwd(), 'dist'));
  },

  context: async ({ extensionPath, headless }, use, testInfo) => {
    const userDataDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `lingualens-e2e-${testInfo.workerIndex}-`)
    );

    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless,
      args: [
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
