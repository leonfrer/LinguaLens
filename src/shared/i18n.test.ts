import { afterEach, describe, expect, it, vi } from 'vitest';
import enMessages from '../../public/_locales/en/messages.json';
import zhCNMessages from '../../public/_locales/zh_CN/messages.json';
import zhTWMessages from '../../public/_locales/zh_TW/messages.json';
import {
  defaultMessages,
  getInterfaceLocale,
  resolveInterfaceLocale,
  setInterfaceLanguage,
  t
} from './i18n';

describe('t', () => {
  afterEach(() => {
    setInterfaceLanguage('system');
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

  it('lets an explicit interface language override the Chrome UI language', () => {
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: vi.fn().mockReturnValue('设置'),
        getUILanguage: vi.fn().mockReturnValue('zh-CN')
      }
    });

    setInterfaceLanguage('en');

    expect(getInterfaceLocale()).toBe('en');
    expect(t('settingsTitle')).toBe('Settings');
  });

  it('resolves supported Chinese variants and falls unknown locales back to English', () => {
    expect(resolveInterfaceLocale('system', 'zh-Hans')).toBe('zh-CN');
    expect(resolveInterfaceLocale('system', 'zh-Hant-TW')).toBe('zh-TW');
    expect(resolveInterfaceLocale('system', 'fr-FR')).toBe('en');
    expect(resolveInterfaceLocale('zh-TW', 'en-US')).toBe('zh-TW');
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
