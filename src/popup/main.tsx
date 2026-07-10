import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { t } from '../shared/i18n';
import { fetchModelOptions, type ModelOption } from '../shared/models';
import {
  LLM_PROVIDER_OPTIONS,
  OPENAI_COMPATIBLE_ENDPOINTS,
  OPENAI_COMPATIBLE_ENDPOINT_OPTIONS,
  getEndpointLabel
} from '../shared/providers';
import {
  DEFAULT_SETTINGS,
  deleteSavedItem,
  getSavedItems,
  getSettings,
  updateSettings
} from '../shared/storage';
import type {
  ExplanationLanguage,
  LlmEndpointPreset,
  LlmProvider,
  SavedItem,
  Settings
} from '../shared/types';
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

type IconProps = React.SVGProps<SVGSVGElement>;

function TrashIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" {...props}>
      <path
        d="M3.75 5.5h12.5M8.25 8.5v5M11.75 8.5v5M5.75 5.5l.7 10.25c.06.82.74 1.45 1.56 1.45h3.98c.82 0 1.5-.63 1.56-1.45l.7-10.25M8 5.5V3.9c0-.6.49-1.1 1.1-1.1h1.8c.61 0 1.1.5 1.1 1.1v1.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function getSavedItemSourceLabel(item: SavedItem): string {
  if (item.sourceTitle) {
    return item.sourceTitle;
  }

  try {
    return new URL(item.sourceUrl).hostname;
  } catch {
    return item.sourceUrl || t('commonUnknownSource');
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
  onBaseUrlChange: (baseUrl: string) => void;
  onEndpointPresetChange: (endpointPreset: LlmEndpointPreset) => void;
  onProviderChange: (provider: LlmProvider) => void;
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
  onBaseUrlChange,
  onEndpointPresetChange,
  onProviderChange,
  onCancelSettingsEdit,
  onDraftSettingsChange,
  onLoadModels,
  onSaveSettings,
  onStartSettingsEdit,
  onToggleWordLookup
}: SettingsPanelProps) {
  return (
    <section className="settingsPanel" aria-label={t('settingsAriaLabel')}>
      <div className="settingsHeader">
        <div>
          <h2>{t('settingsTitle')}</h2>
          <p>{isEditingSettings ? t('settingsEditConfig') : t('settingsCurrentConfig')}</p>
        </div>
        {isEditingSettings ? (
          <div className="settingsActions">
            <button
              className="secondaryButton"
              disabled={isSavingSettings}
              type="button"
              onClick={onCancelSettingsEdit}
            >
              {t('commonCancel')}
            </button>
            <button
              className="primaryButton"
              disabled={isSavingSettings}
              type="button"
              onClick={onSaveSettings}
            >
              {isSavingSettings ? t('commonSaving') : t('commonSave')}
            </button>
          </div>
        ) : (
          <button className="settingsButton" type="button" onClick={onStartSettingsEdit}>
            {t('settingsTitle')}
            {!isApiKeyConfigured ? (
              <span className="settingsAlertDot" aria-label={t('settingsApiKeyMissingLabel')} />
            ) : null}
          </button>
        )}
      </div>

      {isEditingSettings ? (
        <>
          <label className="fieldControl">
            <span>{t('settingsExplanationLanguage')}</span>
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
            <span>{t('settingsProvider')}</span>
            <select
              value={draftSettings.llmProvider}
              onChange={(event) => {
                onProviderChange(event.target.value as LlmProvider);
              }}
            >
              {LLM_PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldControl">
            <span>{t('settingsEndpoint')}</span>
            <select
              value={draftSettings.llmEndpointPreset}
              onChange={(event) => {
                onEndpointPresetChange(event.target.value as LlmEndpointPreset);
              }}
            >
              {OPENAI_COMPATIBLE_ENDPOINT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldControl">
            <span>{t('settingsBaseUrl')}</span>
            <input
              autoComplete="off"
              disabled={draftSettings.llmEndpointPreset !== 'custom'}
              placeholder={t('settingsBaseUrlPlaceholder')}
              value={draftSettings.baseUrl}
              onChange={(event) => {
                onBaseUrlChange(event.target.value);
              }}
            />
          </label>

          <label className="fieldControl">
            <span>{t('settingsApiKey')}</span>
            <input
              autoComplete="off"
              placeholder={t('settingsApiKeyPlaceholder')}
              type="password"
              value={draftSettings.apiKey}
              onChange={(event) => {
                onApiKeyChange(event.target.value);
              }}
            />
          </label>

          <div className="settingsGrid">
            <label className="fieldControl">
              <span>{t('settingsModel')}</span>
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
              disabled={
                isLoadingModels || !draftSettings.apiKey.trim() || !draftSettings.baseUrl.trim()
              }
              type="button"
              onClick={onLoadModels}
            >
              {isLoadingModels ? t('commonLoading') : t('settingsLoadModels')}
            </button>
          </div>
          <label className="fieldControl">
            <span>{t('settingsManualModelId')}</span>
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
            <dt>{t('settingsWordLookup')}</dt>
            <dd>
              <label className="summaryToggleControl">
                <span>{settings.wordLookupEnabled ? t('commonEnabled') : t('commonDisabled')}</span>
                <input
                  aria-label={t('settingsWordLookup')}
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
            <dt>{t('settingsExplanationLanguage')}</dt>
            <dd>{explanationLanguageLabel}</dd>
          </div>
          <div>
            <dt>{t('settingsProvider')}</dt>
            <dd>
              {LLM_PROVIDER_OPTIONS.find((option) => option.value === settings.llmProvider)
                ?.label ?? settings.llmProvider}
            </dd>
          </div>
          <div>
            <dt>{t('settingsEndpoint')}</dt>
            <dd>{getEndpointLabel(settings.llmEndpointPreset, settings.baseUrl)}</dd>
          </div>
          <div>
            <dt>{t('settingsBaseUrl')}</dt>
            <dd>{settings.baseUrl}</dd>
          </div>
          <div>
            <dt>{t('settingsModel')}</dt>
            <dd>{settings.llmModel}</dd>
          </div>
          <div>
            <dt>{t('settingsApiKey')}</dt>
            <dd>{isApiKeyConfigured ? t('commonConfigured') : t('commonNotConfigured')}</dd>
          </div>
        </dl>
      )}

      <p className="settingsNote">{t('settingsProviderUsageNote')}</p>
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
    <section className="savedList" aria-label={t('savedListAriaLabel')}>
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
            aria-label={t('savedDeleteLabel', item.text)}
            className="deleteButton"
            type="button"
            onClick={() => {
              onDelete(item.id);
            }}
          >
            <TrashIcon className="icon" />
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

  function handleBaseUrlChange(baseUrl: string) {
    handleDraftSettingsChange({ baseUrl });
    setModelOptions([]);
    setModelLoadError('');
  }

  function handleProviderChange(llmProvider: LlmProvider) {
    handleDraftSettingsChange({ llmProvider });
  }

  function handleEndpointPresetChange(llmEndpointPreset: LlmEndpointPreset) {
    const endpointConfig = OPENAI_COMPATIBLE_ENDPOINTS[llmEndpointPreset];

    handleDraftSettingsChange({
      llmEndpointPreset,
      baseUrl: endpointConfig.baseUrl,
      llmModel: endpointConfig.defaultModel
    });
    setModelOptions([]);
    setModelLoadError('');
  }

  async function handleLoadModels() {
    setIsLoadingModels(true);
    setModelLoadError('');

    try {
      const models = await fetchModelOptions({
        apiKey: draftSettings.apiKey,
        baseUrl: draftSettings.baseUrl,
        endpointPreset: draftSettings.llmEndpointPreset
      });
      setModelOptions(models);

      if (!models.some((model) => model.id === draftSettings.llmModel) && models[0]) {
        handleDraftSettingsChange({ llmModel: models[0].id });
      }

      if (models.length === 0) {
        setModelLoadError(t('modelNoModelsReturned'));
      }
    } catch (error) {
      setModelLoadError(error instanceof Error ? error.message : t('modelUnableToLoad'));
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
        <div className="headerTitle">
          <img className="brandMark" src="icons/icon48.png" alt="" />
          <div>
            <h1>LinguaLens</h1>
            <p>{t('savedRecent')}</p>
          </div>
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
        onBaseUrlChange={handleBaseUrlChange}
        onCancelSettingsEdit={handleCancelSettingsEdit}
        onDraftSettingsChange={handleDraftSettingsChange}
        onEndpointPresetChange={handleEndpointPresetChange}
        onLoadModels={() => {
          void handleLoadModels();
        }}
        onSaveSettings={() => {
          void handleSaveSettings();
        }}
        onProviderChange={handleProviderChange}
        onStartSettingsEdit={handleStartSettingsEdit}
        onToggleWordLookup={(wordLookupEnabled) => {
          void handleToggleWordLookup(wordLookupEnabled);
        }}
      />

      {isLoading ? <p className="empty">{t('commonLoading')}</p> : null}

      {!isLoading && recentItems.length === 0 ? (
        <p className="empty">{t('emptySavedHint')}</p>
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
