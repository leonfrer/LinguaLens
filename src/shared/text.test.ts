import { describe, expect, it } from 'vitest';
import { isValidSelectionText, normalizeSelectedText } from './text';

describe('normalizeSelectedText', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeSelectedText('  hello world  ')).toBe('hello world');
  });

  it('collapses repeated whitespace', () => {
    expect(normalizeSelectedText('hello\n\n\tworld')).toBe('hello world');
  });
});

describe('isValidSelectionText', () => {
  it('rejects empty selections after normalization', () => {
    expect(isValidSelectionText(' \n ')).toBe(false);
  });

  it('rejects overly long selections', () => {
    expect(isValidSelectionText('a'.repeat(601))).toBe(false);
  });

  it('accepts short readable selections', () => {
    expect(isValidSelectionText('hello world')).toBe(true);
  });
});
