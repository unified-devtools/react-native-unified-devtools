import type { QueryClient } from '@tanstack/react-query';
import type { StyleProp, ViewStyle } from 'react-native';

export type DevToolsTab =
  | 'query'
  | 'console'
  | 'network'
  | 'lighthouse'
  | 'zustand'
  | 'storage';

export type ConsoleLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsoleLogItem {
  id: string;
  level: ConsoleLogLevel;
  timestamp: number;
  args: unknown[];
  stackTrace?: string;
}

export type QueryStatusType =
  | 'fresh'
  | 'fetching'
  | 'paused'
  | 'stale'
  | 'inactive'
  | 'error';

export interface QueryStats {
  all: number;
  fresh: number;
  fetching: number;
  paused: number;
  stale: number;
  inactive: number;
  error: number;
}

export interface UnifiedDevToolsProps {
  /**
   * Explicit QueryClient instance (optional if inside QueryClientProvider)
   */
  queryClient?: QueryClient;

  /**
   * Initial active tab when opening the panel. Default: 'query'
   */
  defaultTab?: DevToolsTab;

  /**
   * Initial open state. Default: false
   */
  initialIsOpen?: boolean;

  /**
   * Initial corner for the floating trigger. Default: 'bottom-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /**
   * Enable/disable the devtools suite (e.g. __DEV__). Default: true
   */
  enabled?: boolean;

  /**
   * Enable console interception. Default: true
   */
  enableConsole?: boolean;

  /**
   * Theme mode: 'dark', 'light', or 'auto' (system). Default: 'dark'
   */
  themeMode?: 'dark' | 'light' | 'auto';

  /**
   * Ratio of screen height for the DevTools bottom sheet (e.g. 0.82 = 82%). Default: 0.82
   */
  sheetHeightRatio?: number;

  /**
   * Custom style for root overlay container
   */
  style?: StyleProp<ViewStyle>;
}

export type ThemeMode = 'dark' | 'light' | 'auto';
