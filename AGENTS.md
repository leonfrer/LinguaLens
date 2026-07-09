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

## Release Workflow

- Use the project skill at `.codex/skills/lingualens-release/SKILL.md` when preparing, PRing, tagging, or verifying a release.
- Package and Chrome manifest versions use plain semver such as `0.1.0`; Git tags use a leading `v`, such as `v0.1.0`.
- Do not commit local `release/` zip files. GitHub Actions creates the release artifact from the pushed tag.

## Execution Environment Notes

- If a command is not appropriate to run in the sandbox, ask the user by default for permission to run it in the real local environment.
- Do not run dependency installation commands such as `npm install`, `npm ci`, or `npx playwright install` in the sandbox. These commands require the real local environment because they access the network, npm caches, and tool-managed browser/dependency directories.
- Do not run `npm run test:e2e` in the sandbox. Playwright extension tests must run in the real local environment because they launch a persistent Chromium context with the built extension.
- Do not run GitHub remote operations such as creating pull requests, pushing branches, or checking GitHub authentication in the sandbox. Use the real local environment or the configured GitHub connector for these operations.
- When GitHub operations are needed, prefer the `gh` CLI.
- When creating pull requests, create regular PRs by default unless a draft PR is specifically requested.

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
- Use `deps` for dependency update commits.
- Example: `feat(content): detect selected text on page`.

## PR Title Guidelines

- PR titles must use Conventional Commits style: `type(scope): summary` or `type: summary`.
- Allowed PR title types are `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, and `build`.
- Prefer scopes that match project areas, such as `popup`, `content`, `background`, `manifest`, `build`, `release`, or `deps`.
- Keep the subject imperative, concise, and start it with a lowercase letter.
- Example: `fix(background): handle missing API key`.
- PR title format is enforced by `.github/workflows/lint-pr.yml` using `amannn/action-semantic-pull-request`.

## Development Notes

- Always run `npm run build` before considering a code change complete.
- Run `npm run test` after changes that add or modify pure logic, storage helpers, message payload shaping, translation/model helpers, or existing unit-tested behavior.
- Run `npm run test:e2e` in the real local environment after changes that affect extension loading, `manifest.config.ts`, content script injection, background service worker messaging, popup UI flows, Chrome permissions, or end-to-end selection/translation/save behavior.
- Keep direct dependencies in `package.json` pinned to exact versions. Do not use `latest`, caret ranges, tilde ranges, or wildcards for direct dependencies.
- Let Dependabot propose dependency updates through PRs, then review release notes and run the relevant verification before merging.
- Use `npm ci` in CI/release workflows so installs follow `package-lock.json` exactly.
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
