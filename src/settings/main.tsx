import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { t } from '../shared/i18n';
import { applyInterfaceLanguage, initializeInterfaceLanguage } from '../shared/localization';
import { EXPLANATION_LANGUAGE_OPTIONS } from '../shared/languages';
import { ManagementHeader } from '../shared/ManagementHeader';
import { initializeTheme } from '../shared/theme';
import { fetchModelOptions, type ModelOption } from '../shared/models';
import {
  LLM_PROVIDER_OPTIONS,
  OPENAI_COMPATIBLE_ENDPOINTS,
  OPENAI_COMPATIBLE_ENDPOINT_OPTIONS
} from '../shared/providers';
import {
  createDefaultPronunciationPreferences,
  getPronunciationNotationSuggestions,
  MAX_PRONUNCIATION_LABEL_LENGTH
} from '../shared/pronunciation';
import { DEFAULT_SETTINGS, getSettings, updateSettings } from '../shared/storage';
import type {
  ExplanationLanguage,
  InterfaceLanguage,
  LlmEndpointPreset,
  LlmProvider,
  PronunciationPreference,
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
  const hasInvalidPronunciationPreferences = useMemo(() => {
    const normalizedLanguageLabels = draftSettings.pronunciationPreferences
      .map(({ languageLabel }) => languageLabel.trim().toLocaleLowerCase())
      .filter(Boolean);

    return (
      draftSettings.pronunciationPreferences.some(
        ({ languageLabel, notationLabel }) =>
          !languageLabel.trim() || !notationLabel.trim()
      ) || new Set(normalizedLanguageLabels).size !== normalizedLanguageLabels.length
    );
  }, [draftSettings.pronunciationPreferences]);
  const hasBlockingPronunciationPreferenceError =
    draftSettings.pronunciationLookupEnabled && hasInvalidPronunciationPreferences;

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

  useEffect(() => {
    document.title = t('settingsDocumentTitle');
  }, [draftSettings.interfaceLanguage]);

  useEffect(() => {
    if (!savedStatus) {
      return;
    }

    const statusTimer = window.setTimeout(() => {
      setSavedStatus('');
    }, 2400);

    return () => {
      window.clearTimeout(statusTimer);
    };
  }, [savedStatus]);

  function updateDraft(nextSettings: Partial<Settings>) {
    if (nextSettings.interfaceLanguage) {
      applyInterfaceLanguage(nextSettings.interfaceLanguage);
    }

    setDraftSettings((currentSettings) => ({ ...currentSettings, ...nextSettings }));
    setSavedStatus('');
  }

  function updatePronunciationPreference(
    preferenceId: string,
    changes: Partial<Omit<PronunciationPreference, 'id'>>
  ) {
    updateDraft({
      pronunciationPreferences: draftSettings.pronunciationPreferences.map((preference) =>
        preference.id === preferenceId ? { ...preference, ...changes } : preference
      )
    });
  }

  function handleAddPronunciationPreference() {
    updateDraft({
      pronunciationPreferences: [
        ...draftSettings.pronunciationPreferences,
        {
          id: crypto.randomUUID(),
          languageLabel: '',
          notationLabel: '',
          enabled: true
        }
      ]
    });
  }

  function handleRemovePronunciationPreference(preferenceId: string) {
    updateDraft({
      pronunciationPreferences: draftSettings.pronunciationPreferences.filter(
        ({ id }) => id !== preferenceId
      )
    });
  }

  function handleRestorePronunciationDefaults() {
    if (!window.confirm(t('settingsPronunciationRestoreConfirm'))) {
      return;
    }

    updateDraft({
      pronunciationPreferences: createDefaultPronunciationPreferences()
    });
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
    if (hasBlockingPronunciationPreferenceError) {
      return;
    }

    setIsSaving(true);
    setSavedStatus('');

    try {
      const { appearance } = await getSettings();
      const savedSettings = await updateSettings({ ...draftSettings, appearance });
      setSettings(savedSettings);
      setDraftSettings(savedSettings);
      setSavedStatus(t('settingsSavedStatus'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    applyInterfaceLanguage(settings.interfaceLanguage);
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
          <section className="settingsCard" aria-labelledby="interface-settings-title">
            <div className="sectionHeader">
              <div>
                <h2 id="interface-settings-title">{t('settingsInterfaceTitle')}</h2>
                <p>{t('settingsInterfaceDescription')}</p>
              </div>
            </div>

            <label className="fieldControl compactField">
              <span>{t('settingsInterfaceLanguage')}</span>
              <select
                value={draftSettings.interfaceLanguage}
                onChange={(event) => {
                  updateDraft({
                    interfaceLanguage: event.target.value as InterfaceLanguage
                  });
                }}
              >
                <option value="system">{t('interfaceLanguageSystem')}</option>
                <option value="en">{t('interfaceLanguageEnglish')}</option>
                <option value="zh-CN">{t('interfaceLanguageSimplifiedChinese')}</option>
                <option value="zh-TW">{t('interfaceLanguageTraditionalChinese')}</option>
              </select>
              <small>{t('settingsInterfaceLanguageDescription')}</small>
              {draftSettings.interfaceLanguage !== settings.interfaceLanguage ? (
                <small className="previewHint">{t('settingsInterfaceLanguagePreview')}</small>
              ) : null}
            </label>
          </section>

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

            {draftSettings.pronunciationLookupEnabled ? (
              <div className="pronunciationPreferences">
                <div className="preferenceHeader">
                  <div>
                    <h3>{t('settingsPronunciationPreferencesTitle')}</h3>
                    <p>{t('settingsPronunciationPreferencesDescription')}</p>
                  </div>
                  <button
                    className="secondaryButton restorePreferencesButton"
                    type="button"
                    onClick={handleRestorePronunciationDefaults}
                  >
                    {t('settingsPronunciationRestoreDefaults')}
                  </button>
                </div>

                <div className="toggleGroup longTextPronunciationToggle">
                  <ToggleField
                    checked={draftSettings.skipLongTextPronunciation}
                    description={t('settingsSkipLongTextPronunciationDescription')}
                    label={t('settingsSkipLongTextPronunciation')}
                    onChange={(skipLongTextPronunciation) => {
                      updateDraft({ skipLongTextPronunciation });
                    }}
                  />
                </div>

                <div className="preferenceList">
                  {draftSettings.pronunciationPreferences.length > 0 ? (
                    <div className="preferenceColumnHeaders" aria-hidden="true">
                      <span>{t('settingsPronunciationLanguage')}</span>
                      <span>{t('settingsPronunciationNotationLabel')}</span>
                      <span>{t('settingsPronunciationEnabled')}</span>
                      <span />
                    </div>
                  ) : (
                    <p className="emptyPreferences">{t('settingsPronunciationEmpty')}</p>
                  )}

                  {draftSettings.pronunciationPreferences.map((preference, index) => {
                    const rowLabel = preference.languageLabel.trim() || String(index + 1);
                    const notationSuggestions = getPronunciationNotationSuggestions(
                      preference.languageLabel
                    );
                    const notationListId = `pronunciation-notation-options-${index + 1}`;

                    return (
                      <div
                        className={`preferenceRow ${preference.enabled ? '' : 'isDisabled'}`}
                        key={preference.id}
                      >
                        <label className="preferenceField">
                          <span>{t('settingsPronunciationLanguage')}</span>
                          <input
                            aria-label={`${t('settingsPronunciationLanguage')}: ${index + 1}`}
                            maxLength={MAX_PRONUNCIATION_LABEL_LENGTH}
                            placeholder={t('settingsPronunciationLanguagePlaceholder')}
                            value={preference.languageLabel}
                            onChange={(event) => {
                              updatePronunciationPreference(preference.id, {
                                languageLabel: event.target.value
                              });
                            }}
                          />
                        </label>
                        <label className="preferenceField">
                          <span>{t('settingsPronunciationNotationLabel')}</span>
                          <input
                            aria-label={`${t('settingsPronunciationNotationLabel')}: ${index + 1}`}
                            list={notationSuggestions.length > 0 ? notationListId : undefined}
                            maxLength={MAX_PRONUNCIATION_LABEL_LENGTH}
                            placeholder={t('settingsPronunciationNotationPlaceholder')}
                            value={preference.notationLabel}
                            onChange={(event) => {
                              updatePronunciationPreference(preference.id, {
                                notationLabel: event.target.value
                              });
                            }}
                          />
                          {notationSuggestions.length > 0 ? (
                            <datalist id={notationListId}>
                              {notationSuggestions.map((notationLabel) => (
                                <option key={notationLabel} value={notationLabel} />
                              ))}
                            </datalist>
                          ) : null}
                        </label>
                        <label className="preferenceEnabledControl">
                          <input
                            aria-label={`${t('settingsPronunciationEnabled')}: ${rowLabel}`}
                            checked={preference.enabled}
                            type="checkbox"
                            onChange={(event) => {
                              updatePronunciationPreference(preference.id, {
                                enabled: event.target.checked
                              });
                            }}
                          />
                          <span aria-hidden="true" />
                        </label>
                        <button
                          aria-label={`${t('settingsPronunciationRemove')}: ${rowLabel}`}
                          className="removePreferenceButton"
                          type="button"
                          onClick={() => {
                            handleRemovePronunciationPreference(preference.id);
                          }}
                        >
                          {t('settingsPronunciationRemove')}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {hasInvalidPronunciationPreferences ? (
                  <p className="settingsError">{t('settingsPronunciationRowsInvalid')}</p>
                ) : null}

                <div className="preferenceActions">
                  <button
                    className="secondaryButton addPreferenceButton"
                    type="button"
                    onClick={handleAddPronunciationPreference}
                  >
                    {t('settingsPronunciationAdd')}
                  </button>
                </div>
              </div>
            ) : null}

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

          {hasChanges || savedStatus ? (
            <div className={`formActions ${savedStatus ? 'isSaved' : ''}`}>
              <span aria-live="polite" className="changeStatus">
                {savedStatus || t('settingsUnsavedChanges')}
              </span>
              {hasChanges ? (
                <div>
                  <button
                    className="secondaryButton"
                    disabled={isSaving}
                    type="button"
                    onClick={handleDiscard}
                  >
                    {t('commonCancel')}
                  </button>
                  <button
                    className="primaryButton"
                    disabled={hasBlockingPronunciationPreferenceError || isSaving}
                    type="submit"
                  >
                    {isSaving ? t('commonSaving') : t('settingsSaveChanges')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}
    </main>
  );
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void Promise.all([initializeTheme(), initializeInterfaceLanguage()])
  .catch(() => undefined)
  .finally(renderApp);
