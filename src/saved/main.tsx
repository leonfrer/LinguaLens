import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { getInterfaceLocale, t } from '../shared/i18n';
import {
  initializeInterfaceLanguage,
  subscribeToInterfaceLanguage
} from '../shared/localization';
import { ManagementHeader } from '../shared/ManagementHeader';
import {
  buildBackupFilename,
  createSavedItemsBackup,
  parseSavedItemsBackup,
  serializeSavedItemsBackup
} from '../shared/saved-items-backup';
import { initializeTheme } from '../shared/theme';
import {
  deleteSavedItem,
  getSavedItems,
  mergeSavedItemsFromBackup
} from '../shared/storage';
import type { SavedItem } from '../shared/types';
import { findTextRange } from './highlight';
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

function ExternalLinkIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" {...props}>
      <path
        d="M6.25 3.25H3.9a1.65 1.65 0 0 0-1.65 1.65v7.2a1.65 1.65 0 0 0 1.65 1.65h7.2a1.65 1.65 0 0 0 1.65-1.65V9.75M8.75 2.25h5v5M13.5 2.5 7 9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

function getSourceLabel(item: SavedItem): string {
  if (item.sourceTitle?.trim()) {
    return item.sourceTitle;
  }

  try {
    return new URL(item.sourceUrl).hostname;
  } catch {
    return item.sourceUrl || t('commonUnknownSource');
  }
}

function formatSavedDate(createdAt: number): string {
  return new Intl.DateTimeFormat(getInterfaceLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(createdAt);
}

function HighlightedContext({ item }: { item: SavedItem }) {
  const context = item.sentenceContext?.trim() || item.text;
  const range = findTextRange(context, item.text, item.selectionStartInContext);

  if (!range) {
    return <>{context}</>;
  }

  return (
    <>
      {context.slice(0, range.start)}
      <mark>{context.slice(range.start, range.end)}</mark>
      {context.slice(range.end)}
    </>
  );
}

function SavedCard({ item, onDelete }: { item: SavedItem; onDelete: (itemId: string) => void }) {
  const sourceLabel = getSourceLabel(item);
  const savedDate = formatSavedDate(item.createdAt);

  return (
    <article className="savedCard">
      <div className="cardTopRow">
        <p className="contextText">
          <HighlightedContext item={item} />
        </p>
        <button
          aria-label={t('savedDeleteLabel', item.text)}
          className="deleteButton"
          type="button"
          onClick={() => {
            onDelete(item.id);
          }}
        >
          <TrashIcon />
        </button>
      </div>

      <div className="cardMeaning">
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
      </div>

      <footer className="cardFooter">
        <time dateTime={new Date(item.createdAt).toISOString()}>{savedDate}</time>
        {item.sourceUrl ? (
          <a
            aria-label={`${t('savedOpenSource')}: ${sourceLabel}`}
            className="sourceLink"
            href={item.sourceUrl}
            rel="noreferrer"
            target="_blank"
            title={item.sourceUrl}
          >
            <span>{sourceLabel}</span>
            <ExternalLinkIcon />
          </a>
        ) : (
          <span className="sourceLabel">{sourceLabel}</span>
        )}
      </footer>
    </article>
  );
}

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [localeVersion, setLocaleVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedbackClearTimeoutRef = useRef<number | null>(null);
  const sortedItems = useMemo(
    () => [...items].sort((first, second) => second.createdAt - first.createdAt),
    [items]
  );

  useEffect(() => {
    let isMounted = true;

    void getSavedItems().then((savedItems) => {
      if (isMounted) {
        setItems(savedItems);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(
    () => subscribeToInterfaceLanguage(() => setLocaleVersion((version) => version + 1)),
    []
  );

  useEffect(() => {
    document.title = t('savedDocumentTitle');
  }, [localeVersion]);

  useEffect(
    () => () => {
      if (feedbackClearTimeoutRef.current !== null) {
        window.clearTimeout(feedbackClearTimeoutRef.current);
      }
    },
    []
  );

  function showActionFeedback(tone: 'success' | 'error', message: string) {
    if (feedbackClearTimeoutRef.current !== null) {
      window.clearTimeout(feedbackClearTimeoutRef.current);
    }
    setActionFeedback({ tone, message });
    feedbackClearTimeoutRef.current = window.setTimeout(() => {
      setActionFeedback(null);
      feedbackClearTimeoutRef.current = null;
    }, 4000);
  }

  async function handleDelete(itemId: string) {
    await deleteSavedItem(itemId);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  async function handleBackup() {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      const savedItems = await getSavedItems();
      const backup = createSavedItemsBackup(savedItems);
      // Browser download UI is enough feedback; no page banner.
      downloadTextFile(buildBackupFilename(), serializeSavedItemsBackup(backup));
      setActionFeedback(null);
    } finally {
      setIsBusy(false);
    }
  }

  function handleRestoreClick() {
    if (isBusy) {
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleRestoreFile(file: File | undefined) {
    if (!file || isBusy) {
      return;
    }

    setIsBusy(true);
    try {
      const raw = await file.text();
      const parsed = parseSavedItemsBackup(raw);
      if (!parsed.ok) {
        showActionFeedback(
          'error',
          parsed.error === 'unsupported_version'
            ? t('savedRestoreUnsupportedVersion')
            : t('savedRestoreInvalidFile')
        );
        return;
      }

      const result = await mergeSavedItemsFromBackup(parsed.backup.items);
      setItems(result.items);
      showActionFeedback(
        'success',
        t('savedRestoreSuccess', [String(result.added), String(result.updated)])
      );
    } catch {
      showActionFeedback('error', t('savedRestoreInvalidFile'));
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <main className="savedPage">
      <header className="pageHeader">
        <ManagementHeader activePage="saved" />
        <div className="titleRow">
          <div>
            <h1>{t('savedPageTitle')}</h1>
            <p>{t('savedPageDescription')}</p>
          </div>
          <div className="titleMeta">
            {!isLoading ? (
              <span className="itemCount">
                {sortedItems.length} {t('savedCountLabel')}
              </span>
            ) : null}
            <div className="backupActions">
              <button
                className="secondaryButton"
                disabled={isLoading || isBusy}
                type="button"
                onClick={() => {
                  void handleBackup();
                }}
              >
                {t('savedBackupButton')}
              </button>
              <button
                className="secondaryButton"
                disabled={isLoading || isBusy}
                type="button"
                onClick={handleRestoreClick}
              >
                {t('savedRestoreButton')}
              </button>
              <input
                accept={`.lingualens-backup,application/json`}
                className="backupFileInput"
                ref={fileInputRef}
                type="file"
                onChange={(event) => {
                  void handleRestoreFile(event.target.files?.[0]);
                }}
              />
            </div>
            {actionFeedback ? (
              <p
                aria-live="polite"
                className={
                  actionFeedback.tone === 'error'
                    ? 'backupFeedback backupFeedbackError'
                    : 'backupFeedback'
                }
              >
                {actionFeedback.message}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {isLoading ? <p className="statusCard">{t('commonLoading')}</p> : null}

      {!isLoading && sortedItems.length === 0 ? (
        <section className="emptyState">
          <h2>{t('savedEmptyTitle')}</h2>
          <p>{t('emptySavedHint')}</p>
        </section>
      ) : null}

      {sortedItems.length > 0 ? (
        <section className="savedCards" aria-label={t('savedPageListAriaLabel')}>
          {sortedItems.map((item) => (
            <SavedCard
              item={item}
              key={item.id}
              onDelete={(itemId) => {
                void handleDelete(itemId);
              }}
            />
          ))}
        </section>
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
