# AGENTS.md

## Code Map

LinguaLens is a Chrome Manifest V3 extension built with Vite, React, TypeScript, and `@crxjs/vite-plugin`.

- Popup: `src/popup/main.tsx` and `src/popup/styles.css`
- Settings: `src/settings/main.tsx` and `src/settings/styles.css`
- Saved items: `src/saved/main.tsx` and `src/saved/styles.css`
- Content script: `src/content/index.ts`
- Background service worker: `src/background/index.ts`
- Manifest: `manifest.config.ts`

## Commands

- `npm run dev`: start the Vite/CRXJS development server.
- `npm run build`: type-check and build into `dist/`.
- `npm test`: run Vitest unit tests.
- `npm run test:e2e`: build and run Playwright extension tests.

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
- Do not run dependency installation or Playwright commands in the sandbox; request the real local environment.
- Run GitHub remote operations outside the sandbox and prefer the `gh` CLI. Create regular PRs unless a draft is requested.

## Git and Release

- Name branches `<type>/<short-kebab-case-description>` using lowercase kebab-case; use `feat/` for feature work and never use a `codex/` prefix.
- Commit messages and PR titles use Conventional Commits, such as `feat(content): detect selected text`.
- Keep subjects imperative, lowercase, concise, and under 72 characters. Common scopes include `popup`, `settings`, `saved`, `content`, `background`, `manifest`, `build`, `release`, and `deps`.
- Use `chore(deps): ...` for dependency updates. PR title format is enforced by `.github/workflows/lint-pr.yml`.
- Use `.codex/skills/lingualens-release/SKILL.md` when preparing, PRing, tagging, documenting, or verifying a release.
- Package and manifest versions use plain semver; Git tags add `v`.
