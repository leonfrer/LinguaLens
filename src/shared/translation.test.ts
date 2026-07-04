import { describe, expect, it } from 'vitest';
import { createMockTranslation } from './translation';

describe('createMockTranslation', () => {
  it('marks Chinese mock output clearly', () => {
    expect(createMockTranslation('hello world', 'zh-CN')).toBe(
      '[MVP 模拟翻译] 你好 / 世界'
    );
  });

  it('keeps unsupported target language output explicit', () => {
    expect(createMockTranslation('hello', 'en')).toBe('[Mock translation to en] hello');
  });
});
