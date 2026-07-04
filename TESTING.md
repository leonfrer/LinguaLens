# TESTING.md

## Purpose

This project is a Chrome extension, so a completed change needs both automated checks and real Chrome verification. Use this document as the default checklist before considering feature work complete.

## Fast Checks

Run these after code changes:

```bash
npm test
npm run build
```

- `npm test` runs focused unit tests for pure logic.
- `npm run build` runs TypeScript checking and builds the extension into `dist/`.

## Playwright Extension Checks

Run the standardized browser smoke tests after building the extension:

```bash
npm run build
npm run test:e2e
```

- `npm run test:e2e` launches a persistent Playwright Chromium context with the built extension from `dist/`.
- `npm run test:e2e:headed` forces a headed browser run for local debugging.
- `npm run test:e2e:ui` opens the Playwright UI runner.
- Run `npx playwright install chromium` once after installing Playwright dependencies.
- Google Chrome and Microsoft Edge do not support the side-loading flags needed by this automated flow.

## Development Verification

Use the Vite/CRXJS dev server while iterating:

```bash
npm run dev
```

Then load the extension in Chrome from the development output shown by the dev server. Use this mode for fast popup and content-script iteration.

## Production Extension Verification

Use this flow before treating extension behavior as complete:

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Load or refresh the unpacked extension from `dist/`.
5. Confirm the extension appears without manifest or service-worker errors.
6. Click the extension action and verify the popup at real popup size.
7. Open at least one article-like page and one dynamic web app page.
8. Verify content-script behavior on each page.

## MVP Manual Checklist

Use this checklist as features land:

- Popup opens and renders without console errors.
- Content script injects on expected pages.
- Selecting text detects the intended selection only.
- Floating translation panel appears near the selected text.
- Translation requests go through the background message API.
- Save action persists the item to `chrome.storage.local`.
- Saved item includes source URL, page title, original text, translation, explanation language, sentence context when available, provider/model metadata, and timestamp.
- Popup displays recent saved items.
- Popup deletion removes the saved item and updates the UI.
- Explanation-language setting persists and affects later translation requests.
- API key and model settings persist, and the API key never appears in saved items or non-settings UI.
- Popup settings show a compact summary by default, with provider/model/explanation language visible and API key shown only as configured or unconfigured.
- Popup settings show a bright red dot on the settings button when no API key is configured, and hide it after a key is saved.
- Popup settings edits stay local until Save is clicked; Cancel discards changed provider, model, explanation language, and API key values.
- Popup settings remain correct after closing and reopening the popup, and after refreshing the unpacked extension.

## Unit Test Scope

Keep browser-heavy behavior thin and move pure logic into modules that can be tested with Vitest. Prioritize tests for:

- Text extraction, trimming, and normalization.
- Selection payload shaping.
- Message request and response shapes.
- Translation provider boundary behavior.
- Saved-item creation and validation.
- Settings defaults and updates.

## When To Use Real Chrome Verification

Use real Chrome verification whenever a change depends on Chrome extension runtime behavior that unit tests or a normal Vite page cannot faithfully cover. This includes changes to:

- `manifest.config.ts`, extension permissions, host permissions, action config, or content-script match patterns.
- Content-script injection, selection handling, DOM positioning, overlays, or behavior on third-party pages.
- Background service-worker startup, message routing, `chrome.runtime` APIs, alarms, or lifecycle-sensitive behavior.
- Popup UI behavior at the real extension popup size.
- `chrome.storage`, saved settings, persisted items, or migration/default handling.
- Cross-surface flows where popup, content script, and background code need to work together.

Real Chrome verification is also required after fixing a bug that only appears in Chrome, after changing build or extension packaging behavior, or before marking a user-facing extension workflow complete.

## How To Test In Real Chrome

Use the development flow for quick iteration:

1. Run `npm run dev`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Load or refresh the unpacked extension from the dev output path shown by Vite/CRXJS.
5. Exercise the changed popup, content-script, or background behavior in Chrome.

Use the production flow before considering extension behavior complete:

1. Run `npm test`.
2. Run `npm run build`.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Load or refresh the unpacked extension from `dist/`.
6. Confirm Chrome shows no manifest, permission, or service-worker errors.
7. Open the popup from the extension action and verify it at real popup size.
8. Test content-script behavior on at least one article-like page and one dynamic web app page.
9. Check the relevant Chrome DevTools consoles: popup, page/content script, and service worker.
10. For storage or settings changes, reload Chrome pages and the extension, then confirm the persisted state still behaves correctly.
11. For popup settings changes, verify Save persists edits, Cancel discards edits, and the API key is never displayed outside the password input while editing.

When using Codex to perform this verification, ask it to enter the local Chrome browser, load or refresh the unpacked extension, run the workflow, and report the observed result. If the test depends on a logged-in page or private browser state, keep that state in your own Chrome profile and tell Codex when the page is ready.
