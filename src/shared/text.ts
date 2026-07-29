export function normalizeSelectedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isValidSelectionText(text: string): boolean {
  const normalizedText = normalizeSelectedText(text);
  return normalizedText.length > 0 && normalizedText.length <= 600;
}

const SENTENCE_TERMINATORS = ['.', '!', '?', '。', '！', '？'] as const;

/**
 * Collapse whitespace like {@link normalizeSelectedText}, while mapping each original
 * character index to its position in the normalized string.
 */
export function normalizeWithIndexMap(text: string): {
  normalized: string;
  origToNorm: number[];
} {
  const origToNorm: number[] = Array.from({ length: text.length }, () => 0);
  let normalized = '';
  let index = 0;

  while (index < text.length && /\s/.test(text[index]!)) {
    origToNorm[index] = 0;
    index += 1;
  }

  let pendingSpace = false;
  for (; index < text.length; index += 1) {
    const character = text[index]!;
    if (/\s/.test(character)) {
      pendingSpace = true;
      origToNorm[index] = normalized.length;
      continue;
    }

    if (pendingSpace && normalized.length > 0) {
      normalized += ' ';
    }
    pendingSpace = false;
    origToNorm[index] = normalized.length;
    normalized += character;
  }

  for (let trailing = text.length - 1; trailing >= 0 && /\s/.test(text[trailing]!); trailing -= 1) {
    origToNorm[trailing] = normalized.length;
  }

  return { normalized, origToNorm };
}

function findBestMatchStart(
  source: string,
  selection: string,
  preferredStart?: number
): number {
  const lowerSource = source.toLocaleLowerCase();
  const lowerSelection = selection.toLocaleLowerCase();

  if (preferredStart === undefined) {
    return lowerSource.indexOf(lowerSelection);
  }

  if (
    preferredStart >= 0 &&
    preferredStart + selection.length <= source.length &&
    lowerSource.slice(preferredStart, preferredStart + selection.length) === lowerSelection
  ) {
    return preferredStart;
  }

  let bestStart = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let searchFrom = 0;

  while (searchFrom <= lowerSource.length) {
    const matchStart = lowerSource.indexOf(lowerSelection, searchFrom);
    if (matchStart === -1) {
      break;
    }

    const distance = Math.abs(matchStart - preferredStart);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestStart = matchStart;
    }

    searchFrom = matchStart + 1;
  }

  return bestStart;
}

function extractSentenceFromNormalized(
  normalizedSource: string,
  selectionStart: number,
  selectionEnd: number,
  normalizedSelection: string
): string {
  const sentenceStartBoundary = Math.max(
    ...SENTENCE_TERMINATORS.map((punctuation) =>
      normalizedSource.lastIndexOf(punctuation, selectionStart - 1)
    )
  );
  const sentenceEndCandidates = SENTENCE_TERMINATORS.map((punctuation) =>
    normalizedSource.indexOf(punctuation, selectionEnd - 1)
  ).filter((index) => index !== -1);
  const sentenceEndBoundary = sentenceEndCandidates.length
    ? Math.min(...sentenceEndCandidates) + 1
    : normalizedSource.length;

  const sentenceContext = normalizedSource
    .slice(sentenceStartBoundary === -1 ? 0 : sentenceStartBoundary + 1, sentenceEndBoundary)
    .trim()
    .slice(0, 1000);

  return sentenceContext.toLocaleLowerCase() === normalizedSelection.toLocaleLowerCase()
    ? ''
    : sentenceContext;
}

/**
 * Extract the sentence that contains `selectedText` within `sourceText`.
 *
 * When `preferredStart` is provided, it is treated as a character offset into the
 * original (pre-normalization) `sourceText`, and the nearest matching occurrence is used.
 * This avoids picking the wrong instance when a word appears multiple times.
 */
export function extractSentenceContainingText(
  sourceText: string,
  selectedText: string,
  preferredStart?: number
): string {
  const { normalized: normalizedSource, origToNorm } = normalizeWithIndexMap(sourceText);
  const normalizedSelection = normalizeSelectedText(selectedText);

  if (!normalizedSource || !normalizedSelection) {
    return '';
  }

  let preferredNormalizedStart: number | undefined;
  if (preferredStart !== undefined && preferredStart >= 0) {
    preferredNormalizedStart =
      preferredStart >= sourceText.length
        ? normalizedSource.length
        : (origToNorm[preferredStart] ?? 0);
  }

  const selectionStart = findBestMatchStart(
    normalizedSource,
    normalizedSelection,
    preferredNormalizedStart
  );

  if (selectionStart === -1) {
    return '';
  }

  const selectionEnd = selectionStart + normalizedSelection.length;
  return extractSentenceFromNormalized(
    normalizedSource,
    selectionStart,
    selectionEnd,
    normalizedSelection
  );
}
