export const THEME = {
  colors: {
    bg: '#090d16',
    surface: '#0f172a',
    card: '#1e293b',
    cardHover: '#243247',
    border: '#334155',
    borderSubtle: '#1e293b',
    text: '#f8fafc',
    textDim: '#94a3b8',
    textMuted: '#64748b',
    headerBg: '#0b1120',
    codeBg: '#050811',
    accent: '#ff4154', // TanStack Coral
    sky: '#38bdf8',    // Sky blue
    status: {
      fresh: '#10b981',    // Emerald
      fetching: '#0284c7', // Sky
      paused: '#a855f7',   // Purple
      stale: '#f59e0b',    // Amber
      inactive: '#64748b', // Slate
      error: '#ef4444',    // Red
    },
    console: {
      log: '#f8fafc',
      info: '#38bdf8',
      warn: '#f59e0b',
      error: '#ef4444',
      debug: '#a855f7',
    },
  },
};

export type ThemeColors = typeof THEME.colors;
