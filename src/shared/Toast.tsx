import { useEffect, useRef, useState } from 'react';
import { t } from './i18n';
import './toast.css';

export type ToastTone = 'success' | 'error';

export type ToastMessage = {
  tone: ToastTone;
  message: string;
};

const DEFAULT_DURATION_MS = 4000;

export function useToast(durationMs = DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (clearTimeoutRef.current !== null) {
        window.clearTimeout(clearTimeoutRef.current);
      }
    },
    []
  );

  function clearToast() {
    if (clearTimeoutRef.current !== null) {
      window.clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
    setToast(null);
  }

  function showToast(tone: ToastTone, message: string) {
    if (clearTimeoutRef.current !== null) {
      window.clearTimeout(clearTimeoutRef.current);
    }
    setToast({ tone, message });
    clearTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      clearTimeoutRef.current = null;
    }, durationMs);
  }

  return { toast, showToast, clearToast };
}

function SuccessIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.4 10.2 8.9 12.7 13.6 7.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.4v4.6M10 13.5h.01"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function Toast({
  toast,
  onDismiss
}: {
  toast: ToastMessage | null;
  onDismiss?: () => void;
}) {
  if (!toast) {
    return null;
  }

  return (
    <div className="appToastHost" aria-live="polite" aria-atomic="true">
      <div className={`appToast appToast--${toast.tone}`} role="status">
        <span className="appToastIcon">
          {toast.tone === 'success' ? <SuccessIcon /> : <ErrorIcon />}
        </span>
        <p className="appToastMessage">{toast.message}</p>
        {onDismiss ? (
          <button
            aria-label={t('panelClose')}
            className="appToastDismiss"
            type="button"
            onClick={onDismiss}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path
                d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
