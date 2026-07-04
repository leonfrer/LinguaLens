import { describe, expect, it, vi } from 'vitest';
import { createSavedItem } from './storage';

vi.stubGlobal('crypto', {
  randomUUID: () => 'fixed-id'
});

describe('createSavedItem', () => {
  it('adds metadata around a saved text payload', () => {
    expect(
      createSavedItem(
        {
          text: 'hello',
          translation: '你好',
          targetLanguage: 'zh-CN',
          sourceUrl: 'https://example.com',
          sourceTitle: 'Example'
        },
        123
      )
    ).toEqual({
      id: '123-fixed-id',
      text: 'hello',
      translation: '你好',
      targetLanguage: 'zh-CN',
      sourceUrl: 'https://example.com',
      sourceTitle: 'Example',
      createdAt: 123
    });
  });
});
