# AGENTS.md

## Code Map

LinguaLens is a Chrome Manifest V3 extension that translates selected text using AI. Built with Vite, React, TypeScript, and `@crxjs/vite-plugin`.

### UI pages (each has `main.tsx` and `styles.css`)

- Popup: `src/popup/`
- Settings: `src/settings/`
- Saved items: `src/saved/` (includes `highlight.ts` for search keyword highlighting)

### Extension infrastructure

- Content script entry: `src/content/selection.ts` → `index.ts` (selection handling), `panel.ts` (shadow-DOM floating panel)
- Background service worker entry: `src/background/service-worker.ts` → `index.ts` (message routing), `action-icon.ts` (toolbar icon enabled/disabled state)
- Manifest: `manifest.config.ts`
- App-wide constants: `src/config.ts`
- Locales: `public/_locales/{en,zh_CN,zh_TW}/messages.json`

### Shared modules (`src/shared/`)

- `types.ts` — core TypeScript types (settings, messages, saved items)
- `storage.ts` — Chrome storage for settings, credentials, contentSettings, and saved items
- `translation.ts` — AI translation via Vercel AI SDK
- `providers.ts` — OpenAI-compatible endpoint presets, base URLs, and default models
- `models.ts` — fetch and normalize model lists from the configured provider
- `text.ts` — text selection normalization and sentence context extraction
- `i18n.ts`, `localization.ts`, `languages.ts` — internationalization and locale switching
- `pronunciation.ts` — pronunciation preference defaults and normalization
- `theme.ts`, `theme.css` — light/dark/system theme management
- Shared components: `ManagementHeader.tsx`, `ThemeSwitcher.tsx`, `management.css`

### Tests

- Unit tests: co-located `*.test.ts` files in `src/shared/`, `src/background/`, and `src/saved/` (Vitest)
- E2E tests: `e2e/*.spec.ts` with custom Playwright fixtures in `e2e/fixtures/`

## Architecture (do not break)

- Content script: selection and panel UI only; never receives or stores API keys.
- Background: owns translation, save, content-settings fan-out, and action icon updates.
- Messaging: `LINGUALENS_TRANSLATE` | `LINGUALENS_SAVE_ITEM` | `LINGUALENS_GET_CONTENT_SETTINGS` (see `src/shared/types.ts`).
- Storage: settings vs credentials vs contentSettings vs savedItems (`src/shared/storage.ts`). Keep credentials out of content scripts, saved items, exports, logs, and errors.
- LLM: OpenAI-compatible providers via Vercel AI SDK; endpoint presets live in `src/shared/providers.ts`.

## Commands

- `npm run dev`: start the Vite/CRXJS development server.
- `npm run build`: type-check and build into `dist/`.
- `npm test`: run Vitest unit tests.
- `npm run test:e2e`: build and run Playwright extension tests.
- See README for other scripts (`test:watch`, headed/UI e2e, `preview`).

## Verification

- Documentation-only changes do not require a build.
- Run `npm run build` after code changes.
- Also run `npm test` after changing pure logic, storage, message payloads, translation/model helpers, or existing unit-tested behavior.
- Run `npm run test:e2e` in the real local environment after changes to extension loading, permissions, content scripts, background messaging, or UI flows.
- Manually verify affected behavior in Chrome when browser integration is involved; test popup changes at the real extension popup size.

## Development Constraints

- Keep direct dependencies pinned to exact versions and use `npm ci` in CI and release workflows.
- Keep DOM-heavy behavior testable by moving parsing and transformations into pure modules.
- Treat user API keys as sensitive: never hard-code, commit, log, expose outside settings, include in errors, or store with saved items or exports.
- Prefer the full local environment for dependency installation, Playwright, and Chrome extension loading; do not claim e2e passed if it was not run.
- Prefer the `gh` CLI for GitHub remote operations. Create regular PRs unless a draft is requested.

## Git and Release

- Name branches `<type>/<short-kebab-case-description>` using lowercase kebab-case; use `feat/` for feature work and never use a `codex/` prefix.
- Commit messages and PR titles use Conventional Commits, such as `feat(content): detect selected text`.
- Keep subjects imperative, lowercase, concise, and under 72 characters. Common scopes include `popup`, `settings`, `saved`, `content`, `background`, `shared`, `i18n`, `e2e`, `manifest`, `build`, `release`, and `deps`.
- Use `chore(deps): ...` for dependency updates. PR title format is enforced by `.github/workflows/lint-pr.yml`.
- Use `.codex/skills/lingualens-release/SKILL.md` when preparing, PRing, tagging, documenting, or verifying a release.
- Package and manifest versions use plain semver; Git tags add `v`.
