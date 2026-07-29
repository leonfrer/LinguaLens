export type TextRange = {
  start: number;
  end: number;
};

function isWordChar(character: string): boolean {
  return /[\p{L}\p{N}_]/u.test(character);
}

/** True when the match is not glued to letters/digits on either side. */
export function isWholeWordMatch(context: string, start: number, length: number): boolean {
  if (start < 0 || length <= 0 || start + length > context.length) {
    return false;
  }

  const before = start === 0 ? '' : context[start - 1]!;
  const after = start + length >= context.length ? '' : context[start + length]!;
  return (!before || !isWordChar(before)) && (!after || !isWordChar(after));
}

function collectMatchStarts(context: string, selectedText: string, caseSensitive: boolean): number[] {
  const haystack = caseSensitive ? context : context.toLocaleLowerCase();
  const needle = caseSensitive ? selectedText : selectedText.toLocaleLowerCase();
  const starts: number[] = [];
  let searchFrom = 0;

  while (searchFrom <= haystack.length) {
    const matchStart = haystack.indexOf(needle, searchFrom);
    if (matchStart === -1) {
      break;
    }

    starts.push(matchStart);
    searchFrom = matchStart + 1;
  }

  return starts;
}

function pickBestMatchStart(
  context: string,
  selectedText: string,
  matchStarts: number[],
  preferredStart?: number
): number | undefined {
  if (matchStarts.length === 0) {
    return undefined;
  }

  if (
    preferredStart !== undefined &&
    preferredStart >= 0 &&
    preferredStart + selectedText.length <= context.length &&
    matchStarts.includes(preferredStart)
  ) {
    return preferredStart;
  }

  if (preferredStart !== undefined && preferredStart >= 0) {
    let bestStart = matchStarts[0]!;
    let bestDistance = Math.abs(bestStart - preferredStart);

    for (const start of matchStarts.slice(1)) {
      const distance = Math.abs(start - preferredStart);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestStart = start;
      }
    }

    return bestStart;
  }

  const wholeWordStarts = matchStarts.filter((start) =>
    isWholeWordMatch(context, start, selectedText.length)
  );
  if (wholeWordStarts.length > 0) {
    return wholeWordStarts[0];
  }

  return matchStarts[0];
}

/**
 * Locate `selectedText` inside `context` for Saved-item highlighting.
 *
 * When `preferredStart` is provided (stored at save time), that occurrence is used.
 * Otherwise prefers a whole-word match so selecting "Na" in "Nato and Na." does not
 * highlight the prefix of "Nato".
 */
export function findTextRange(
  context: string,
  selectedText: string,
  preferredStart?: number
): TextRange | undefined {
  if (!context || !selectedText) {
    return undefined;
  }

  const exactStarts = collectMatchStarts(context, selectedText, true);
  const exactStart = pickBestMatchStart(context, selectedText, exactStarts, preferredStart);

  if (exactStart !== undefined) {
    return {
      start: exactStart,
      end: exactStart + selectedText.length
    };
  }

  const caseInsensitiveStarts = collectMatchStarts(context, selectedText, false);
  const caseInsensitiveStart = pickBestMatchStart(
    context,
    selectedText,
    caseInsensitiveStarts,
    preferredStart
  );

  if (caseInsensitiveStart === undefined) {
    return undefined;
  }

  return {
    start: caseInsensitiveStart,
    end: caseInsensitiveStart + selectedText.length
  };
}
