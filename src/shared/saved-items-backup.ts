import { EXPLANATION_LANGUAGE_OPTIONS } from './languages';
import { isLlmProvider } from './providers';
import type { ExplanationLanguage, LlmProvider, SavedItem } from './types';

export const BACKUP_FORMAT = 'lingualens-saved-items-backup' as const;
export const BACKUP_VERSION = 1 as const;
export const BACKUP_FILE_EXTENSION = '.lingualens-backup' as const;

export type SavedItemsBackupV1 = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: number;
  items: SavedItem[];
};

export type ParseSavedItemsBackupError =
  | 'invalid_json'
  | 'invalid_format'
  | 'unsupported_version'
  | 'invalid_items';

export type ParseSavedItemsBackupResult =
  | { ok: true; backup: SavedItemsBackupV1 }
  | { ok: false; error: ParseSavedItemsBackupError };

export type MergeSavedItemsResult = {
  items: SavedItem[];
  added: number;
  updated: number;
};

const EXPLANATION_LANGUAGES = new Set(
  EXPLANATION_LANGUAGE_OPTIONS.map((option) => option.value)
);

function isExplanationLanguage(value: unknown): value is ExplanationLanguage {
  return typeof value === 'string' && EXPLANATION_LANGUAGES.has(value as ExplanationLanguage);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Normalize an unknown value into a SavedItem using a field whitelist.
 * Accepts legacy `ipa` as pronunciation.
 */
export function normalizeSavedItem(value: unknown): SavedItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown> & { ipa?: unknown };
  if (
    !isString(raw.id) ||
    raw.id.length === 0 ||
    !isString(raw.text) ||
    !isString(raw.translation) ||
    !isExplanationLanguage(raw.explanationLanguage) ||
    !isString(raw.sourceUrl) ||
    !isString(raw.sourceTitle) ||
    !isFiniteNumber(raw.createdAt)
  ) {
    return null;
  }

  const pronunciation =
    typeof raw.pronunciation === 'string'
      ? raw.pronunciation
      : typeof raw.ipa === 'string'
        ? raw.ipa
        : undefined;

  const item: SavedItem = {
    id: raw.id,
    text: raw.text,
    translation: raw.translation,
    explanationLanguage: raw.explanationLanguage,
    sourceUrl: raw.sourceUrl,
    sourceTitle: raw.sourceTitle,
    createdAt: raw.createdAt
  };

  if (pronunciation !== undefined) {
    item.pronunciation = pronunciation;
  }
  if (typeof raw.pronunciationNotation === 'string') {
    item.pronunciationNotation = raw.pronunciationNotation;
  }
  if (typeof raw.sentenceContext === 'string') {
    item.sentenceContext = raw.sentenceContext;
  }
  if (isFiniteNumber(raw.selectionStartInContext)) {
    item.selectionStartInContext = raw.selectionStartInContext;
  }
  if (typeof raw.explanation === 'string') {
    item.explanation = raw.explanation;
  }
  if (isLlmProvider(raw.provider as string | undefined)) {
    item.provider = raw.provider as LlmProvider;
  }
  if (typeof raw.model === 'string') {
    item.model = raw.model;
  }

  return item;
}

export function createSavedItemsBackup(
  items: SavedItem[],
  now = Date.now()
): SavedItemsBackupV1 {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: now,
    items
  };
}

export function serializeSavedItemsBackup(backup: SavedItemsBackupV1): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function parseSavedItemsBackup(raw: string): ParseSavedItemsBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid_json' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'invalid_format' };
  }

  const envelope = parsed as Record<string, unknown>;
  if (envelope.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'invalid_format' };
  }

  if (envelope.version !== BACKUP_VERSION) {
    return { ok: false, error: 'unsupported_version' };
  }

  if (!Array.isArray(envelope.items)) {
    return { ok: false, error: 'invalid_items' };
  }

  const items: SavedItem[] = [];
  const seenIds = new Set<string>();

  for (const entry of envelope.items) {
    const item = normalizeSavedItem(entry);
    if (!item) {
      return { ok: false, error: 'invalid_items' };
    }
    // Last occurrence wins for duplicate ids inside one backup file.
    if (seenIds.has(item.id)) {
      const index = items.findIndex((existing) => existing.id === item.id);
      if (index >= 0) {
        items[index] = item;
      }
    } else {
      seenIds.add(item.id);
      items.push(item);
    }
  }

  const createdAt =
    typeof envelope.createdAt === 'number' && Number.isFinite(envelope.createdAt)
      ? envelope.createdAt
      : 0;

  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt,
      items
    }
  };
}

/**
 * Merge backup items into local items by id.
 * Local-only ids are kept; same id → backup overwrites local.
 */
export function mergeSavedItems(
  local: SavedItem[],
  incoming: SavedItem[]
): MergeSavedItemsResult {
  const byId = new Map<string, SavedItem>();
  for (const item of local) {
    byId.set(item.id, item);
  }

  let added = 0;
  let updated = 0;
  for (const item of incoming) {
    if (byId.has(item.id)) {
      updated += 1;
    } else {
      added += 1;
    }
    byId.set(item.id, item);
  }

  const items = [...byId.values()].sort((first, second) => second.createdAt - first.createdAt);
  return { items, added, updated };
}

export function buildBackupFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `lingualens-saved-items-${year}-${month}-${day}${BACKUP_FILE_EXTENSION}`;
}
