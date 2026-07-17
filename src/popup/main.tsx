import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { t } from '../shared/i18n';
import { EXPLANATION_LANGUAGE_OPTIONS } from '../shared/languages';
import {
  DEFAULT_SETTINGS,
  deleteSavedItem,
  getSavedItems,
  getSettings,
  updateSettings
} from '../shared/storage';
import type { ExplanationLanguage, SavedItem, Settings } from '../shared/types';
import './styles.css';

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

type QuickSettingsPanelProps = {
  settings: Settings;
  onSettingsChange: (nextSettings: Partial<Settings>) => void;
};

function QuickSettingsPanel({
  settings,
  onSettingsChange
}: QuickSettingsPanelProps) {
  const isApiKeyConfigured = settings.apiKey.trim().length > 0;

  return (
    <section className="settingsPanel" aria-label={t('settingsAriaLabel')}>
      <div className="settingsHeader">
        <div>
          <h2>{t('settingsQuickTitle')}</h2>
          <p>{t('settingsQuickDescription')}</p>
        </div>
      </div>

      <div className="quickSettingsList">
        <label className="quickToggleControl">
          <span>{t('settingsWordLookup')}</span>
          <span className="toggleControl">
            <input
              aria-label={t('settingsWordLookup')}
              checked={settings.wordLookupEnabled}
              type="checkbox"
              onChange={(event) => {
                onSettingsChange({ wordLookupEnabled: event.target.checked });
              }}
            />
            <span className="toggleSwitch" aria-hidden="true" />
          </span>
        </label>

        <label className="quickSelectControl">
          <span>{t('settingsExplanationLanguage')}</span>
          <select
            value={settings.explanationLanguage}
            onChange={(event) => {
              onSettingsChange({
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
        </label>

        <label className="quickToggleControl">
          <span>{t('settingsPronunciationLookup')}</span>
          <span className="toggleControl">
            <input
              aria-label={t('settingsPronunciationLookup')}
              checked={settings.pronunciationLookupEnabled}
              type="checkbox"
              onChange={(event) => {
                onSettingsChange({ pronunciationLookupEnabled: event.target.checked });
              }}
            />
            <span className="toggleSwitch" aria-hidden="true" />
          </span>
        </label>
      </div>

      <div className={`configurationStatus ${isApiKeyConfigured ? '' : 'missing'}`}>
        <span className="configurationStatusLabel">
          <span className="statusDot" aria-hidden="true" />
          {isApiKeyConfigured
            ? t('settingsServiceConfigured')
            : t('settingsServiceNotConfigured')}
        </span>
        <a className="fullSettingsLink" href="settings.html" rel="noreferrer" target="_blank">
          {t('settingsOpenFull')}
          <span aria-hidden="true">↗</span>
        </a>
      </div>
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
            {item.pronunciation ? (
              <p className="pronunciationRow">
                {item.pronunciationNotation ? (
                  <span className="pronunciationNotation">{item.pronunciationNotation}</span>
                ) : null}
                <span className="pronunciationText">{item.pronunciation}</span>
              </p>
            ) : null}
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

  async function handleQuickSettingsChange(nextSettings: Partial<Settings>) {
    const previousSettings = settings;
    setSettings({ ...settings, ...nextSettings });

    try {
      const savedSettings = await updateSettings(nextSettings);
      setSettings(savedSettings);
    } catch {
      setSettings(previousSettings);
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
        <a className="viewSavedLink" href="saved.html" rel="noreferrer" target="_blank">
          {t('savedViewAll')}
          <span aria-hidden="true">↗</span>
        </a>
      </header>

      <QuickSettingsPanel
        settings={settings}
        onSettingsChange={(nextSettings) => {
          void handleQuickSettingsChange(nextSettings);
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
