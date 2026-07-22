import { describe, expect, it } from 'vitest';
import { getActionIconPaths } from './action-icon';

describe('getActionIconPaths', () => {
  it('uses the regular icons when word lookup is enabled', () => {
    expect(getActionIconPaths(true)).toEqual({
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png'
    });
  });

  it('uses the gray icons when word lookup is disabled', () => {
    expect(getActionIconPaths(false)).toEqual({
      16: 'icons/icon16-disabled.png',
      32: 'icons/icon32-disabled.png',
      48: 'icons/icon48-disabled.png',
      128: 'icons/icon128-disabled.png'
    });
  });
});
