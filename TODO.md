# TODO.md

## Current Phase

- Phase: MVP implementation.
- Goal: ship a minimal Chrome extension that helps Chinese-speaking users read foreign-language web pages by translating selected text and saving useful words or phrases.
- Success criterion: a user can understand selected page text and save it in no more than two clicks.

## Product Decisions

- Start with one primary user path: select text on a web page, view an inline translation panel, and save the item.
- Optimize first for Chinese-speaking users reading English web pages.
- Treat multi-language support as a later expansion unless it is cheap to keep the data model flexible.
- Use `chrome.storage.local` for MVP saved items and settings.
- Keep the popup focused on recent saved items and minimal settings.
- Keep content-script UI lightweight and local to the current page.
- Begin with a mock or simple translation provider boundary if the final API/provider is not decided yet.
- MVP translation uses a mock provider first, behind a stable provider/message boundary. The goal is to finish the selection, inline panel, local save, and popup review loop before choosing or integrating a real translation API.
- MVP does not require user-provided API keys. API key settings, credential storage, provider authentication, retry policy, and provider-specific error handling are deferred until a real translation provider is selected.
- Selection triggers the inline panel automatically when the selected text is valid and reasonably short.
- Saved entries are stored as a single saved-item type for MVP. Word-vs-phrase classification can be added later without changing the main save flow.
- Default target language is Chinese (`zh-CN`).
- Popup layout targets the real Chrome extension popup size, around 320-360px wide, with recent saved items, deletion, and minimal target-language settings.
- Popup shows the latest 20 saved items first. MVP storage can keep all saved items locally unless a practical limit is needed later.
- Mock translation output should be clearly recognizable as mock/MVP output so users do not mistake it for a real translation provider.

## MVP Needs

- Content script detects selected text on normal article pages and dynamic web apps.
- Content script shows a small floating panel near the selection.
- Background service worker handles translation requests behind a stable message API.
- Saved items persist locally with source URL/title, original text, translation, target language, and timestamp.
- Popup displays recent saved items, supports deletion, and exposes target-language settings.

## Open Decisions

- Real translation provider choice after MVP validation.
- Whether saved-item storage should enforce a maximum item count.

## Implementation Checklist

- [ ] Add content-script selection listener.
- [ ] Render and position the floating translation panel.
- [ ] Add background message handling for translation and saving.
- [ ] Add translation provider boundary and initial mock/provider implementation.
- [ ] Build popup saved-item list.
- [ ] Add delete support in popup.
- [ ] Add target-language setting in popup.
