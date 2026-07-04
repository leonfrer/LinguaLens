import type { TargetLanguage } from './types';

const dictionary: Record<string, string> = {
  hello: '你好',
  world: '世界',
  language: '语言',
  reading: '阅读',
  text: '文本',
  word: '单词',
  phrase: '短语',
  save: '保存',
  learn: '学习',
  browser: '浏览器',
  page: '页面'
};

export function createMockTranslation(text: string, targetLanguage: TargetLanguage): string {
  if (targetLanguage !== 'zh-CN') {
    return `[Mock translation to ${targetLanguage}] ${text}`;
  }

  const translatedWords = text
    .toLowerCase()
    .match(/[a-z]+/g)
    ?.map((word) => dictionary[word])
    .filter(Boolean);

  if (translatedWords?.length) {
    return `[MVP 模拟翻译] ${translatedWords.join(' / ')}`;
  }

  return `[MVP 模拟翻译] ${text}`;
}
