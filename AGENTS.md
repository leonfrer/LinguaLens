# AGENTS.md

## Project Overview

This is a Chrome extension for assisting foreign-language reading.

## Tech Stack

- Vite + React + TypeScript.
- Chrome extension Manifest V3 via `@crxjs/vite-plugin`.
- Main extension surfaces:
  - Popup UI: `src/popup/main.tsx` and `src/popup/styles.css`.
  - Content script: `src/content/index.ts`.
  - Background service worker: `src/background/index.ts`.
  - Manifest config: `manifest.config.ts`.

## Common Commands

- `npm run dev` starts the Vite/CRXJS development server.
- `npm run build` runs TypeScript checking and builds the extension into `dist/`.
- `npm run preview` previews the built Vite app.

## Commit Message Guidelines

- Use Conventional Commits style: `type(scope): summary`.
- Keep the summary imperative, concise, and under 72 characters when practical.
- Common types:
  - `feat`: user-facing feature or capability.
  - `fix`: bug fix.
  - `docs`: documentation-only change.
  - `style`: formatting or visual polish without behavior changes.
  - `refactor`: code restructuring without behavior changes.
  - `test`: test additions or updates.
  - `chore`: tooling, dependencies, generated setup, or maintenance.
- Use scopes that match project areas when helpful, such as `popup`, `content`, `background`, `manifest`, or `build`.
- Example: `feat(content): detect selected text on page`.

## Development Notes

- Always run `npm run build` before considering a code change complete.
- Prefer small unit tests for pure logic, especially text extraction, language detection, selection handling, message payload shaping, and settings helpers.
- Keep DOM-heavy content script behavior testable by moving pure parsing/transformation logic into separate modules, then test those modules outside the browser.
- Manually verify extension behavior in Chrome after changes that affect:
  - `manifest.config.ts`
  - content script injection
  - background service worker messaging
  - popup UI behavior
  - Chrome permissions
- For popup UI changes, test at the real extension popup size, not only in a full browser tab.
- For content-script changes, verify on a few different page types, including plain article pages, dynamic web apps, and pages with nested or unusual DOM structure.
