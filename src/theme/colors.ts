export interface ThemeStatusColors {
  fresh: string;
  fetching: string;
  paused: string;
  stale: string;
  inactive: string;
  error: string;
}

export interface ThemeConsoleColors {
  log: string;
  info: string;
  warn: string;
  error: string;
  debug: string;
}

export interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  cardHover: string;
  border: string;
  borderSubtle: string;
  text: string;
  textDim: string;
  textMuted: string;
  headerBg: string;
  codeBg: string;
  accent: string;
  sky: string;
  handle: string;
  backdrop: string;
  status: ThemeStatusColors;
  console: ThemeConsoleColors;
}

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
}

export const DARK_THEME: Theme = {
  isDark: true,
  colors: {
    bg: '#080e1a',        // Deep midnight navy
    surface: '#0f172a',   // Navy surface
    card: '#162238',      // Oceanic slate card
    cardHover: '#1e2e4a', // Card hover
    border: '#233857',    // Navy border
    borderSubtle: '#182840',
    text: '#f0f9ff',      // Ice white text
    textDim: '#93c5fd',   // Soft blue text
    textMuted: '#64748b', // Slate muted
    headerBg: '#09101f',  // Midnight blue header
    codeBg: '#050912',    // Deep ocean code block
    accent: '#38bdf8',    // Electric Sky Blue accent
    sky: '#38bdf8',       // Sky blue
    handle: '#2563eb',    // Blue drag handle
    backdrop: 'rgba(2, 6, 23, 0.70)',
    status: {
      fresh: '#10b981',    // Emerald
      fetching: '#38bdf8', // Electric Sky
      paused: '#818cf8',   // Indigo
      stale: '#f59e0b',    // Amber
      inactive: '#64748b', // Slate
      error: '#ef4444',    // Red
    },
    console: {
      log: '#f0f9ff',
      info: '#38bdf8',
      warn: '#fbbf24',
      error: '#ef4444',
      debug: '#818cf8',
    },
  },
};

export const LIGHT_THEME: Theme = {
  isDark: false,
  colors: {
    bg: '#f0f7ff',        // Crisp ice blue
    surface: '#ffffff',   // Clean white
    card: '#e6f0fc',      // Soft sky-blue card
    cardHover: '#dbeafe',
    border: '#bfdbfe',    // Crisp light blue border
    borderSubtle: '#dbeafe',
    text: '#0c2340',      // Deep navy text
    textDim: '#1e40af',   // Royal blue text
    textMuted: '#64748b', // Slate muted
    headerBg: '#ffffff',  // Clean white header
    codeBg: '#eef6ff',    // Soft ice blue code background
    accent: '#0284c7',    // Rich Oceanic Cyan/Blue
    sky: '#0284c7',       // Sky blue
    handle: '#93c5fd',    // Sky drag handle
    backdrop: 'rgba(15, 30, 60, 0.45)',
    status: {
      fresh: '#059669',    // Deep Emerald
      fetching: '#0284c7', // Sky Blue
      paused: '#6366f1',   // Indigo
      stale: '#d97706',    // Amber
      inactive: '#94a3b8', // Slate
      error: '#dc2626',    // Red
    },
    console: {
      log: '#0c2340',
      info: '#0284c7',
      warn: '#b45309',
      error: '#dc2626',
      debug: '#6366f1',
    },
  },
};

export const THEME = DARK_THEME;
