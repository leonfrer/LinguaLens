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
  DEFAULT_SAVED_ITEMS_VIEW_MODE,
  deleteSavedItem,
  getSavedItems,
  getSavedItemsViewMode,
  mergeSavedItemsFromBackup,
  setSavedItemsViewMode,
  type SavedItemsViewMode
} from '../shared/storage';
import { Toast, useToast } from '../shared/Toast';
import type { SavedItem } from '../shared/types';
import { groupSavedItemsBySource, type SavedItemGroup } from './group-by-source';
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

function MoreIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" {...props}>
      <circle cx="10" cy="4.5" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="15.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function ChevronIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" {...props}>
      <path
        d="M4 6.25 8 10.25 12 6.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
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

function SavedCard({
  item,
  onDelete,
  hideSource = false
}: {
  item: SavedItem;
  onDelete: (itemId: string) => void;
  hideSource?: boolean;
}) {
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
        {!hideSource && item.sourceUrl ? (
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
        ) : null}
        {!hideSource && !item.sourceUrl ? (
          <span className="sourceLabel">{sourceLabel}</span>
        ) : null}
      </footer>
    </article>
  );
}

function groupDomId(groupKey: string, suffix: string): string {
  return `saved-group-${encodeURIComponent(groupKey).replace(/%/g, '_')}-${suffix}`;
}

function SourceStack({
  group,
  expanded,
  onToggle,
  onDelete
}: {
  group: SavedItemGroup;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (itemId: string) => void;
}) {
  const label = group.label || t('commonUnknownSource');
  const countLabel = t('savedGroupItemCount', String(group.items.length));
  const headingId = groupDomId(group.key, 'title');
  const panelId = groupDomId(group.key, 'panel');
  const previewItem = group.items[0];
  const toggleLabel = expanded
    ? t('savedStackCollapseLabel', label)
    : t('savedStackExpandLabel', label);

  return (
    <section
      className={`savedStack${expanded ? ' is-expanded' : ' is-collapsed'}`}
      aria-labelledby={headingId}
    >
      <div className="savedStackCard">
        <header className="savedStackHeader">
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            aria-label={toggleLabel}
            className="savedStackToggle"
            type="button"
            onClick={onToggle}
          >
            <span className="savedStackTitleRow">
              <h2 className="savedStackTitle" id={headingId} title={label}>
                {label}
              </h2>
              <span className="savedStackCount">{countLabel}</span>
              <ChevronIcon className="savedStackChevron" />
            </span>
          </button>
          {group.sourceUrl ? (
            <a
              aria-label={`${t('savedOpenSource')}: ${label}`}
              className="savedStackSourceLink"
              href={group.sourceUrl}
              rel="noreferrer"
              target="_blank"
              title={group.sourceUrl}
            >
              <span>{group.sourceUrl}</span>
              <ExternalLinkIcon />
            </a>
          ) : null}
        </header>

        {!expanded && previewItem ? (
          <div className="savedStackPreview">
            <p className="savedStackPreviewContext">
              <HighlightedContext item={previewItem} />
            </p>
            <p className="savedStackPreviewTranslation">{previewItem.translation}</p>
          </div>
        ) : null}

        {expanded ? (
          <div
            className="savedCards savedStackPanel"
            id={panelId}
            role="region"
            aria-labelledby={headingId}
          >
            {group.items.map((item) => (
              <SavedCard hideSource item={item} key={item.id} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div hidden id={panelId} />
        )}
      </div>
    </section>
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
  const [viewMode, setViewMode] = useState<SavedItemsViewMode>(DEFAULT_SAVED_ITEMS_VIEW_MODE);
  const [expandedStackKeys, setExpandedStackKeys] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [localeVersion, setLocaleVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const { toast, showToast, clearToast } = useToast();
  const sortedItems = useMemo(
    () => [...items].sort((first, second) => second.createdAt - first.createdAt),
    [items]
  );
  const sourceGroups = useMemo(() => groupSavedItemsBySource(items), [items]);
  const activeStackKeys = useMemo(
    () => new Set(sourceGroups.map((group) => group.key)),
    [sourceGroups]
  );

  useEffect(() => {
    let isMounted = true;

    void Promise.all([getSavedItems(), getSavedItemsViewMode()]).then(
      ([savedItems, savedViewMode]) => {
        if (isMounted) {
          setItems(savedItems);
          setViewMode(savedViewMode);
          setIsLoading(false);
        }
      }
    );

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

  useEffect(() => {
    if (!isActionsMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionsMenuOpen(false);
        actionsMenuRef.current
          ?.querySelector<HTMLButtonElement>('.savedActionsButton')
          ?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActionsMenuOpen]);

  useEffect(() => {
    if (isActionsMenuOpen) {
      actionsMenuRef.current
        ?.querySelector<HTMLButtonElement>('.savedActionsMenuItem')
        ?.focus();
    }
  }, [isActionsMenuOpen]);

  function handleActionsMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('.savedActionsMenuItem')
    );
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? menuItems.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % menuItems.length
            : (currentIndex - 1 + menuItems.length) % menuItems.length;
    menuItems[nextIndex]?.focus();
  }

  async function handleDelete(itemId: string) {
    await deleteSavedItem(itemId);
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  function handleViewModeChange(nextMode: SavedItemsViewMode) {
    if (nextMode === viewMode) {
      return;
    }
    setViewMode(nextMode);
    void setSavedItemsViewMode(nextMode);
  }

  function handleStackToggle(groupKey: string) {
    setExpandedStackKeys((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  function isStackExpanded(groupKey: string): boolean {
    return expandedStackKeys.has(groupKey) && activeStackKeys.has(groupKey);
  }

  async function handleBackup() {
    if (isBusy) {
      return;
    }

    setIsActionsMenuOpen(false);
    setIsBusy(true);
    try {
      const savedItems = await getSavedItems();
      const backup = createSavedItemsBackup(savedItems);
      // Browser download UI is enough feedback; no page banner.
      downloadTextFile(buildBackupFilename(), serializeSavedItemsBackup(backup));
      clearToast();
    } finally {
      setIsBusy(false);
    }
  }

  function handleRestoreClick() {
    if (isBusy) {
      return;
    }
    setIsActionsMenuOpen(false);
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
        showToast(
          'error',
          parsed.error === 'unsupported_version'
            ? t('savedRestoreUnsupportedVersion')
            : t('savedRestoreInvalidFile')
        );
        return;
      }

      const result = await mergeSavedItemsFromBackup(parsed.backup.items);
      setItems(result.items);
      showToast(
        'success',
        t('savedRestoreSuccess', [String(result.added), String(result.updated)])
      );
    } catch {
      showToast('error', t('savedRestoreInvalidFile'));
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
            <div className="titleMetaRow">
              {!isLoading ? (
                <span className="itemCount">
                  {sortedItems.length} {t('savedCountLabel')}
                </span>
              ) : null}
              {!isLoading && sortedItems.length > 0 ? (
                <div
                  aria-label={t('savedViewModeLabel')}
                  className="savedViewToggle"
                  role="radiogroup"
                >
                  <button
                    aria-checked={viewMode === 'list'}
                    className="savedViewToggleButton"
                    role="radio"
                    type="button"
                    onClick={() => {
                      handleViewModeChange('list');
                    }}
                  >
                    {t('savedViewList')}
                  </button>
                  <button
                    aria-checked={viewMode === 'byPage'}
                    className="savedViewToggleButton"
                    role="radio"
                    type="button"
                    onClick={() => {
                      handleViewModeChange('byPage');
                    }}
                  >
                    {t('savedViewByPage')}
                  </button>
                </div>
              ) : null}
              <div className="savedActions" ref={actionsMenuRef}>
                <button
                  aria-expanded={isActionsMenuOpen}
                  aria-haspopup="menu"
                  aria-label={t('savedMoreActionsLabel')}
                  className="savedActionsButton"
                  disabled={isLoading || isBusy}
                  title={t('savedMoreActionsLabel')}
                  type="button"
                  onClick={() => setIsActionsMenuOpen((current) => !current)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setIsActionsMenuOpen(true);
                    }
                  }}
                >
                  <MoreIcon />
                </button>
                {isActionsMenuOpen ? (
                  <div
                    aria-label={t('savedMoreActionsMenuLabel')}
                    className="savedActionsMenu"
                    role="menu"
                    onKeyDown={handleActionsMenuKeyDown}
                  >
                    <button
                      className="savedActionsMenuItem"
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        void handleBackup();
                      }}
                    >
                      {t('savedBackupButton')}
                    </button>
                    <button
                      className="savedActionsMenuItem"
                      role="menuitem"
                      type="button"
                      onClick={handleRestoreClick}
                    >
                      {t('savedRestoreButton')}
                    </button>
                  </div>
                ) : null}
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
            </div>
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

      {sortedItems.length > 0 && viewMode === 'list' ? (
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

      {sortedItems.length > 0 && viewMode === 'byPage' ? (
        <div className="savedStacks" aria-label={t('savedPageGroupsAriaLabel')}>
          {sourceGroups.map((group) => (
            <SourceStack
              expanded={isStackExpanded(group.key)}
              group={group}
              key={group.key}
              onDelete={(itemId) => {
                void handleDelete(itemId);
              }}
              onToggle={() => {
                handleStackToggle(group.key);
              }}
            />
          ))}
        </div>
      ) : null}

      <Toast toast={toast} onDismiss={clearToast} />
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
