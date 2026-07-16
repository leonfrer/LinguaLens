import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { t } from '../shared/i18n';
import { deleteSavedItem, getSavedItems } from '../shared/storage';
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
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(createdAt);
}

function HighlightedContext({ item }: { item: SavedItem }) {
  const context = item.sentenceContext?.trim() || item.text;
  const range = findTextRange(context, item.text);

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
          <p className="pronunciationText">{item.pronunciation}</p>
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

function App() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  async function handleDelete(itemId: string) {
    await deleteSavedItem(itemId);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  return (
    <main className="savedPage">
      <header className="pageHeader">
        <div className="brandRow">
          <img className="brandMark" src="icons/icon48.png" alt="" />
          <span>LinguaLens</span>
        </div>
        <div className="titleRow">
          <div>
            <h1>{t('savedPageTitle')}</h1>
            <p>{t('savedPageDescription')}</p>
          </div>
          {!isLoading ? (
            <span className="itemCount">
              {sortedItems.length} {t('savedCountLabel')}
            </span>
          ) : null}
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
