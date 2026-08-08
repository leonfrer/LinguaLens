/** Command id registered in `manifest.config.ts`. */
export const TOGGLE_WORD_LOOKUP_COMMAND = 'toggle-word-lookup';

export type ExtensionCommand = {
  name?: string;
  description?: string;
  shortcut?: string;
};

/**
 * Finds the active keyboard shortcut for a registered command.
 * Empty / missing `shortcut` means the user has not assigned one (or it was cleared).
 */
export function findCommandShortcut(
  commands: ExtensionCommand[],
  commandName: string
): string | null {
  const match = commands.find((command) => command.name === commandName);
  const shortcut = match?.shortcut?.trim();
  return shortcut ? shortcut : null;
}

/** Reads the current shortcut for toggle word lookup from Chrome. */
export async function getWordLookupShortcut(): Promise<string | null> {
  if (typeof chrome === 'undefined' || !chrome.commands?.getAll) {
    return null;
  }

  const commands = await chrome.commands.getAll();
  return findCommandShortcut(commands, TOGGLE_WORD_LOOKUP_COMMAND);
}

/**
 * Opens Chrome’s extension shortcuts page so the user can assign or change bindings.
 * Restricted `chrome://` navigation can fail in some contexts; callers should tolerate that.
 */
export async function openExtensionShortcutsPage(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.create) {
    throw new Error('chrome.tabs.create is unavailable');
  }

  await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}
