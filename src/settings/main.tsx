import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { t } from '../shared/i18n';
import { EXPLANATION_LANGUAGE_OPTIONS } from '../shared/languages';
import { ManagementHeader } from '../shared/ManagementHeader';
import { fetchModelOptions, type ModelOption } from '../shared/models';
import {
  LLM_PROVIDER_OPTIONS,
  OPENAI_COMPATIBLE_ENDPOINTS,
  OPENAI_COMPATIBLE_ENDPOINT_OPTIONS
} from '../shared/providers';
import { DEFAULT_SETTINGS, getSettings, updateSettings } from '../shared/storage';
import type {
  ExplanationLanguage,
  LlmEndpointPreset,
  LlmProvider,
  Settings
} from '../shared/types';
import './styles.css';

function ToggleField({
  checked,
  description,
  label,
  onChange
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggleField">
      <span className="toggleCopy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className="toggleControl">
        <input
          aria-label={label}
          checked={checked}
          type="checkbox"
          onChange={(event) => {
            onChange(event.target.checked);
          }}
        />
        <span className="toggleTrack" aria-hidden="true" />
      </span>
    </label>
  );
}

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modelLoadError, setModelLoadError] = useState('');
  const [savedStatus, setSavedStatus] = useState('');
  const hasChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(draftSettings),
    [draftSettings, settings]
  );

  useEffect(() => {
    let isMounted = true;

    void getSettings().then((storedSettings) => {
      if (!isMounted) {
        return;
      }

      setSettings(storedSettings);
      setDraftSettings(storedSettings);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function updateDraft(nextSettings: Partial<Settings>) {
    setDraftSettings((currentSettings) => ({ ...currentSettings, ...nextSettings }));
    setSavedStatus('');
  }

  function handleApiKeyChange(apiKey: string) {
    updateDraft({ apiKey });
    setModelOptions([]);
    setModelLoadError('');
  }

  function handleBaseUrlChange(baseUrl: string) {
    updateDraft({ baseUrl });
    setModelOptions([]);
    setModelLoadError('');
  }

  function handleEndpointPresetChange(llmEndpointPreset: LlmEndpointPreset) {
    const endpointConfig = OPENAI_COMPATIBLE_ENDPOINTS[llmEndpointPreset];

    updateDraft({
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
        updateDraft({ llmModel: models[0].id });
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

  async function handleSave() {
    setIsSaving(true);
    setSavedStatus('');

    try {
      const savedSettings = await updateSettings(draftSettings);
      setSettings(savedSettings);
      setDraftSettings(savedSettings);
      setSavedStatus(t('settingsSavedStatus'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    setDraftSettings(settings);
    setModelOptions([]);
    setModelLoadError('');
    setSavedStatus('');
  }

  return (
    <main className="settingsPage">
      <header className="pageHeader">
        <ManagementHeader activePage="settings" />
        <div className="titleRow">
          <div>
            <h1>{t('settingsTitle')}</h1>
            <p>{t('settingsPageDescription')}</p>
          </div>
          <span className={`configurationBadge ${draftSettings.apiKey.trim() ? '' : 'missing'}`}>
            <span aria-hidden="true" />
            {draftSettings.apiKey.trim()
              ? t('settingsServiceConfigured')
              : t('settingsServiceNotConfigured')}
          </span>
        </div>
      </header>

      {isLoading ? <p className="statusCard">{t('commonLoading')}</p> : null}

      {!isLoading ? (
        <form
          className="settingsForm"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <section className="settingsCard" aria-labelledby="reading-settings-title">
            <div className="sectionHeader">
              <div>
                <h2 id="reading-settings-title">{t('settingsReadingTitle')}</h2>
                <p>{t('settingsReadingDescription')}</p>
              </div>
            </div>

            <div className="toggleGroup">
              <ToggleField
                checked={draftSettings.wordLookupEnabled}
                description={t('settingsWordLookupDescription')}
                label={t('settingsWordLookup')}
                onChange={(wordLookupEnabled) => {
                  updateDraft({ wordLookupEnabled });
                }}
              />
              <ToggleField
                checked={draftSettings.pronunciationLookupEnabled}
                description={t('settingsPronunciationLookupDescription')}
                label={t('settingsPronunciationLookup')}
                onChange={(pronunciationLookupEnabled) => {
                  updateDraft({ pronunciationLookupEnabled });
                }}
              />
            </div>

            <label className="fieldControl compactField">
              <span>{t('settingsExplanationLanguage')}</span>
              <select
                value={draftSettings.explanationLanguage}
                onChange={(event) => {
                  updateDraft({
                    explanationLanguage: event.target.value as ExplanationLanguage
                  });
                }}
              >
                {EXPLANATION_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>{t('settingsExplanationLanguageDescription')}</small>
            </label>
          </section>

          <section className="settingsCard" aria-labelledby="provider-settings-title">
            <div className="sectionHeader">
              <div>
                <h2 id="provider-settings-title">{t('settingsProviderTitle')}</h2>
                <p>{t('settingsProviderDescription')}</p>
              </div>
            </div>

            <div className="formGrid">
              <label className="fieldControl">
                <span>{t('settingsProvider')}</span>
                <select
                  value={draftSettings.llmProvider}
                  onChange={(event) => {
                    updateDraft({ llmProvider: event.target.value as LlmProvider });
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
                    handleEndpointPresetChange(event.target.value as LlmEndpointPreset);
                  }}
                >
                  {OPENAI_COMPATIBLE_ENDPOINT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="fieldControl">
              <span>{t('settingsBaseUrl')}</span>
              <input
                autoComplete="off"
                disabled={draftSettings.llmEndpointPreset !== 'custom'}
                placeholder={t('settingsBaseUrlPlaceholder')}
                value={draftSettings.baseUrl}
                onChange={(event) => {
                  handleBaseUrlChange(event.target.value);
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
                  handleApiKeyChange(event.target.value);
                }}
              />
              <small>{t('settingsApiKeyDescription')}</small>
            </label>

            <div className="modelRow">
              <label className="fieldControl">
                <span>{t('settingsModel')}</span>
                <select
                  disabled={modelOptions.length === 0}
                  value={draftSettings.llmModel}
                  onChange={(event) => {
                    updateDraft({ llmModel: event.target.value });
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
                onClick={() => {
                  void handleLoadModels();
                }}
              >
                {isLoadingModels ? t('commonLoading') : t('settingsLoadModels')}
              </button>
            </div>

            <label className="fieldControl">
              <span>{t('settingsManualModelId')}</span>
              <input
                value={draftSettings.llmModel}
                onChange={(event) => {
                  updateDraft({ llmModel: event.target.value });
                }}
              />
            </label>

            {modelLoadError ? <p className="settingsError">{modelLoadError}</p> : null}
            <p className="privacyNote">{t('settingsProviderUsageNote')}</p>
          </section>

          <div className="formActions">
            <span aria-live="polite" className="savedStatus">
              {savedStatus}
            </span>
            <div>
              <button
                className="secondaryButton"
                disabled={!hasChanges || isSaving}
                type="button"
                onClick={handleDiscard}
              >
                {t('commonCancel')}
              </button>
              <button
                className="primaryButton"
                disabled={!hasChanges || isSaving}
                type="submit"
              >
                {isSaving ? t('commonSaving') : t('settingsSaveChanges')}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
