import { DARK_THEME, LIGHT_THEME } from '../colors';

describe('theme colors', () => {
  it('defines valid color palettes for both dark and light modes', () => {
    expect(DARK_THEME.isDark).toBe(true);
    expect(LIGHT_THEME.isDark).toBe(false);

    expect(DARK_THEME.colors.bg).toBeDefined();
    expect(LIGHT_THEME.colors.bg).toBeDefined();

    expect(DARK_THEME.colors.text).toBeDefined();
    expect(LIGHT_THEME.colors.text).toBeDefined();
  });

  it('defines all required query/request status colors', () => {
    const statuses = ['fresh', 'fetching', 'paused', 'stale', 'inactive', 'error'] as const;

    for (const status of statuses) {
      expect(DARK_THEME.colors.status[status]).toBeDefined();
      expect(LIGHT_THEME.colors.status[status]).toBeDefined();
    }
  });

  it('provides distinct backgrounds for dark and light themes', () => {
    expect(DARK_THEME.colors.bg).not.toEqual(LIGHT_THEME.colors.bg);
  });
});
