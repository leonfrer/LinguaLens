# AGENTS.md

## Code Map and Architecture

LinguaLens is a Chrome Manifest V3 extension that translates selected text using AI (Vite, React, TypeScript, `@crxjs/vite-plugin`).

**Full code map, runtime diagram, messaging/storage sketch, and e2e inventory:** see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

Open that file when changing directory layout, content/background boundaries, storage keys, message types, provider wiring, or Playwright harness/specs.

### Critical paths (summary)

- UI: `src/popup/`, `src/settings/`, `src/saved/`
- Content: `src/content/` (selection lifecycle, sentence context, shadow-DOM panel)
- Background: `src/background/` (translation, save, content settings, action icon)
- Shared: `src/shared/` (`types`, `storage`, `translation`, `providers`, …)
- Manifest / constants / locales: `manifest.config.ts`, `src/config.ts`, `public/_locales/`
- Unit tests: co-located `*.test.ts` (Vitest)
- E2E: `e2e/*.spec.ts`, fixtures in `e2e/fixtures/` (Playwright; loads `dist/`)

## Architecture (do not break)

- Content script: selection and panel UI only; never receives or stores API keys.
- Background: owns translation, save, delete, content-settings fan-out, and action icon updates.
- Messaging: `LINGUALENS_TRANSLATE` | `LINGUALENS_SAVE_ITEM` | `LINGUALENS_DELETE_ITEM` | `LINGUALENS_GET_CONTENT_SETTINGS` (see `src/shared/types.ts`).
- Storage: settings vs credentials vs contentSettings vs savedItems (`src/shared/storage.ts`). In-memory `Settings` may include `apiKey`; only the credentials bucket persists it. Keep credentials out of content scripts, saved items, logs, errors, and any future export/share paths.
- LLM: OpenAI-compatible providers via Vercel AI SDK; endpoint presets live in `src/shared/providers.ts`.

## Commands

- `npm run dev`: start the Vite/CRXJS development server.
- `npm run build`: type-check and build into `dist/`.
- `npm test`: run Vitest unit tests.
- `npm run test:e2e`: build and run Playwright extension tests.
- See README for other scripts (`test:watch`, headed/UI e2e, `preview`).
- CI runs `npm test` then `npm run build` on pull requests and `main`. Playwright stays local.

## Verification

- Documentation-only changes do not require a build.
- Run `npm run build` after code changes.
- Also run `npm test` after changing pure logic, storage, message payloads, translation/model helpers, or existing unit-tested behavior.
- Run `npm run test:e2e` in the real local environment after changes to extension loading, permissions, content scripts, background messaging, or UI flows.
- Manually verify affected behavior in Chrome when browser integration is involved; test popup changes at the real extension popup size.
- Use the pull request template checkboxes. Do not check a command that was not run.

## Development Constraints

- Keep direct dependencies pinned to exact versions and use `npm ci` in CI and release workflows.
- Keep DOM-heavy behavior testable by moving parsing and transformations into pure modules.
- Treat user API keys as sensitive: never hard-code, commit, log, expose outside settings, include in errors, or store with saved items (or any future export/share payload).
- Prefer the full local environment for dependency installation, Playwright, and Chrome extension loading; do not claim e2e passed if it was not run.
- Prefer the `gh` CLI for GitHub remote operations. Create regular PRs unless a draft is requested.

## Git and Release

- Write GitHub issue titles and bodies in English (same for PR descriptions unless a template says otherwise).
- Name branches `<type>/<short-kebab-case-description>` using lowercase kebab-case; use `feat/` for feature work and never use a `codex/` prefix.
- Commit messages and PR titles use Conventional Commits, such as `feat(content): detect selected text`.
- Keep subjects imperative, lowercase, concise, and under 72 characters. Allowed types/scopes match `.github/workflows/lint-pr.yml` (types include `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`; scopes include `popup`, `settings`, `saved`, `content`, `background`, `shared`, `i18n`, `e2e`, `manifest`, `build`, `release`, `deps`).
- Use `chore(deps): ...` for dependency updates. PR title format is enforced by the lint-pr workflow.
- Use `.agents/skills/lingualens-release/SKILL.md` when preparing, PRing, tagging, documenting, or verifying a release.
- Use `.agents/skills/lingualens-storage-message/SKILL.md` when adding storage keys, settings fields, or runtime messages.
- Use `.agents/skills/lingualens-locale/SKILL.md` when adding or changing UI strings.
- Package and manifest versions use plain semver; Git tags add `v`.

## Agent skills

Project skills live in `.agents/skills/<name>/SKILL.md` (Agent Skills standard). Codex, Pi, and other compatible harnesses load this directory. Put new skills here, not under `.codex/`.

`.codex/config.toml` is Codex-only sandbox and project config. Keep it when changing Codex runtime behavior; do not use `.codex/` as the skill store.
