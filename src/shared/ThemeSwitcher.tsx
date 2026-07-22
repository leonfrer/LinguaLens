import { useEffect, useRef, useState } from 'react';
import { t } from './i18n';
import { DEFAULT_SETTINGS, updateSettings } from './storage';
import { applyAppearance, subscribeToAppearance } from './theme';
import type { Appearance } from './types';
import './theme.css';

const APPEARANCE_OPTIONS: Appearance[] = ['light', 'dark', 'system'];

function ThemeIcon({ appearance }: { appearance: Appearance }) {
  if (appearance === 'light') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 2.2v1.5M10 16.3v1.5M2.2 10h1.5M16.3 10h1.5M4.5 4.5l1.1 1.1M14.4 14.4l1.1 1.1M15.5 4.5l-1.1 1.1M5.6 14.4l-1.1 1.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (appearance === 'dark') {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M16.6 12.1A6.6 6.6 0 0 1 7.9 3.4a6.7 6.7 0 1 0 8.7 8.7Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <rect x="2.5" y="3.5" width="15" height="10.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 17h6M10 14v3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function optionLabel(appearance: Appearance): string {
  return t(
    appearance === 'light'
      ? 'themeLight'
      : appearance === 'dark'
        ? 'themeDark'
        : 'themeSystem'
  );
}

export function ThemeSwitcher() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_SETTINGS.appearance);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToAppearance(setAppearance), []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>('.themeSwitcherButton')?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      containerRef.current
        ?.querySelector<HTMLButtonElement>('.themeMenuItem[aria-checked="true"]')
        ?.focus();
    }
  }, [isOpen]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('.themeMenuItem')
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  async function handleAppearanceChange(nextAppearance: Appearance) {
    const previousAppearance = appearance;
    setAppearance(nextAppearance);
    applyAppearance(nextAppearance);
    setIsOpen(false);
    setError('');

    try {
      await updateSettings({ appearance: nextAppearance });
    } catch {
      setAppearance(previousAppearance);
      applyAppearance(previousAppearance);
      setError(t('themeSaveError'));
    }
  }

  return (
    <div className="themeSwitcher" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t('themeSwitcherLabel', optionLabel(appearance))}
        className="themeSwitcherButton"
        title={t('themeSwitcherLabel', optionLabel(appearance))}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <ThemeIcon appearance={appearance} />
      </button>
      {isOpen ? (
        <div
          aria-label={t('themeMenuLabel')}
          className="themeMenu"
          role="menu"
          onKeyDown={handleMenuKeyDown}
        >
          {APPEARANCE_OPTIONS.map((option) => (
            <button
              aria-checked={appearance === option}
              className="themeMenuItem"
              key={option}
              role="menuitemradio"
              type="button"
              onClick={() => void handleAppearanceChange(option)}
            >
              <ThemeIcon appearance={option} />
              <span>{optionLabel(option)}</span>
              <span className="themeMenuCheck" aria-hidden="true">
                {appearance === option ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? <span className="themeSwitcherError" role="status">{error}</span> : null}
    </div>
  );
}
