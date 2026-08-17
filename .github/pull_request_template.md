## Summary

-

## Validation

- [ ] `npm run build`
- [ ] `npm test` (required when changing pure logic, storage, messages, or existing unit-tested behavior)
- [ ] `npm run test:e2e` in the real local environment
- [ ] Manual Chrome check (use the real popup size when the popup changed)

Do not check an item unless that command actually ran. Do not claim end-to-end tests passed if they were not run. CI runs unit tests and the production build; Playwright stays local.

## Architecture

- [ ] Content script still does not receive or store API keys
- [ ] Credentials stay out of saved items, logs, errors, and any export/share path
- [ ] `ARCHITECTURE.md` updated if layout, storage keys, messages, or e2e inventory changed
