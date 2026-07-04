import { describe, expect, it } from 'vitest';
import { extractSentenceContainingText, isValidSelectionText, normalizeSelectedText } from './text';

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

describe('extractSentenceContainingText', () => {
  it('returns the sentence containing the selected text', () => {
    expect(
      extractSentenceContainingText(
        'First sentence. This is the phrase we need. Last sentence.',
        'phrase'
      )
    ).toBe('This is the phrase we need.');
  });

  it('supports CJK sentence punctuation', () => {
    expect(extractSentenceContainingText('第一句。这里有 hello world。最后一句。', 'hello')).toBe(
      '这里有 hello world。'
    );
  });

  it('returns empty context when the selected text is not in the source text', () => {
    expect(extractSentenceContainingText('Only part of the selection.', 'missing phrase')).toBe('');
  });
});
