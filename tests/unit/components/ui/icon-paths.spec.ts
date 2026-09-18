import { describe, expect, it } from 'vitest';
import { ICON_PATHS } from '@/components/ui/icon-paths';

/** Every icon the app draws by name; `AppIcon` renders nothing for a name that is not here. */
const EXPECTED_ICON_NAMES =
  'bookmark,heart,search,chevron-left,chevron-right,chevron-down,sun,moon,external,grid,close';

/** `SaveToggle` fills these two, and a fill only reads as the icon when the shape is closed. */
const FILLED_ICONS = ['bookmark', 'heart'] as const;

/** A path that does not start with a move command draws nothing at all. */
const iconsWithoutMoveTo = (): readonly string[] =>
  Object.entries(ICON_PATHS)
    .filter(([, path]) => !path.startsWith('M'))
    .map(([name]) => name);

const unclosedFilledIcons = (): readonly string[] =>
  FILLED_ICONS.filter((name) => !ICON_PATHS[name].endsWith('z'));

describe('ICON_PATHS', () => {
  describe('when the closed set is read', () => {
    it('given the map, when the names are joined, then it holds every icon the app asks for', () => {
      expect(Object.keys(ICON_PATHS).join(',')).toBe(EXPECTED_ICON_NAMES);
    });
  });

  describe('when an outline is read', () => {
    it('given every icon, when its path is read, then the drawing starts with a move command', () => {
      expect(iconsWithoutMoveTo()).toEqual([]);
    });

    it('given the icons a save toggle fills, when their paths are read, then the shapes close', () => {
      expect(unclosedFilledIcons()).toEqual([]);
    });
  });
});
