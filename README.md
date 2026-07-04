# LinguaLens

LinguaLens is a Chrome extension MVP for helping Chinese-speaking users read foreign-language web pages. Select text on a page, view a lightweight inline translation panel, and save useful words or phrases for later review in the extension popup.

## Current Status

The main MVP reading loop is in place:

- Detect selected text on web pages.
- Show an inline translation panel near the selection.
- Route translation and save requests through the background service worker.
- Save selected text, translation, source URL, source title, target language, and timestamp to `chrome.storage.local`.
- Review and delete recently saved items in the popup.
- Persist the target-language setting.

Translation currently uses a mock provider. Real translation provider integration is tracked in [GitHub issue #1](https://github.com/leonfrer/LinguaLens/issues/1).

The planned LLM integration should use Vercel AI SDK as the default TypeScript abstraction. The MVP should support a user-managed API key model: users enter their own provider API key in extension settings, the key is stored locally in Chrome extension storage, and saved reading items must never include the key. The UI should make clear that selected text and available sentence context are sent to the configured LLM provider and may consume the user's own API quota.

## Tech Stack

- Vite
- React
- TypeScript
- Chrome Extension Manifest V3
- `@crxjs/vite-plugin`
- Vitest

## Project Structure

```text
src/
  background/
    index.ts
    service-worker.ts
  content/
    index.ts
    selection.ts
  popup/
    main.tsx
    styles.css
  shared/
    storage.ts
    text.ts
    translation.ts
    types.ts
manifest.config.ts
TESTING.md
TODO.md
```

Key entry points:

- `src/content/index.ts`: content-script selection handling and inline panel UI.
- `src/background/index.ts`: message handling for translation and saving.
- `src/shared/translation.ts`: current mock translation provider boundary.
- `src/shared/storage.ts`: saved items and settings storage helpers.
- `src/popup/main.tsx`: popup UI for recent saved items and language settings.
- `manifest.config.ts`: Chrome extension manifest configuration.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Vite/CRXJS development server:

```bash
npm run dev
```

Then load the extension in Chrome using the development output path shown by the dev server.

## Available Scripts

```bash
npm run dev
```

Starts the Vite/CRXJS development server.

```bash
npm test
```

Runs Vitest unit tests.

```bash
npm run build
```

Runs TypeScript checking and builds the extension into `dist/`.

```bash
npm run preview
```

Previews the built Vite app.

## Loading The Extension In Chrome

For production-style verification:

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Load or refresh the unpacked extension from `dist/`.
5. Confirm Chrome shows no manifest or service-worker errors.
6. Test the popup at real extension popup size.
7. Test text selection on article-like pages and dynamic web apps.

See [TESTING.md](./TESTING.md) for the fuller verification checklist.

## Development Notes

- Keep DOM-heavy content-script behavior thin and move pure logic into `src/shared` where practical.
- Prefer small unit tests for text normalization, storage helpers, message payload shapes, settings, and translation boundary behavior.
- Use Vercel AI SDK as the default library for LLM-backed translation and explanation calls.
- Treat user-provided LLM API keys as sensitive local settings: never hard-code them, commit them, include them in saved items or exports, show them outside settings, include them in errors, or log them.
- Run `npm run build` before considering code changes complete.
- Manually verify in Chrome after changes to manifest config, permissions, content-script injection, background messaging, popup behavior, or storage behavior.

## Roadmap

- Integrate a real LLM-backed translation provider with Vercel AI SDK.
- Add user-managed LLM provider, model, and API key settings.
- Add user-facing error behavior for translation failures.
- Decide whether saved-item storage should enforce a maximum item count.
