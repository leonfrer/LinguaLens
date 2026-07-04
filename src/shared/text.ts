export function normalizeSelectedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isValidSelectionText(text: string): boolean {
  const normalizedText = normalizeSelectedText(text);
  return normalizedText.length > 0 && normalizedText.length <= 600;
}

export function extractSentenceContainingText(sourceText: string, selectedText: string): string {
  const normalizedSource = normalizeSelectedText(sourceText);
  const normalizedSelection = normalizeSelectedText(selectedText);

  if (!normalizedSource || !normalizedSelection) {
    return '';
  }

  const selectionStart = normalizedSource
    .toLocaleLowerCase()
    .indexOf(normalizedSelection.toLocaleLowerCase());

  if (selectionStart === -1) {
    return normalizedSource.slice(0, 1000);
  }

  const selectionEnd = selectionStart + normalizedSelection.length;
  const sentenceStartBoundary = Math.max(
    normalizedSource.lastIndexOf('.', selectionStart - 1),
    normalizedSource.lastIndexOf('!', selectionStart - 1),
    normalizedSource.lastIndexOf('?', selectionStart - 1),
    normalizedSource.lastIndexOf('。', selectionStart - 1),
    normalizedSource.lastIndexOf('！', selectionStart - 1),
    normalizedSource.lastIndexOf('？', selectionStart - 1)
  );
  const sentenceEndCandidates = ['.', '!', '?', '。', '！', '？']
    .map((punctuation) => normalizedSource.indexOf(punctuation, selectionEnd))
    .filter((index) => index !== -1);
  const sentenceEndBoundary = sentenceEndCandidates.length
    ? Math.min(...sentenceEndCandidates) + 1
    : normalizedSource.length;

  return normalizedSource
    .slice(sentenceStartBoundary === -1 ? 0 : sentenceStartBoundary + 1, sentenceEndBoundary)
    .trim()
    .slice(0, 1000);
}
