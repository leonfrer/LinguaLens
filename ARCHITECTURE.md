# Architecture

Reference map of LinguaLens structure, runtime boundaries, and end-to-end tests. Operational rules for agents live in `AGENTS.md`; read this file when changing layout, messaging, storage, or extension test harness behavior.

## Overview

LinguaLens is a Chrome Manifest V3 extension that translates selected text using AI. Stack:

- Vite, React, TypeScript, `@crxjs/vite-plugin`
- Vercel AI SDK against OpenAI-compatible providers
- Vitest (unit) and Playwright (extension e2e)

High-level flow:

1. Content script detects a selection, shows a shadow-DOM panel, and messages the background worker.
2. Background owns translation, save, content-settings fan-out, and toolbar icon state.
3. Popup / settings / saved pages manage UX and configuration; credentials never leave trusted extension contexts.

## Code Map

### UI pages (each has `main.tsx` and `styles.css`)

| Surface | Path | Notes |
| --- | --- | --- |
| Popup | `src/popup/` | Quick settings, recent items, links to full pages |
| Settings | `src/settings/` | Full configuration (provider, model, i18n, pronunciation) |
| Saved items | `src/saved/` | Browse saved items; `highlight.ts` marks the saved selection inside sentence context |

HTML entry shells: `index.html` (popup), `settings.html`, `saved.html`.

### Extension infrastructure

| Piece | Path | Role |
| --- | --- | --- |
| Content script entry | `src/content/selection.ts` | Manifest entry → `index.ts` (selection lifecycle), `selection-context.ts` (DOM sentence context), `panel.ts` (floating panel) |
| Background entry | `src/background/service-worker.ts` | Manifest entry → `index.ts` (routing), `action-icon.ts` (toolbar icon) |
| Manifest | `manifest.config.ts` | MV3 permissions, entries, locales |
| App constants | `src/config.ts` | Shared non-secret constants |
| Locales | `public/_locales/{en,zh_CN,zh_TW}/messages.json` | Chrome i18n message catalogs |

### Shared modules (`src/shared/`)

| Module | Responsibility |
| --- | --- |
| `types.ts` | Settings, credentials, content settings, saved items, message payloads |
| `storage.ts` | `chrome.storage.local` buckets + read/write helpers (see Storage below) |
| `translation.ts` | AI translation via Vercel AI SDK |
| `providers.ts` | Endpoint presets, base URLs, default models |
| `models.ts` | Fetch and normalize model lists from the configured provider |
| `text.ts` | Selection normalization and sentence context extraction |
| `i18n.ts`, `localization.ts`, `languages.ts` | Internationalization and locale switching |
| `pronunciation.ts` | Pronunciation preference defaults and normalization |
| `theme.ts`, `theme.css` | Light / dark / system theme |
| `ManagementHeader.tsx`, `ThemeSwitcher.tsx`, `management.css` | Shared management UI |

### Unit tests

Co-located `*.test.ts` under `src/shared/`, `src/background/`, and `src/saved/` (Vitest). Prefer pure modules for DOM-heavy parsing so logic stays unit-testable.

## Runtime boundaries (do not break)

- **Content script**: selection and panel UI only; never receives or stores API keys.
- **Background**: owns translation, save, content-settings fan-out, and action icon updates.
- **Messaging** (see `src/shared/types.ts`):
  - `LINGUALENS_TRANSLATE` — selected text (+ optional sentence context) → translation result
  - `LINGUALENS_SAVE_ITEM` — persist a saved item from the panel / UI
  - `LINGUALENS_GET_CONTENT_SETTINGS` — content-safe settings subset for the panel
- **Storage** (`src/shared/storage.ts`): four `chrome.storage.local` buckets (see below). Keep credentials out of content scripts, saved items, logs, errors, and any future export/share paths.
- **LLM**: OpenAI-compatible providers via Vercel AI SDK; presets live in `src/shared/providers.ts`.

## Messaging and storage sketch

```text
[Host page]
    selection / UI events
        → content script (panel only; no API keys)
            → LINGUALENS_TRANSLATE | LINGUALENS_SAVE_ITEM | LINGUALENS_GET_CONTENT_SETTINGS
                → background service worker
                    → storage (settings / credentials / contentSettings / savedItems)
                    → OpenAI-compatible provider (credentials only here)
        ← panel renders translation / errors (no secrets)

[popup | settings | saved]
    → chrome.storage / background as needed
    → credentials only in settings / background paths
```

### Storage buckets

| Key | Contents |
| --- | --- |
| `lingualens.settings` | Non-secret settings only (`StoredSettings` = `Settings` without `apiKey`) |
| `lingualens.credentials` | `{ apiKey }` only |
| `lingualens.contentSettings` | Derived content-safe subset published for the content script |
| `lingualens.savedItems` | Saved translations and metadata (never credentials) |

In-memory `Settings` still includes `apiKey` for settings UI convenience; `getSettings` / `updateSettings` merge and split credentials at the storage boundary. Legacy `apiKey` values left on the settings object are ignored on read.

`ContentSettings` is a safe subset of `Settings` (`appearance`, `interfaceLanguage`, `wordLookupEnabled`, `explanationLanguage`) for content-script use.

## E2E

Playwright loads the **built** extension from `dist/` (not the Vite dev server). `npm run test:e2e` runs `npm run build` then `playwright test`.

Config: `playwright.config.ts`  
- `testDir: ./e2e`  
- Loads `.env` / `.env.local` for optional live-provider keys  
- Screenshots, traces, and video retained on failure  

### Harness

| Path | Role |
| --- | --- |
| `e2e/fixtures/extension.ts` | Persistent Chromium context with `--load-extension=dist`; fixtures: `context`, `extensionId`, `extensionPath`, `popupPage`, `serviceWorker`; option `uiLocale` (default `en-US`) with Chrome locale seeding |
| `e2e/fixtures/helpers.ts` | Storage keys, `routeTestArticle` (stub page at `https://lingualens.test/article`), `selectArticleText` (selection inside `#article`, including multi-node / occurrence) |

Typical patterns:

- Open popup via `chrome-extension://${extensionId}/index.html` (`popupPage` fixture).
- Seed `chrome.storage.local` for settings / credentials / saved items in-page (`evaluate` + keys from helpers).
- Intercept network for mock providers; use `routeTestArticle` for content-script flows.
- Assert panel / popup / settings UI without logging or exposing API keys.

### Spec inventory

| Spec | Covers |
| --- | --- |
| `popup.spec.ts` | Popup load, quick settings persistence, open full settings |
| `settings.spec.ts` | Full settings UI, save/discard, presets, pronunciation reset, interface language preview |
| `appearance.spec.ts` | Theme across popup / management / content panel; system mode; keyboard menu |
| `i18n.spec.ts` | Chrome i18n runtime for popup and content panel (e.g. zh-CN) |
| `selection-panel.spec.ts` | Selection flow errors, word-lookup toggle, keyboard selection / dismiss |
| `sentence-context.spec.ts` | Sentence context with inline markup, repeated words, selection offset for highlight |
| `saved-items.spec.ts` | Popup saved list, saved page context/links, highlight behavior |
| `provider.spec.ts` | Mock OpenAI-compatible endpoint: model list, translate+save, errors without key leakage |
| `provider.live.spec.ts` | Optional real provider calls (skipped unless env key is set) |

### Mock vs live providers

- **Mock** (`provider.spec.ts`): Playwright route stubs; safe for default local runs and any future CI job that runs e2e (the tag/PR build workflow currently builds only); asserts errors never include the configured API key.
- **Live** (`provider.live.spec.ts`): currently NVIDIA NIM via:
  - `LINGUALENS_E2E_NVIDIA_API_KEY` (required to run; otherwise `test.skip`)
  - `LINGUALENS_E2E_NVIDIA_MODEL` (optional; default `meta/llama-3.1-8b-instruct`)  
  Keys may be placed in `.env` / `.env.local` (loaded by Playwright config). Never commit secrets.

### When to run

- After changes to extension loading, permissions, content scripts, background messaging, or multi-surface UI flows: `npm run test:e2e` in a full local environment (Chromium + built `dist/`).
- Headed / UI: `npm run test:e2e:headed`, `npm run test:e2e:ui`.
- Do not claim e2e passed if it was not run. Prefer the real machine over claiming CI-only success for extension loading issues.
