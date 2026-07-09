# TODO.md

## Current Phase

- Phase: MVP implementation.
- Goal: ship a minimal Chrome extension that helps users read foreign-language web pages by translating and explaining selected text, then saving useful words or phrases.
- Success criterion: after first-time setup, a user can understand selected page text and save it in no more than two clicks.

## Product Decisions

- Start with one primary user path: select text on a web page, view an inline translation panel, and save the item.
- Optimize first for Chinese-speaking users reading English web pages, while keeping the LLM explanation language flexible enough for common international languages.
- Use `chrome.storage.local` for MVP saved items and settings.
- Keep the popup focused on recent saved items and minimal settings.
- Keep content-script UI lightweight and local to the current page.
- Use an LLM-backed translation provider behind the stable provider/message boundary.
- Use Vercel AI SDK as the default implementation library for LLM-backed translation and explanation calls.
- Support a minimal LLM provider/model path for the MVP with NVIDIA NIM.
- Use a user-managed API key model for the MVP. The user's LLM API key is stored locally in Chrome extension storage and is used only for LLM requests.
- Never include the user's API key in saved items, exported reading data, error messages, logs, or non-settings UI.
- Use `explanationLanguage` instead of the narrower `targetLanguage` concept. The explanation language controls the language used for translations, contextual explanations, and later learning guidance.
- Use `explanationLanguage` as the code/data field name, but prefer user-facing labels such as "Response language" or "Explanation language" in the UI.
- Explanation language options should cover common international languages, starting with Simplified Chinese, Traditional Chinese, English, Japanese, Korean, French, German, Spanish, Portuguese, Italian, Russian, and Arabic.
- Make it clear before the first LLM request that selected text and available sentence context are sent to the configured LLM provider and may consume the user's own API quota.
- Selection triggers the inline panel automatically when the selected text is valid and reasonably short.
- Saved entries are stored as a single saved-item type for MVP. Word-vs-phrase classification can be added later without changing the main save flow.
- Default explanation language is Simplified Chinese (`zh-CN`).
- Popup layout targets the real Chrome extension popup size, around 320-360px wide, with recent saved items, deletion, explanation-language settings, and minimal LLM provider settings.
- Popup should show a compact settings summary by default. Editing provider, model, explanation language, or API key should happen in an explicit settings mode and persist only when the user clicks Save.
- Model selection should load provider-supported models with the user's API key when possible, while keeping manual model ID entry as a fallback.
- Popup shows the latest 20 saved items first. MVP storage can keep all saved items locally unless a practical limit is needed later.

## MVP Needs

- Content script detects selected text on normal article pages and dynamic web apps.
- Content script shows a small floating panel near the selection.
- Background service worker handles translation requests behind a stable message API.
- Popup settings let users choose an explanation language, configure the MVP LLM provider/model path, and enter their own API key.
- Popup settings let users load supported models from the configured provider using their API key and choose one from the returned list.
- Translation requests include selected text, the containing sentence when available, and the explanation language.
- Saved items persist locally with source URL/title, original text, translation, explanation language, optional explanation, timestamp, and provider/model metadata.
- Saved items include the sentence containing the selected word or phrase when it can be extracted, so translation and later LLM explanations have enough reading context.
- Popup displays recent saved items, supports deletion, and exposes explanation-language and minimal LLM provider settings. Provider/model metadata should not dominate the main saved-item UI.

## Open Decisions

- Whether the NVIDIA default model should change after real-user testing.
- Whether saved-item storage should enforce a maximum item count.

## Implementation Checklist

- [x] Add content-script selection listener.
- [x] Render and position the floating translation panel.
- [x] Add background message handling for translation and saving.
- [x] Add translation provider boundary and initial provider implementation.
- [x] Build popup saved-item list.
- [x] Add delete support in popup.
- [x] Add explanation-language setting in popup.
- [x] Rename target-language settings and data flow to explanation-language.
- [x] Add user-managed LLM API key and model settings.
- [x] Load provider-supported models from the user's API key and allow model selection.
- [x] Add LLM-backed translation provider.
- [x] Move popup provider/model/API key edits behind an explicit settings mode with Save and Cancel.
- [ ] Improve sentence-context extraction across nested or split DOM text nodes.
- [ ] Manually verify the NVIDIA-backed flow in Chrome with a real API key.
- [ ] Add more specific provider error handling for auth, quota, and network failures.
