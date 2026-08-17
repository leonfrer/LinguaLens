---
name: lingualens-locale
description: Use only in the LinguaLens repository when adding or changing Chrome i18n UI strings in public/_locales or src/shared/i18n.ts.
---

# LinguaLens Locale Strings

Use this skill only from the LinguaLens repository root. Confirm the repository by checking that
`package.json`, `public/_locales/en/messages.json`, `src/shared/i18n.ts`, and `AGENTS.md` are
present, and that `package.json` has `"name": "lingualens"`.

Catalogs live in `public/_locales/{en,zh_CN,zh_TW}/messages.json`. `MessageKey` is `keyof` the
English catalog. `src/shared/i18n.test.ts` requires the three JSON files and `defaultMessages` to
expose the same keys.

## Add A Simple String

1. Choose a stable camelCase key. Reuse an existing prefix when one fits (`common`, `settings`,
   `panel`, `saved`, `theme`).
2. Add the key to all three catalogs in the same commit:
   - `public/_locales/en/messages.json`
   - `public/_locales/zh_CN/messages.json`
   - `public/_locales/zh_TW/messages.json`
3. Use `{ "message": "..." }` with no trailing commentary in the JSON.
4. Call `t('theNewKey')` from UI or content code. Do not hard-code user-visible English in those
   surfaces.

## Add A String With Substitutions

Chrome catalogs and the TypeScript fallback table both need the placeholder.

1. Add the key to all three JSON files with a `placeholders` block, matching existing keys such as
   `savedDeleteLabel` or `modelProviderUnableToLoad`.
2. Use `$1`, `$2`, … in the message text.
3. Override the same key in `src/shared/i18n.ts` for every table that already special-cases
   substitutions:
   - `defaultMessages` (English fallback)
   - `localeMessages['zh-CN']`
   - `localeMessages['zh-TW']`
4. Keep the `$1` tokens in those fallback strings. `t()` runs `applySubstitutions` on the
   TypeScript tables; Chrome `getMessage` handles the JSON catalogs.
5. Call `t('theNewKey', value)` or `t('theNewKey', [value1, value2])`.

Do not add a JSON key without the matching `i18n.ts` fallback override when neighboring
substitution keys are hardcoded there. Do not add an `i18n.ts` key that is missing from the JSON
files.

## Do Not

- Leave one locale catalog behind. Key parity is tested.
- Put API keys, tokens, or provider secrets in strings.
- Invent a fourth locale without also updating `InterfaceLanguage`, `localeMessages`,
  `resolveInterfaceLocale`, settings UI, and e2e i18n coverage.
- Change a string that e2e asserts without updating the spec. Several Playwright tests look for
  the English copy.

## Validation

```bash
npm test
```

`src/shared/i18n.test.ts` checks catalog key parity and substitution fallbacks. Also run
`npm run build` after code changes. Run `npm run test:e2e` in the real local environment when the
string is asserted by Playwright (`e2e/i18n.spec.ts` or any spec that uses the English text). Do
not claim e2e passed if it was not run.
