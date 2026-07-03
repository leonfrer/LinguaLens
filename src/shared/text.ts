export function normalizeSelectedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
