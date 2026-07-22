import enMessages from '../../public/_locales/en/messages.json';
import zhCNMessages from '../../public/_locales/zh_CN/messages.json';
import zhTWMessages from '../../public/_locales/zh_TW/messages.json';
import type { InterfaceLanguage } from './types';

type LocaleMessages = typeof enMessages;
export type InterfaceLocale = Exclude<InterfaceLanguage, 'system'>;
export type MessageKey = keyof LocaleMessages;

let currentInterfaceLanguage: InterfaceLanguage = 'system';

function flattenMessages(messages: LocaleMessages): Record<keyof LocaleMessages, string> {
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [key, value.message])
  ) as Record<keyof LocaleMessages, string>;
}

export const defaultMessages: Record<MessageKey, string> = {
  ...flattenMessages(enMessages),
  savedDeleteLabel: 'Delete $1',
  modelProviderUnableToLoad: 'Unable to load models from $1.',
  translationUnableWithProvider: 'Unable to translate with $1.'
};

const localeMessages: Record<InterfaceLocale, Record<MessageKey, string>> = {
  en: defaultMessages,
  'zh-CN': {
    ...flattenMessages(zhCNMessages),
    savedDeleteLabel: '删除 $1',
    modelProviderUnableToLoad: '无法从 $1 加载模型。',
    translationUnableWithProvider: '无法使用 $1 翻译。'
  },
  'zh-TW': {
    ...flattenMessages(zhTWMessages),
    savedDeleteLabel: '刪除 $1',
    modelProviderUnableToLoad: '無法從 $1 載入模型。',
    translationUnableWithProvider: '無法使用 $1 翻譯。'
  }
};

function normalizeLocale(locale: string): InterfaceLocale {
  const normalizedLocale = locale.replace('_', '-').toLowerCase();

  if (normalizedLocale === 'zh-cn' || normalizedLocale.startsWith('zh-hans')) {
    return 'zh-CN';
  }

  if (normalizedLocale === 'zh-tw' || normalizedLocale.startsWith('zh-hant')) {
    return 'zh-TW';
  }

  return 'en';
}

function getBrowserUiLanguage(): string {
  return typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
    ? chrome.i18n.getUILanguage()
    : '';
}

export function resolveInterfaceLocale(
  interfaceLanguage: InterfaceLanguage,
  browserUiLanguage = getBrowserUiLanguage()
): InterfaceLocale {
  return interfaceLanguage === 'system'
    ? normalizeLocale(browserUiLanguage)
    : interfaceLanguage;
}

export function setInterfaceLanguage(interfaceLanguage: InterfaceLanguage): InterfaceLocale {
  currentInterfaceLanguage = interfaceLanguage;
  return resolveInterfaceLocale(interfaceLanguage);
}

export function getInterfaceLocale(): InterfaceLocale {
  return resolveInterfaceLocale(currentInterfaceLanguage);
}

function getRuntimeMessages(): Record<MessageKey, string> | undefined {
  const uiLanguage = getBrowserUiLanguage();

  if (currentInterfaceLanguage === 'system' && !uiLanguage) {
    return undefined;
  }

  return localeMessages[getInterfaceLocale()];
}

export function t(key: MessageKey, substitutions?: string | string[]): string {
  const runtimeMessage = getRuntimeMessages()?.[key];

  if (runtimeMessage) {
    return applySubstitutions(runtimeMessage, substitutions);
  }

  const chromeMessage =
    typeof chrome !== 'undefined' && chrome.i18n?.getMessage
      ? chrome.i18n.getMessage(key, substitutions)
      : '';

  if (chromeMessage) {
    return chromeMessage;
  }

  return applySubstitutions(defaultMessages[key], substitutions);
}

function applySubstitutions(message: string, substitutions?: string | string[]): string {
  const values = Array.isArray(substitutions)
    ? substitutions
    : substitutions === undefined
      ? []
      : [substitutions];

  return values.reduce(
    (message, value, index) => message.split(`$${index + 1}`).join(value),
    message
  );
}
