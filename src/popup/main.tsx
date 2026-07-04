import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { deleteSavedItem, getSavedItems, getSettings, updateSettings } from '../shared/storage';
import type { ExplanationLanguage, LlmProvider, SavedItem, Settings } from '../shared/types';
import './styles.css';

const explanationLanguageOptions: Array<{ value: ExplanationLanguage; label: string }> = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'it', label: 'Italiano' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' }
];

const defaultModels: Record<LlmProvider, string> = {
  google: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini'
};

function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [settings, setSettings] = useState<Settings>({
    explanationLanguage: 'zh-CN',
    llmProvider: 'google',
    llmModel: defaultModels.google,
    apiKey: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const recentItems = useMemo(() => items.slice(0, 20), [items]);

  useEffect(() => {
    let isMounted = true;

    async function loadPopupData() {
      const [savedItems, settings] = await Promise.all([getSavedItems(), getSettings()]);

      if (!isMounted) {
        return;
      }

      setItems(savedItems);
      setSettings(settings);
      setIsLoading(false);
    }

    void loadPopupData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSettingsChange(nextSettings: Partial<Settings>) {
    setSettings((currentSettings) => ({ ...currentSettings, ...nextSettings }));
    const savedSettings = await updateSettings(nextSettings);
    setSettings(savedSettings);
  }

  async function handleProviderChange(nextProvider: LlmProvider) {
    await handleSettingsChange({
      llmProvider: nextProvider,
      llmModel: defaultModels[nextProvider],
      apiKey: ''
    });
  }

  async function handleDelete(itemId: string) {
    await deleteSavedItem(itemId);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  return (
    <main className="popup">
      <header className="header">
        <div>
          <h1>LinguaLens</h1>
          <p>最近保存</p>
        </div>
      </header>

      <section className="settingsPanel" aria-label="LinguaLens 设置">
        <label className="fieldControl">
          <span>解释语言</span>
          <select
            value={settings.explanationLanguage}
            onChange={(event) => {
              void handleSettingsChange({
                explanationLanguage: event.target.value as ExplanationLanguage
              });
            }}
          >
            {explanationLanguageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="settingsGrid">
          <label className="fieldControl">
            <span>Provider</span>
            <select
              value={settings.llmProvider}
              onChange={(event) => {
                void handleProviderChange(event.target.value as LlmProvider);
              }}
            >
              <option value="google">Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>

          <label className="fieldControl">
            <span>Model</span>
            <input
              value={settings.llmModel}
              onChange={(event) => {
                void handleSettingsChange({ llmModel: event.target.value });
              }}
            />
          </label>
        </div>

        <label className="fieldControl">
          <span>API key</span>
          <input
            autoComplete="off"
            placeholder={settings.llmProvider === 'google' ? 'Gemini API key' : 'sk-...'}
            type="password"
            value={settings.apiKey}
            onChange={(event) => {
              void handleSettingsChange({ apiKey: event.target.value });
            }}
          />
        </label>

        <p className="settingsNote">
          选中文本和可用句子上下文会发送给配置的 LLM provider，并可能消耗你的 API 额度。
        </p>
      </section>

      {isLoading ? <p className="empty">加载中...</p> : null}

      {!isLoading && recentItems.length === 0 ? (
        <p className="empty">配置 API key 后，在网页中选中文本即可翻译并保存。</p>
      ) : null}

      <section className="savedList" aria-label="最近保存的内容">
        {recentItems.map((item) => (
          <article className="savedItem" key={item.id}>
            <div className="savedText">
              <p className="sourceText">{item.text}</p>
              <p className="translationText">{item.translation}</p>
              {item.explanation ? <p className="explanationText">{item.explanation}</p> : null}
              <p className="metaText">
                {item.sourceTitle || new URL(item.sourceUrl).hostname}
                {item.model ? ` · ${item.model}` : ''}
              </p>
            </div>
            <button
              aria-label={`删除 ${item.text}`}
              className="deleteButton"
              type="button"
              onClick={() => {
                void handleDelete(item.id);
              }}
            >
              x
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
