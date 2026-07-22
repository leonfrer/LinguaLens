# LinguaLens

LinguaLens is a Chrome extension for reading foreign-language web pages. Select text to see an inline translation and optional pronunciation, then save useful words or phrases for later review.

## Features

- Translate and explain selected text with its sentence context.
- Optionally include pronunciation with configurable notation preferences.
- Save translations, context, pronunciation, source details, and model metadata locally.
- Review recent items in the popup or browse all saved items on a dedicated page.
- Switch word lookup and pronunciation lookup from the popup.
- Choose light, dark, or system appearance.
- Use the interface in English, Simplified Chinese, Traditional Chinese, or the system language.
- Configure an OpenAI-compatible service, model, and user-managed API key on a dedicated settings page.

Supported endpoint presets include NVIDIA NIM, OpenAI, OpenRouter, Groq, DeepInfra, Together AI, LM Studio, and Ollama. A custom OpenAI-compatible endpoint can also be used.

Settings and saved items are stored in `chrome.storage.local`. API keys are never included in saved items. Selected text and available sentence context are sent to the configured service and may consume the user's API quota.

## Tech Stack

- Vite, React, and TypeScript
- Chrome Extension Manifest V3 with `@crxjs/vite-plugin`
- Vercel AI SDK
- Vitest and Playwright

## Getting Started

```bash
npm install
npm run dev
```

Load the development output path shown by Vite in `chrome://extensions` with Developer mode enabled.

For a production build:

```bash
npm run build
```

Load or refresh the unpacked extension from `dist/`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite/CRXJS development server. |
| `npm run build` | Type-check and build into `dist/`. |
| `npm test` | Run Vitest unit tests. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:e2e` | Build and run Playwright extension tests. |
| `npm run test:e2e:headed` | Run extension tests in a headed browser. |
| `npm run test:e2e:ui` | Open the Playwright test UI. |
| `npm run preview` | Preview the production build. |
