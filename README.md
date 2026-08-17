# LinguaLens

LinguaLens is a Chrome extension for reading foreign-language web pages. Select text to see an inline translation and optional pronunciation, then save useful words or phrases for later review.

## Features

- Translate and explain selected text with its sentence context.
- Optionally include pronunciation with configurable notation preferences.
- Save translations, context, pronunciation, source details, and model metadata locally.
- Review recent items in the popup or browse all saved items on a dedicated page.
- Switch word lookup and pronunciation lookup from the popup.
- Toggle word lookup with a keyboard shortcut (default `Alt+L` / macOS `⌥L`; shown in the popup and settings; change under `chrome://extensions/shortcuts`).
- Choose light, dark, or system appearance.
- Use the interface in English, Simplified Chinese, Traditional Chinese, or the system language.
- Configure an OpenAI-compatible service, model, and user-managed API key on a dedicated settings page.

Supported endpoint presets include NVIDIA NIM, OpenAI, OpenRouter, Groq, DeepInfra, Together AI, LM Studio, and Ollama. A custom OpenAI-compatible endpoint can also be used.

Settings, credentials, a content-script settings subset, and saved items are stored locally with `chrome.storage.local`. API keys are persisted without application-level encryption, restricted to trusted extension contexts, and never exposed to content scripts, synced, or included in saved items. Selected text and available sentence context are sent to the configured service and may consume the user's API quota.

### Keyboard shortcuts

| Command | Default | Purpose |
| --- | --- | --- |
| Toggle selection lookup | `Alt+L` (macOS: `⌥L`) | Flip word lookup on/off (toolbar icon updates; open selection panel closes when turning off) |

The popup and settings pages show the **currently assigned** combo (as reported by Chrome) and link to `chrome://extensions/shortcuts` to change it. If the default conflicts with another extension or was cleared, assign one there. Chrome may keep a previous empty binding when reloading an unpacked extension; re-assign or remove/re-add the extension if the default does not appear.

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
| `npm run icons` | Run `scripts/rasterize-icons.mjs`: copy the rounded preview SVG to `public/icons/icon.svg` and rasterize toolbar/store PNGs (`icon{16,32,48,128}.png` plus `-disabled`). Needs Playwright Chromium and Python 3 + Pillow. |

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — code map, runtime boundaries, messaging/storage, and e2e inventory.
- [`AGENTS.md`](./AGENTS.md) — contributor and coding-agent conventions.
