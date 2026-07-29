import { describe, expect, it } from 'vitest';
import {
  extractSentenceContainingText,
  extractSentenceContext,
  isValidSelectionText,
  normalizeSelectedText,
  normalizeWithIndexMap
} from './text';

describe('normalizeSelectedText', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeSelectedText('  hello world  ')).toBe('hello world');
  });

  it('collapses repeated whitespace', () => {
    expect(normalizeSelectedText('hello\n\n\tworld')).toBe('hello world');
  });
});

describe('normalizeWithIndexMap', () => {
  it('matches normalizeSelectedText output', () => {
    const source = '  hello\n\n\tworld  ';
    expect(normalizeWithIndexMap(source).normalized).toBe(normalizeSelectedText(source));
  });

  it('maps original indices onto the normalized string', () => {
    const source = 'ab  cd';
    const { normalized, origToNorm } = normalizeWithIndexMap(source);

    expect(normalized).toBe('ab cd');
    expect(normalized[origToNorm[0]!]).toBe('a');
    expect(normalized[origToNorm[1]!]).toBe('b');
    expect(normalized[origToNorm[4]!]).toBe('c');
    expect(normalized[origToNorm[5]!]).toBe('d');
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

  it('returns empty context when the full sentence is selected', () => {
    expect(
      extractSentenceContainingText(
        'First sentence. This is the selected sentence. Last sentence.',
        'This is the selected sentence.'
      )
    ).toBe('');
  });

  it('returns empty context when the selected text is not in the source text', () => {
    expect(extractSentenceContainingText('Only part of the selection.', 'missing phrase')).toBe('');
  });

  it('prefers the occurrence nearest to the provided original offset', () => {
    const source =
      'He sat by the river bank. Later he went to the bank to open an account.';
    const secondBankOffset = source.indexOf('bank', source.indexOf('bank') + 1);

    expect(extractSentenceContainingText(source, 'bank', secondBankOffset)).toBe(
      'Later he went to the bank to open an account.'
    );
    expect(extractSentenceContainingText(source, 'bank', 0)).toBe('He sat by the river bank.');
  });

  it('resolves preferred offsets through collapsed whitespace', () => {
    const source = 'First sentence.\n\nThis is the\nphrase we need. Last sentence.';
    const phraseOffset = source.indexOf('phrase');

    expect(extractSentenceContainingText(source, 'phrase', phraseOffset)).toBe(
      'This is the phrase we need.'
    );
  });

  it('extracts a sentence that spans what would be separate inline fragments', () => {
    // Simulates textContent / Range.toString() across inline tags:
    // <p>Click the <b>Submit</b> button to continue.</p>
    const source = 'Click the Submit button to continue.';

    expect(extractSentenceContainingText(source, 'Submit')).toBe(
      'Click the Submit button to continue.'
    );
  });
});

describe('extractSentenceContext', () => {
  it('returns the selection start inside the extracted sentence', () => {
    const source = 'First sentence. Nato and Na. Last sentence.';
    const secondNa = source.lastIndexOf('Na');

    expect(extractSentenceContext(source, 'Na', secondNa)).toEqual({
      context: 'Nato and Na.',
      selectionStart: 9
    });
  });

  it('keeps the offset for a selection that is also a prefix of an earlier word', () => {
    const source = 'Nato and Na.';
    const secondNa = source.lastIndexOf('Na');

    expect(extractSentenceContext(source, 'Na', secondNa)).toEqual({
      context: 'Nato and Na.',
      selectionStart: 9
    });
  });
});
