import { getSettings, updateSettings } from '../shared/storage';

export { TOGGLE_WORD_LOOKUP_COMMAND } from '../shared/commands';

/**
 * Flips `wordLookupEnabled` via the shared settings write path.
 * Icon updates and content-settings fan-out follow from `storage.onChanged`.
 *
 * @returns The new `wordLookupEnabled` value after the toggle.
 */
export async function toggleWordLookupEnabled(): Promise<boolean> {
  const settings = await getSettings();
  const nextEnabled = !settings.wordLookupEnabled;
  await updateSettings({ wordLookupEnabled: nextEnabled });
  return nextEnabled;
}
