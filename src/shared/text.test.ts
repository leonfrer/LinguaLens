import { describe, expect, it } from 'vitest';
import { normalizeSelectedText } from './text';

describe('normalizeSelectedText', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeSelectedText('  hello world  ')).toBe('hello world');
  });

  it('collapses repeated whitespace', () => {
    expect(normalizeSelectedText('hello\n\n\tworld')).toBe('hello world');
  });
});
