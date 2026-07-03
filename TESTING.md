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
- Saved item includes source URL, page title, original text, translation, target language, and timestamp.
- Popup displays recent saved items.
- Popup deletion removes the saved item and updates the UI.
- Target-language setting persists and affects later translation requests.

## Unit Test Scope

Keep browser-heavy behavior thin and move pure logic into modules that can be tested with Vitest. Prioritize tests for:

- Text extraction, trimming, and normalization.
- Selection payload shaping.
- Message request and response shapes.
- Translation provider boundary behavior.
- Saved-item creation and validation.
- Settings defaults and updates.

## Chrome Verification Notes

For changes affecting `manifest.config.ts`, content-script injection, background messaging, popup behavior, or Chrome permissions, verify in the real browser after `npm run build`.
