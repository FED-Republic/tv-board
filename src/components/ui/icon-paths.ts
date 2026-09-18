/** Icon outlines from the ShowBoard prototype, all on a 24 × 24 grid, drawn with `currentColor`. */
export const ICON_PATHS = {
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  heart:
    'M12 20.5l-1.3-1.2C5.7 14.8 3 12.3 3 9.2 3 6.7 5 4.8 7.4 4.8c1.4 0 2.8.7 3.6 1.7.8-1 2.2-1.7 3.6-1.7C17 4.8 19 6.7 19 9.2c0 3.1-2.7 5.6-7.7 10.1L12 20.5z',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M16.5 16.5L21 21',
  'chevron-left': 'M14 6L8 12L14 18',
  'chevron-right': 'M10 6L16 12L10 18',
  'chevron-down': 'M6 9L12 15L18 9',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  external: 'M7 17L17 7M9 7h8v8',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  close: 'M6 6L18 18M18 6L6 18',
} as const;

export type IconName = keyof typeof ICON_PATHS;
