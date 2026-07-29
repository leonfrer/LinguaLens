import { describe, expect, it } from 'vitest';
import { findTextRange, isWholeWordMatch } from './highlight';

describe('findTextRange', () => {
  it('finds the selected text in its sentence context', () => {
    expect(findTextRange('She said bonjour to everyone.', 'bonjour')).toEqual({
      start: 9,
      end: 16
    });
  });

  it('falls back to a case-insensitive match', () => {
    expect(findTextRange('Bonjour tout le monde.', 'bonjour')).toEqual({
      start: 0,
      end: 7
    });
  });

  it('returns no range when the selected text is not in the context', () => {
    expect(findTextRange('Hola, mundo.', 'bonjour')).toBeUndefined();
  });

  it('prefers a whole-word match over a substring of a longer word', () => {
    expect(findTextRange('Nato and Na.', 'Na')).toEqual({
      start: 9,
      end: 11
    });
  });

  it('uses the preferred start when the selected text appears more than once', () => {
    const context = 'The bank by the river and the bank downtown.';
    const secondBank = context.indexOf('bank', context.indexOf('bank') + 1);

    expect(findTextRange(context, 'bank', secondBank)).toEqual({
      start: secondBank,
      end: secondBank + 4
    });
    expect(findTextRange(context, 'bank', 0)).toEqual({
      start: 4,
      end: 8
    });
  });

  it('falls back to the nearest match when preferred start is slightly off', () => {
    const context = 'The bank by the river and the bank downtown.';
    const secondBank = context.indexOf('bank', context.indexOf('bank') + 1);

    expect(findTextRange(context, 'bank', secondBank + 1)).toEqual({
      start: secondBank,
      end: secondBank + 4
    });
  });
});

describe('isWholeWordMatch', () => {
  it('detects whole words and rejects prefixes', () => {
    expect(isWholeWordMatch('Nato and Na.', 0, 2)).toBe(false);
    expect(isWholeWordMatch('Nato and Na.', 9, 2)).toBe(true);
  });
});
