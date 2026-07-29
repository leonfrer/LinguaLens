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
  translationUnableWithProvider: 'Unable to translate with $1.',
  translationProviderUnauthorized: 'The provider rejected the API key (HTTP $1). Check that the key is correct and has access to this model.',
  translationProviderForbidden: 'The provider denied this request (HTTP $1). Check the key permissions, account status, and model access.',
  translationProviderNotFound: 'The endpoint or model was not found (HTTP $1). Check the base URL and model ID in settings.',
  translationProviderRateLimited: 'The provider rate-limited this request (HTTP $1). Wait a moment, or check your quota and billing limits.',
  translationProviderServerError: 'The provider is temporarily unavailable (HTTP $1). Try again later or check the provider status.',
  translationProviderBadRequest: 'The provider rejected the request (HTTP $1). Check that the base URL and model ID are supported.',
  translationProviderNetworkError: 'LinguaLens could not reach the provider. Check your internet connection and base URL, then try again.',
  translationProviderRequestFailed: 'The provider returned an error (HTTP $1): $2',
  translationProviderUnknownError: 'The translation request failed: $1'
};

const localeMessages: Record<InterfaceLocale, Record<MessageKey, string>> = {
  en: defaultMessages,
  'zh-CN': {
    ...flattenMessages(zhCNMessages),
    savedDeleteLabel: '删除 $1',
    modelProviderUnableToLoad: '无法从 $1 加载模型。',
    translationUnableWithProvider: '无法使用 $1 翻译。',
    translationProviderUnauthorized: '服务商拒绝了 API 密钥（HTTP $1）。请检查密钥是否正确，以及是否有权访问此模型。',
    translationProviderForbidden: '服务商拒绝了此请求（HTTP $1）。请检查密钥权限、账户状态和模型访问权限。',
    translationProviderNotFound: '找不到接口或模型（HTTP $1）。请检查设置中的基础 URL 和模型 ID。',
    translationProviderRateLimited: '请求过于频繁或已超出额度（HTTP $1）。请稍后再试，并检查额度和计费限制。',
    translationProviderServerError: '服务商暂时不可用（HTTP $1）。请稍后再试，或检查服务商状态。',
    translationProviderBadRequest: '服务商拒绝了请求（HTTP $1）。请检查基础 URL 和模型 ID 是否受支持。',
    translationProviderNetworkError: 'LinguaLens 无法连接到服务商。请检查网络连接和基础 URL，然后重试。',
    translationProviderRequestFailed: '服务商返回了错误（HTTP $1）：$2',
    translationProviderUnknownError: '翻译请求失败：$1'
  },
  'zh-TW': {
    ...flattenMessages(zhTWMessages),
    savedDeleteLabel: '刪除 $1',
    modelProviderUnableToLoad: '無法從 $1 載入模型。',
    translationUnableWithProvider: '無法使用 $1 翻譯。',
    translationProviderUnauthorized: '服務商拒絕了 API 金鑰（HTTP $1）。請檢查金鑰是否正確，以及是否有權限存取此模型。',
    translationProviderForbidden: '服務商拒絕了此請求（HTTP $1）。請檢查金鑰權限、帳戶狀態和模型存取權限。',
    translationProviderNotFound: '找不到端點或模型（HTTP $1）。請檢查設定中的基礎 URL 和模型 ID。',
    translationProviderRateLimited: '請求過於頻繁或已超出額度（HTTP $1）。請稍後再試，並檢查額度和計費限制。',
    translationProviderServerError: '服務商暫時無法使用（HTTP $1）。請稍後再試，或檢查服務商狀態。',
    translationProviderBadRequest: '服務商拒絕了請求（HTTP $1）。請檢查基礎 URL 和模型 ID 是否受支援。',
    translationProviderNetworkError: 'LinguaLens 無法連線到服務商。請檢查網路連線和基礎 URL，然後重試。',
    translationProviderRequestFailed: '服務商返回了錯誤（HTTP $1）：$2',
    translationProviderUnknownError: '翻譯請求失敗：$1'
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
