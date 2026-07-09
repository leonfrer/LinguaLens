import { afterEach, describe, expect, it, vi } from 'vitest';
import enMessages from '../../public/_locales/en/messages.json';
import zhCNMessages from '../../public/_locales/zh_CN/messages.json';
import zhTWMessages from '../../public/_locales/zh_TW/messages.json';
import { defaultMessages, t } from './i18n';

describe('t', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to the default message table outside Chrome i18n', () => {
    vi.stubGlobal('chrome', undefined);

    expect(t('settingsTitle')).toBe('Settings');
  });

  it('applies fallback substitutions', () => {
    vi.stubGlobal('chrome', undefined);

    expect(t('savedDeleteLabel', 'bonjour')).toBe('Delete bonjour');
    expect(t('translationUnableWithProvider', ['NVIDIA NIM'])).toBe(
      'Unable to translate with NVIDIA NIM.'
    );
  });

  it('prefers Chrome i18n messages when available', () => {
    const getMessage = vi.fn().mockReturnValue('設定');
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage
      }
    });

    expect(t('settingsTitle')).toBe('設定');
    expect(getMessage).toHaveBeenCalledWith('settingsTitle', undefined);
  });

  it('uses the Chrome UI language for bundled runtime messages', () => {
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: vi.fn().mockReturnValue('Settings'),
        getUILanguage: vi.fn().mockReturnValue('zh-CN')
      }
    });

    expect(t('settingsTitle')).toBe('设置');
    expect(t('savedDeleteLabel', 'bonjour')).toBe('删除 bonjour');
  });
});

describe('Chrome locale message files', () => {
  it('define the same message keys as the fallback table', () => {
    const fallbackKeys = Object.keys(defaultMessages).sort();

    for (const messages of [enMessages, zhTWMessages, zhCNMessages]) {
      expect(Object.keys(messages).sort()).toEqual(fallbackKeys);
    }
  });
});
