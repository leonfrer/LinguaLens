import { describe, expect, it } from 'vitest';
import type { SavedItem } from './types';
import {
  BACKUP_FILE_EXTENSION,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  buildBackupFilename,
  createSavedItemsBackup,
  mergeSavedItems,
  normalizeSavedItem,
  parseSavedItemsBackup,
  serializeSavedItemsBackup
} from './saved-items-backup';

function makeItem(overrides: Partial<SavedItem> & Pick<SavedItem, 'id' | 'text'>): SavedItem {
  return {
    translation: `t:${overrides.text}`,
    explanationLanguage: 'zh-CN',
    sourceUrl: 'https://example.com',
    sourceTitle: 'Example',
    createdAt: 100,
    ...overrides
  };
}

describe('createSavedItemsBackup / serialize / parse', () => {
  it('round-trips a versioned backup envelope', () => {
    const items = [makeItem({ id: 'a', text: 'hello', createdAt: 10 })];
    const backup = createSavedItemsBackup(items, 999);
    const raw = serializeSavedItemsBackup(backup);
    const parsed = parseSavedItemsBackup(raw);

    expect(backup).toEqual({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: 999,
      items
    });
    expect(parsed).toEqual({ ok: true, backup });
  });

  it('rejects invalid JSON, wrong format, unsupported version, and bad items', () => {
    expect(parseSavedItemsBackup('{')).toEqual({ ok: false, error: 'invalid_json' });
    expect(parseSavedItemsBackup(JSON.stringify({ format: 'other', version: 1, items: [] }))).toEqual(
      { ok: false, error: 'invalid_format' }
    );
    expect(
      parseSavedItemsBackup(
        JSON.stringify({ format: BACKUP_FORMAT, version: 99, items: [] })
      )
    ).toEqual({ ok: false, error: 'unsupported_version' });
    expect(
      parseSavedItemsBackup(
        JSON.stringify({ format: BACKUP_FORMAT, version: 1, items: 'nope' })
      )
    ).toEqual({ ok: false, error: 'invalid_items' });
    expect(
      parseSavedItemsBackup(
        JSON.stringify({
          format: BACKUP_FORMAT,
          version: 1,
          items: [{ id: 'x', text: 'only' }]
        })
      )
    ).toEqual({ ok: false, error: 'invalid_items' });
  });

  it('maps legacy ipa to pronunciation and strips unknown fields', () => {
    const parsed = parseSavedItemsBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        createdAt: 1,
        items: [
          {
            id: 'legacy',
            text: 'hello',
            translation: '你好',
            ipa: '/həˈloʊ/',
            explanationLanguage: 'zh-CN',
            sourceUrl: 'https://example.com',
            sourceTitle: 'Example',
            createdAt: 123,
            extra: 'drop-me',
            apiKey: 'should-not-appear'
          }
        ]
      })
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.backup.items).toEqual([
      {
        id: 'legacy',
        text: 'hello',
        translation: '你好',
        pronunciation: '/həˈloʊ/',
        explanationLanguage: 'zh-CN',
        sourceUrl: 'https://example.com',
        sourceTitle: 'Example',
        createdAt: 123
      }
    ]);
    expect(parsed.backup.items[0]).not.toHaveProperty('apiKey');
    expect(parsed.backup.items[0]).not.toHaveProperty('extra');
  });

  it('keeps the last occurrence when a backup contains duplicate ids', () => {
    const parsed = parseSavedItemsBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        items: [
          makeItem({ id: 'dup', text: 'first', translation: '1', createdAt: 1 }),
          makeItem({ id: 'dup', text: 'second', translation: '2', createdAt: 2 })
        ]
      })
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.backup.items).toEqual([
      makeItem({ id: 'dup', text: 'second', translation: '2', createdAt: 2 })
    ]);
  });
});

describe('normalizeSavedItem', () => {
  it('returns null for incomplete payloads', () => {
    expect(normalizeSavedItem(null)).toBeNull();
    expect(normalizeSavedItem({ id: 'a' })).toBeNull();
  });
});

describe('mergeSavedItems', () => {
  it('keeps local-only items, adds backup-only, and lets backup win on same id', () => {
    const local = [
      makeItem({ id: 'a', text: 'local-a', translation: 'A-local', createdAt: 30 }),
      makeItem({ id: 'b', text: 'local-b', translation: 'B-local', createdAt: 20 })
    ];
    const incoming = [
      makeItem({ id: 'a', text: 'backup-a', translation: 'A-backup', createdAt: 30 }),
      makeItem({ id: 'c', text: 'backup-c', translation: 'C-backup', createdAt: 40 })
    ];

    const result = mergeSavedItems(local, incoming);

    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.items.map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(result.items.find((item) => item.id === 'a')?.translation).toBe('A-backup');
    expect(result.items.find((item) => item.id === 'b')?.translation).toBe('B-local');
    expect(result.items.find((item) => item.id === 'c')?.translation).toBe('C-backup');
  });
});

describe('buildBackupFilename', () => {
  it('uses the lingualens-backup extension and a date stamp', () => {
    expect(buildBackupFilename(new Date(2026, 7, 7))).toBe(
      `lingualens-saved-items-2026-08-07${BACKUP_FILE_EXTENSION}`
    );
  });
});
