import type { SavedItem } from '../shared/types';

export const UNKNOWN_SOURCE_GROUP_KEY = '__unknown__';

export type SavedItemGroup = {
  /** Normalized page key, or {@link UNKNOWN_SOURCE_GROUP_KEY}. */
  key: string;
  /**
   * Display label derived from the newest item: trimmed `sourceTitle`, else hostname
   * from the group key, else empty string (UI should fall back to unknown-source copy).
   */
  label: string;
  /** Newest item’s raw `sourceUrl` when openable; empty for the unknown bucket. */
  sourceUrl: string;
  /** Newest-first within the group. */
  items: SavedItem[];
  latestCreatedAt: number;
};

/**
 * Normalize a source URL into a page grouping key.
 *
 * - Drops query string (UTM / tracking variants merge)
 * - Keeps hash (SPA hash routes stay distinct)
 * - Trims trailing slash on non-root pathnames
 * - Returns `null` for empty or unparseable URLs
 */
export function normalizeSourcePageKey(sourceUrl: string): string | null {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return `${url.origin}${pathname}${url.hash}`;
  } catch {
    return null;
  }
}

function resolveGroupLabel(item: SavedItem, groupKey: string): string {
  const title = item.sourceTitle?.trim();
  if (title) {
    return title;
  }

  if (groupKey === UNKNOWN_SOURCE_GROUP_KEY) {
    return '';
  }

  try {
    return new URL(groupKey).hostname;
  } catch {
    try {
      return new URL(item.sourceUrl).hostname;
    } catch {
      return item.sourceUrl.trim();
    }
  }
}

function isOpenableSourceUrl(sourceUrl: string): boolean {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return false;
  }
  try {
    // Validate parseability; any scheme is fine for a user-saved link.
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Group saved items by normalized source page.
 *
 * Ordering:
 * - Within each group: newest-first by `createdAt`
 * - Across groups: by most recent item in the group (newest activity first)
 * - The unknown-source bucket is ordered by activity like any other group
 */
export function groupSavedItemsBySource(items: SavedItem[]): SavedItemGroup[] {
  const buckets = new Map<string, SavedItem[]>();

  for (const item of items) {
    const key = normalizeSourcePageKey(item.sourceUrl) ?? UNKNOWN_SOURCE_GROUP_KEY;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }

  const groups: SavedItemGroup[] = [];

  for (const [key, bucketItems] of buckets) {
    const sortedItems = [...bucketItems].sort(
      (first, second) => second.createdAt - first.createdAt
    );
    const newest = sortedItems[0]!;
    const sourceUrl =
      key !== UNKNOWN_SOURCE_GROUP_KEY && isOpenableSourceUrl(newest.sourceUrl)
        ? newest.sourceUrl.trim()
        : '';

    groups.push({
      key,
      label: resolveGroupLabel(newest, key),
      sourceUrl,
      items: sortedItems,
      latestCreatedAt: newest.createdAt
    });
  }

  groups.sort((first, second) => second.latestCreatedAt - first.latestCreatedAt);
  return groups;
}
