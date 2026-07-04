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

## Execution Environment Notes

- Do not run dependency installation commands such as `npm install`, `npm ci`, or `npx playwright install` in the sandbox. These commands require the real local environment because they access the network, npm caches, and tool-managed browser/dependency directories.
- Do not run GitHub remote operations such as creating pull requests, pushing branches, or checking GitHub authentication in the sandbox. Use the real local environment or the configured GitHub connector for these operations.

## Branch Naming

- When creating branches, do not use the default `codex/*` prefix. Use a meaningful branch name that always includes an explicit prefix, such as `docs/update-agents-md`, `feat/selection-popup`, or `fix/background-message-handling`.

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
- Use Vercel AI SDK as the default abstraction for LLM-backed translation and explanation calls.
- Implement the MVP with a user-managed API key model: users provide their own LLM provider API key in extension settings.
- Treat user-provided API keys as sensitive local settings. Never hard-code keys, commit keys, include keys in saved items or exports, show keys outside settings, include keys in errors, or log keys.
- Keep the MVP provider/model settings minimal: start with one default provider/model path and expand only when the provider boundary and popup UI can stay simple.
- Avoid adding heavier orchestration or gateway frameworks such as LangChain or LiteLLM unless the project explicitly needs complex agents, RAG workflows, multi-provider routing, or cost governance.
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
