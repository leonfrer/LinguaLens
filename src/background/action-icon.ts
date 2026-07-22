const ENABLED_ACTION_ICON_PATHS = {
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png'
};

const DISABLED_ACTION_ICON_PATHS = {
  16: 'icons/icon16-disabled.png',
  32: 'icons/icon32-disabled.png',
  48: 'icons/icon48-disabled.png',
  128: 'icons/icon128-disabled.png'
};

export function getActionIconPaths(wordLookupEnabled: boolean): Record<number, string> {
  return wordLookupEnabled ? ENABLED_ACTION_ICON_PATHS : DISABLED_ACTION_ICON_PATHS;
}

export async function updateActionIcon(wordLookupEnabled: boolean): Promise<void> {
  await chrome.action.setIcon({
    path: getActionIconPaths(wordLookupEnabled)
  });
}
