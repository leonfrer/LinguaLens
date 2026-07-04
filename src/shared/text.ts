export function normalizeSelectedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isValidSelectionText(text: string): boolean {
  const normalizedText = normalizeSelectedText(text);
  return normalizedText.length > 0 && normalizedText.length <= 600;
}
