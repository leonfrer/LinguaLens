---
name: lingualens-storage-message
description: Use only in the LinguaLens repository when adding or changing chrome.storage keys, Settings or ContentSettings fields, or runtime message types such as LINGUALENS_TRANSLATE.
---

# LinguaLens Storage And Messages

Use this skill only from the LinguaLens repository root. Confirm the repository by checking that
`package.json`, `src/shared/storage.ts`, `src/shared/types.ts`, and `AGENTS.md` are present, and
that `package.json` has `"name": "lingualens"`.

Read `ARCHITECTURE.md` before editing. Do not put API keys in content scripts, saved items, logs,
errors, or any export/share path.

## Choose The Bucket

| Bucket | Key | Allowed contents |
| --- | --- | --- |
| Settings | `lingualens.settings` (`SETTINGS_KEY`) | Non-secret `StoredSettings` only. Never persist `apiKey` here. |
| Credentials | `lingualens.credentials` (`CREDENTIALS_KEY`) | `{ apiKey }` only. Trusted contexts only. |
| Content settings | `lingualens.contentSettings` (`CONTENT_SETTINGS_KEY`) | Safe subset published to `chrome.storage.session` for the content script. |
| Saved items | `lingualens.savedItems` (`SAVED_ITEMS_KEY`) | Translations and metadata. Never credentials. |
| Saved view | `lingualens.savedItemsView` (`SAVED_ITEMS_VIEW_KEY`) | Presentation only (`list` \| `byPage`). |

In-memory `Settings` may include `apiKey`. `getSettings` / `updateSettings` merge and split
credentials at the storage boundary. Legacy `apiKey` values left on the settings object are ignored
on read.

`ContentSettings` is a `Pick` of `Settings`. If the content script does not need a field, do not
add it there.

## Add A Settings Field

1. Add the field to `Settings` in `src/shared/types.ts`.
2. Give it a default in `DEFAULT_SETTINGS` (`src/shared/storage.ts`).
3. Normalize or migrate the value in `getSettings` when the stored shape can be missing or legacy.
4. If the content script needs it:
   - Add it to the `ContentSettings` `Pick`.
   - Thread it through `getContentSettings`.
   - Read it in `src/content/index.ts` (and panel/trigger only if they render it).
5. If the user can change it, wire popup and/or settings UI. Keep the API key on the settings page
   only.
6. Extend `src/shared/storage.test.ts` for defaulting, migration, and the content-settings subset.
7. If e2e seeds this field, update `seedExtensionSettings` in `e2e/fixtures/helpers.ts`.
8. Update the storage / `ContentSettings` notes in `ARCHITECTURE.md`.

## Add A Storage Key

1. Export a `lingualens.*` constant from `src/shared/storage.ts`.
2. Add typed read/write helpers. Validate unknown stored values; do not trust raw storage.
3. Decide `local` vs `session` and the access level. Content-script-readable data must stay in the
   content-safe subset. Credentials stay in trusted local storage.
4. Add unit tests. If Playwright needs the key, export it from `e2e/fixtures/helpers.ts`.
5. Add the key to the `ARCHITECTURE.md` storage table.

## Add A Runtime Message

Current types (`src/shared/types.ts`):

- `LINGUALENS_TRANSLATE` — selected text plus optional sentence context → translation
- `LINGUALENS_SAVE_ITEM` — persist a saved item from the panel / UI
- `LINGUALENS_GET_CONTENT_SETTINGS` — content-safe settings subset

1. Add the request type and the response union (`ok: true` | `ok: false`).
2. Add the request to the `LinguaLensMessage` union.
3. Teach `isLinguaLensMessage` in `src/background/index.ts` the new `type` string.
4. Handle it in the background listener. Background owns translation, save, and credential use.
5. Send it only from a trusted caller. The content script must never send or receive `apiKey`.
6. Keep error strings free of secrets. Reuse existing provider-error sanitization.
7. Update the messaging list in `AGENTS.md` and the sketch in `ARCHITECTURE.md`.
8. Cover the payload in unit tests when the handler is pure enough; otherwise add or extend an e2e
   spec that intercepts the network and asserts the UI.

## Validation

```bash
npm test
npm run build
```

Run `npm run test:e2e` in the real local environment when the change touches extension loading,
permissions, content scripts, background messaging, or multi-surface UI. Do not claim e2e passed if
it was not run.
