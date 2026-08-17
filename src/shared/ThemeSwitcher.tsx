import { useEffect, useRef, useState } from 'react';
import { t } from './i18n';
import { DEFAULT_SETTINGS, updateSettings } from './storage';
import { applyAppearance, subscribeToAppearance } from './theme';
import type { Appearance } from './types';
import './theme.css';

const APPEARANCE_OPTIONS: Appearance[] = ['light', 'dark', 'system'];

function ThemeIcon({ appearance }: { appearance: Appearance }) {
  // Material Symbols Outlined (Apache-2.0): light_mode / dark_mode / routine.
  if (appearance === 'light') {
    return (
      <svg aria-hidden="true" viewBox="0 -960 960 960">
        <path
          fill="currentColor"
          d="M565-395q35-35 35-85t-35-85q-35-35-85-35t-85 35q-35 35-35 85t35 85q35 35 85 35t85-35Zm-226.5 56.5Q280-397 280-480t58.5-141.5Q397-680 480-680t141.5 58.5Q680-563 680-480t-58.5 141.5Q563-280 480-280t-141.5-58.5ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z"
        />
      </svg>
    );
  }

  if (appearance === 'dark') {
    return (
      <svg aria-hidden="true" viewBox="0 -960 960 960">
        <path
          fill="currentColor"
          d="M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 -960 960 960">
      <path
        fill="currentColor"
        d="M337.5-463Q311-498 289-537q-5 14-6.5 28.5T281-480q0 83 58 141t141 58q14 0 28.5-2t28.5-6q-39-22-74-48.5T396-396q-32-32-58.5-67ZM567-364.5Q630-328 702-308q-40 51-98 79.5T481-200q-117 0-198.5-81.5T201-480q0-65 28.5-123t79.5-98q20 72 56.5 135T453-452q51 51 114 87.5ZM743-380q-20-5-39.5-11T665-405q8-18 11.5-36.5T680-480q0-83-58.5-141.5T480-680q-20 0-38.5 3.5T405-665q-8-19-13.5-38T381-742q24-9 49-13.5t51-4.5q117 0 198.5 81.5T761-480q0 26-4.5 51T743-380ZM440-840v-120h80v120h-80Zm0 840v-120h80V0h-80Zm323-706-57-57 85-84 57 56-85 85ZM169-113l-57-56 85-85 57 57-85 84Zm671-327v-80h120v80H840ZM0-440v-80h120v80H0Zm791 328-85-85 57-57 84 85-56 57ZM197-706l-84-85 56-57 85 85-57 57Zm199 310Z"
      />
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
