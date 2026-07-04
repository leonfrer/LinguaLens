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
  const [draftSettings, setDraftSettings] = useState<Settings>(settings);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const recentItems = useMemo(() => items.slice(0, 20), [items]);
  const explanationLanguageLabel =
    explanationLanguageOptions.find((option) => option.value === settings.explanationLanguage)
      ?.label ?? settings.explanationLanguage;
  const isApiKeyConfigured = settings.apiKey.trim().length > 0;

  useEffect(() => {
    let isMounted = true;

    async function loadPopupData() {
      const [savedItems, settings] = await Promise.all([getSavedItems(), getSettings()]);

      if (!isMounted) {
        return;
      }

      setItems(savedItems);
      setSettings(settings);
      setDraftSettings(settings);
      setIsLoading(false);
    }

    void loadPopupData();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleStartSettingsEdit() {
    setDraftSettings(settings);
    setIsEditingSettings(true);
  }

  function handleCancelSettingsEdit() {
    setDraftSettings(settings);
    setIsEditingSettings(false);
  }

  async function handleSaveSettings() {
    setIsSavingSettings(true);

    try {
      const savedSettings = await updateSettings(draftSettings);
      setSettings(savedSettings);
      setDraftSettings(savedSettings);
      setIsEditingSettings(false);
    } finally {
      setIsSavingSettings(false);
    }
  }

  function handleDraftSettingsChange(nextSettings: Partial<Settings>) {
    setDraftSettings((currentSettings) => ({ ...currentSettings, ...nextSettings }));
  }

  function handleDraftProviderChange(nextProvider: LlmProvider) {
    handleDraftSettingsChange({
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
        <div className="settingsHeader">
          <div>
            <h2>设置</h2>
            <p>{isEditingSettings ? '编辑配置' : '当前配置'}</p>
          </div>
          {isEditingSettings ? (
            <div className="settingsActions">
              <button
                className="secondaryButton"
                disabled={isSavingSettings}
                type="button"
                onClick={handleCancelSettingsEdit}
              >
                Cancel
              </button>
              <button
                className="primaryButton"
                disabled={isSavingSettings}
                type="button"
                onClick={() => {
                  void handleSaveSettings();
                }}
              >
                {isSavingSettings ? 'Saving' : 'Save'}
              </button>
            </div>
          ) : (
            <button className="settingsButton" type="button" onClick={handleStartSettingsEdit}>
              设置
              {!isApiKeyConfigured ? (
                <span className="settingsAlertDot" aria-label="API key 未配置" />
              ) : null}
            </button>
          )}
        </div>

        {isEditingSettings ? (
          <>
            <label className="fieldControl">
              <span>解释语言</span>
              <select
                value={draftSettings.explanationLanguage}
                onChange={(event) => {
                  handleDraftSettingsChange({
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
                  value={draftSettings.llmProvider}
                  onChange={(event) => {
                    handleDraftProviderChange(event.target.value as LlmProvider);
                  }}
                >
                  <option value="google">Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </label>

              <label className="fieldControl">
                <span>Model</span>
                <input
                  value={draftSettings.llmModel}
                  onChange={(event) => {
                    handleDraftSettingsChange({ llmModel: event.target.value });
                  }}
                />
              </label>
            </div>

            <label className="fieldControl">
              <span>API key</span>
              <input
                autoComplete="off"
                placeholder={draftSettings.llmProvider === 'google' ? 'Gemini API key' : 'sk-...'}
                type="password"
                value={draftSettings.apiKey}
                onChange={(event) => {
                  handleDraftSettingsChange({ apiKey: event.target.value });
                }}
              />
            </label>
          </>
        ) : (
          <dl className="settingsSummary">
            <div>
              <dt>解释语言</dt>
              <dd>{explanationLanguageLabel}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{settings.llmProvider === 'google' ? 'Gemini' : 'OpenAI'}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{settings.llmModel}</dd>
            </div>
            <div>
              <dt>API key</dt>
              <dd>{isApiKeyConfigured ? '已配置' : '未配置'}</dd>
            </div>
          </dl>
        )}

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
