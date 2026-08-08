import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  TOGGLE_WORD_LOOKUP_COMMAND,
  findCommandShortcut,
  getWordLookupShortcut
} from './commands';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('findCommandShortcut', () => {
  it('returns the shortcut when the command is assigned', () => {
    expect(
      findCommandShortcut(
        [
          { name: 'other', shortcut: 'Ctrl+A' },
          { name: TOGGLE_WORD_LOOKUP_COMMAND, shortcut: 'Alt+Shift+L' }
        ],
        TOGGLE_WORD_LOOKUP_COMMAND
      )
    ).toBe('Alt+Shift+L');
  });

  it('returns null when the shortcut is missing or blank', () => {
    expect(
      findCommandShortcut([{ name: TOGGLE_WORD_LOOKUP_COMMAND, shortcut: '' }], TOGGLE_WORD_LOOKUP_COMMAND)
    ).toBeNull();
    expect(
      findCommandShortcut([{ name: TOGGLE_WORD_LOOKUP_COMMAND, shortcut: '   ' }], TOGGLE_WORD_LOOKUP_COMMAND)
    ).toBeNull();
    expect(findCommandShortcut([{ name: 'other', shortcut: 'Ctrl+A' }], TOGGLE_WORD_LOOKUP_COMMAND)).toBeNull();
    expect(findCommandShortcut([], TOGGLE_WORD_LOOKUP_COMMAND)).toBeNull();
  });
});

describe('getWordLookupShortcut', () => {
  it('reads the assigned shortcut from chrome.commands.getAll', async () => {
    const getAll = vi.fn().mockResolvedValue([
      { name: TOGGLE_WORD_LOOKUP_COMMAND, shortcut: '⌘⇧L' }
    ]);
    vi.stubGlobal('chrome', { commands: { getAll } });

    await expect(getWordLookupShortcut()).resolves.toBe('⌘⇧L');
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('returns null when chrome.commands is unavailable', async () => {
    vi.stubGlobal('chrome', undefined);
    await expect(getWordLookupShortcut()).resolves.toBeNull();
  });
});
