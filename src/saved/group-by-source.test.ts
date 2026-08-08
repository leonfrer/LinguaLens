import { describe, expect, it } from 'vitest';
import type { SavedItem } from '../shared/types';
import {
  UNKNOWN_SOURCE_GROUP_KEY,
  groupSavedItemsBySource,
  normalizeSourcePageKey
} from './group-by-source';

function makeItem(overrides: Partial<SavedItem> & Pick<SavedItem, 'id' | 'text'>): SavedItem {
  return {
    translation: '译',
    explanationLanguage: 'zh-CN',
    sourceUrl: 'https://example.com/article',
    sourceTitle: 'Example Article',
    createdAt: 1,
    ...overrides
  };
}

describe('normalizeSourcePageKey', () => {
  it('strips query params while keeping origin, path, and hash', () => {
    expect(normalizeSourcePageKey('https://example.com/a/b?utm_source=x&ref=1#section')).toBe(
      'https://example.com/a/b#section'
    );
  });

  it('merges UTM variants of the same path', () => {
    const a = normalizeSourcePageKey('https://example.com/post?utm_campaign=1');
    const b = normalizeSourcePageKey('https://example.com/post?utm_campaign=2');
    expect(a).toBe(b);
    expect(a).toBe('https://example.com/post');
  });

  it('keeps different hashes distinct (SPA routes / anchors)', () => {
    expect(normalizeSourcePageKey('https://app.example.com/#/one')).toBe(
      'https://app.example.com/#/one'
    );
    expect(normalizeSourcePageKey('https://app.example.com/#/two')).toBe(
      'https://app.example.com/#/two'
    );
  });

  it('trims trailing slash on non-root pathnames', () => {
    expect(normalizeSourcePageKey('https://example.com/foo/')).toBe('https://example.com/foo');
    expect(normalizeSourcePageKey('https://example.com/')).toBe('https://example.com/');
  });

  it('returns null for empty or invalid URLs', () => {
    expect(normalizeSourcePageKey('')).toBeNull();
    expect(normalizeSourcePageKey('   ')).toBeNull();
    expect(normalizeSourcePageKey('not a url')).toBeNull();
  });
});

describe('groupSavedItemsBySource', () => {
  it('clusters items that share the same page key after query stripping', () => {
    const items = [
      makeItem({
        id: '1',
        text: 'a',
        sourceUrl: 'https://example.com/article?utm=1',
        sourceTitle: 'Article',
        createdAt: 10
      }),
      makeItem({
        id: '2',
        text: 'b',
        sourceUrl: 'https://example.com/article?utm=2',
        sourceTitle: 'Article',
        createdAt: 20
      }),
      makeItem({
        id: '3',
        text: 'c',
        sourceUrl: 'https://other.test/page',
        sourceTitle: 'Other',
        createdAt: 15
      })
    ];

    const groups = groupSavedItemsBySource(items);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.key).toBe('https://example.com/article');
    expect(groups[0]!.items.map((item) => item.id)).toEqual(['2', '1']);
    expect(groups[0]!.latestCreatedAt).toBe(20);
    expect(groups[1]!.key).toBe('https://other.test/page');
    expect(groups[1]!.items.map((item) => item.id)).toEqual(['3']);
  });

  it('orders groups by most recent activity', () => {
    const items = [
      makeItem({
        id: 'old-page',
        text: 'old',
        sourceUrl: 'https://a.test/p',
        sourceTitle: 'A',
        createdAt: 100
      }),
      makeItem({
        id: 'new-page',
        text: 'new',
        sourceUrl: 'https://b.test/p',
        sourceTitle: 'B',
        createdAt: 200
      })
    ];

    const groups = groupSavedItemsBySource(items);
    expect(groups.map((group) => group.key)).toEqual([
      'https://b.test/p',
      'https://a.test/p'
    ]);
  });

  it('puts missing or invalid URLs in a single unknown group', () => {
    const items = [
      makeItem({
        id: '1',
        text: 'a',
        sourceUrl: '',
        sourceTitle: '',
        createdAt: 5
      }),
      makeItem({
        id: '2',
        text: 'b',
        sourceUrl: 'not-a-url',
        sourceTitle: '',
        createdAt: 10
      }),
      makeItem({
        id: '3',
        text: 'c',
        sourceUrl: 'https://ok.test/x',
        sourceTitle: 'OK',
        createdAt: 1
      })
    ];

    const groups = groupSavedItemsBySource(items);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.key).toBe(UNKNOWN_SOURCE_GROUP_KEY);
    expect(groups[0]!.items.map((item) => item.id)).toEqual(['2', '1']);
    expect(groups[0]!.label).toBe('');
    expect(groups[0]!.sourceUrl).toBe('');
    expect(groups[1]!.key).toBe('https://ok.test/x');
  });

  it('uses the newest item title for the group label and open URL', () => {
    const items = [
      makeItem({
        id: '1',
        text: 'a',
        sourceUrl: 'https://example.com/post?x=1',
        sourceTitle: 'Old title',
        createdAt: 1
      }),
      makeItem({
        id: '2',
        text: 'b',
        sourceUrl: 'https://example.com/post?x=2',
        sourceTitle: 'New title',
        createdAt: 2
      })
    ];

    const [group] = groupSavedItemsBySource(items);
    expect(group!.label).toBe('New title');
    expect(group!.sourceUrl).toBe('https://example.com/post?x=2');
  });

  it('falls back to hostname when title is empty', () => {
    const items = [
      makeItem({
        id: '1',
        text: 'a',
        sourceUrl: 'https://hostname.example/path',
        sourceTitle: '  ',
        createdAt: 1
      })
    ];

    const [group] = groupSavedItemsBySource(items);
    expect(group!.label).toBe('hostname.example');
  });
});

