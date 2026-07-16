import { describe, expect, it } from 'vitest';
import { findTextRange } from './highlight';

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
});
