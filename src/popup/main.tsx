import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { fetchModelOptions, type ModelOption } from '../shared/models';
import { DEFAULT_LLM_PROVIDER_CONFIG } from '../shared/providers';
import {
  DEFAULT_SETTINGS,
  deleteSavedItem,
  getSavedItems,
  getSettings,
  updateSettings
} from '../shared/storage';
import type { ExplanationLanguage, SavedItem, Settings } from '../shared/types';
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

function getSavedItemSourceLabel(item: SavedItem): string {
  if (item.sourceTitle) {
    return item.sourceTitle;
  }

  try {
    return new URL(item.sourceUrl).hostname;
  } catch {
    return item.sourceUrl || 'Unknown source';
  }
}

type SettingsPanelProps = {
  draftSettings: Settings;
  explanationLanguageLabel: string;
  isApiKeyConfigured: boolean;
  isEditingSettings: boolean;
  isLoadingModels: boolean;
  isSavingSettings: boolean;
  modelLoadError: string;
  modelOptions: ModelOption[];
  settings: Settings;
  onApiKeyChange: (apiKey: string) => void;
  onCancelSettingsEdit: () => void;
  onDraftSettingsChange: (nextSettings: Partial<Settings>) => void;
  onLoadModels: () => void;
  onSaveSettings: () => void;
  onStartSettingsEdit: () => void;
  onToggleWordLookup: (wordLookupEnabled: boolean) => void;
};

function SettingsPanel({
  draftSettings,
  explanationLanguageLabel,
  isApiKeyConfigured,
  isEditingSettings,
  isLoadingModels,
  isSavingSettings,
  modelLoadError,
  modelOptions,
  settings,
  onApiKeyChange,
  onCancelSettingsEdit,
  onDraftSettingsChange,
  onLoadModels,
  onSaveSettings,
  onStartSettingsEdit,
  onToggleWordLookup
}: SettingsPanelProps) {
  return (
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
              onClick={onCancelSettingsEdit}
            >
              Cancel
            </button>
            <button
              className="primaryButton"
              disabled={isSavingSettings}
              type="button"
              onClick={onSaveSettings}
            >
              {isSavingSettings ? 'Saving' : 'Save'}
            </button>
          </div>
        ) : (
          <button className="settingsButton" type="button" onClick={onStartSettingsEdit}>
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
                onDraftSettingsChange({
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

          <label className="fieldControl">
            <span>API key</span>
            <input
              autoComplete="off"
              placeholder={DEFAULT_LLM_PROVIDER_CONFIG.apiKeyPlaceholder}
              type="password"
              value={draftSettings.apiKey}
              onChange={(event) => {
                onApiKeyChange(event.target.value);
              }}
            />
          </label>

          <div className="settingsGrid">
            <label className="fieldControl">
              <span>Model</span>
              <select
                disabled={modelOptions.length === 0}
                value={draftSettings.llmModel}
                onChange={(event) => {
                  onDraftSettingsChange({ llmModel: event.target.value });
                }}
              >
                {modelOptions.length === 0 ? (
                  <option value={draftSettings.llmModel}>{draftSettings.llmModel}</option>
                ) : null}
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondaryButton loadModelsButton"
              disabled={isLoadingModels || !draftSettings.apiKey.trim()}
              type="button"
              onClick={onLoadModels}
            >
              {isLoadingModels ? 'Loading' : 'Load models'}
            </button>
          </div>
          <label className="fieldControl">
            <span>手动 Model ID</span>
            <input
              value={draftSettings.llmModel}
              onChange={(event) => {
                onDraftSettingsChange({ llmModel: event.target.value });
              }}
            />
          </label>
          {modelLoadError ? <p className="settingsError">{modelLoadError}</p> : null}
        </>
      ) : (
        <dl className="settingsSummary">
          <div>
            <dt>划词查询</dt>
            <dd>
              <label className="summaryToggleControl">
                <span>{settings.wordLookupEnabled ? '开启' : '关闭'}</span>
                <input
                  aria-label="划词查询"
                  className="toggleInput"
                  checked={settings.wordLookupEnabled}
                  type="checkbox"
                  onChange={(event) => {
                    onToggleWordLookup(event.target.checked);
                  }}
                />
                <span className="toggleSwitch" aria-hidden="true" />
              </label>
            </dd>
          </div>
          <div>
            <dt>解释语言</dt>
            <dd>{explanationLanguageLabel}</dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{DEFAULT_LLM_PROVIDER_CONFIG.label}</dd>
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
  );
}

function SavedList({
  items,
  onDelete
}: {
  items: SavedItem[];
  onDelete: (itemId: string) => void;
}) {
  return (
    <section className="savedList" aria-label="最近保存的内容">
      {items.map((item) => (
        <article className="savedItem" key={item.id}>
          <div className="savedText">
            <p className="sourceText">{item.text}</p>
            <p className="translationText">{item.translation}</p>
            {item.explanation ? <p className="explanationText">{item.explanation}</p> : null}
            <p className="metaText">
              {getSavedItemSourceLabel(item)}
              {item.model ? ` · ${item.model}` : ''}
            </p>
          </div>
          <button
            aria-label={`删除 ${item.text}`}
            className="deleteButton"
            type="button"
            onClick={() => {
              onDelete(item.id);
            }}
          >
            x
          </button>
        </article>
      ))}
    </section>
  );
}

function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<Settings>(settings);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modelLoadError, setModelLoadError] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
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
    setModelLoadError('');
    setIsEditingSettings(true);
  }

  function handleCancelSettingsEdit() {
    setDraftSettings(settings);
    setModelLoadError('');
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

  async function handleToggleWordLookup(wordLookupEnabled: boolean) {
    const previousSettings = settings;
    const nextSettings = { ...settings, wordLookupEnabled };

    setSettings(nextSettings);
    setDraftSettings((currentSettings) => ({ ...currentSettings, wordLookupEnabled }));

    try {
      const savedSettings = await updateSettings({ wordLookupEnabled });
      setSettings(savedSettings);
      setDraftSettings((currentSettings) => ({ ...currentSettings, ...savedSettings }));
    } catch {
      setSettings(previousSettings);
      setDraftSettings((currentSettings) => ({
        ...currentSettings,
        wordLookupEnabled: previousSettings.wordLookupEnabled
      }));
    }
  }

  function handleApiKeyChange(apiKey: string) {
    handleDraftSettingsChange({ apiKey });
    setModelOptions([]);
    setModelLoadError('');
  }

  async function handleLoadModels() {
    setIsLoadingModels(true);
    setModelLoadError('');

    try {
      const models = await fetchModelOptions({
        apiKey: draftSettings.apiKey,
        provider: draftSettings.llmProvider
      });
      setModelOptions(models);

      if (!models.some((model) => model.id === draftSettings.llmModel) && models[0]) {
        handleDraftSettingsChange({ llmModel: models[0].id });
      }

      if (models.length === 0) {
        setModelLoadError('没有从 provider 返回可选模型。');
      }
    } catch (error) {
      setModelLoadError(error instanceof Error ? error.message : 'Unable to load models.');
    } finally {
      setIsLoadingModels(false);
    }
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

      <SettingsPanel
        draftSettings={draftSettings}
        explanationLanguageLabel={explanationLanguageLabel}
        isApiKeyConfigured={isApiKeyConfigured}
        isEditingSettings={isEditingSettings}
        isLoadingModels={isLoadingModels}
        isSavingSettings={isSavingSettings}
        modelLoadError={modelLoadError}
        modelOptions={modelOptions}
        settings={settings}
        onApiKeyChange={handleApiKeyChange}
        onCancelSettingsEdit={handleCancelSettingsEdit}
        onDraftSettingsChange={handleDraftSettingsChange}
        onLoadModels={() => {
          void handleLoadModels();
        }}
        onSaveSettings={() => {
          void handleSaveSettings();
        }}
        onStartSettingsEdit={handleStartSettingsEdit}
        onToggleWordLookup={(wordLookupEnabled) => {
          void handleToggleWordLookup(wordLookupEnabled);
        }}
      />

      {isLoading ? <p className="empty">加载中...</p> : null}

      {!isLoading && recentItems.length === 0 ? (
        <p className="empty">配置 API key 后，在网页中选中文本即可翻译并保存。</p>
      ) : null}

      <SavedList
        items={recentItems}
        onDelete={(itemId) => {
          void handleDelete(itemId);
        }}
      />
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
