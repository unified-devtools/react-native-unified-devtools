import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DARK_THEME, LIGHT_THEME, type Theme, type ThemeColors } from './colors';

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: DARK_THEME,
  colors: DARK_THEME.colors,
  mode: 'dark',
  isDark: true,
  setMode: () => {},
  toggleTheme: () => {},
});

export interface ThemeProviderProps {
  initialMode?: ThemeMode;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  initialMode = 'dark',
  children,
}) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const systemColorScheme = useColorScheme();

  const isDark =
    mode === 'auto'
      ? systemColorScheme !== 'light'
      : mode === 'dark';

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const toggleTheme = () => {
    setMode((prevMode) => {
      if (prevMode === 'dark') return 'light';
      if (prevMode === 'light') return 'dark';
      return isDark ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors: theme.colors,
        mode,
        isDark,
        setMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
