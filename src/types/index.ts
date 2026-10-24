import type { QueryClient } from '@tanstack/react-query';
import type { StyleProp, ViewStyle } from 'react-native';

export type DevToolsTab =
  | 'query'
  | 'console'
  | 'network'
  | 'lighthouse'
  | 'navigation'
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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ANY';

export type NetworkClientType = 'fetch' | 'xhr';

export type NetworkOverrideMode = 'response' | 'offline' | 'timeout';

export interface NetworkMockRule {
  id: string;
  name?: string;
  enabled: boolean;
  urlPattern: string; // Glob or substring e.g. "*/users*" or "/api/v1"
  method: HttpMethod;
  mode: NetworkOverrideMode;
  status: number; // 200, 400, 401, 404, 500, etc.
  statusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody: string; // JSON or raw text
  delayMs?: number; // Artificial latency in milliseconds
  createdAt: number;
}

export interface NetworkRequestItem {
  id: string;
  url: string;
  method: string;
  client: NetworkClientType;
  startTime: number;
  endTime?: number;
  duration?: number; // in milliseconds
  status?: number;
  statusText?: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  error?: string;
  isPending: boolean;
  isOverridden?: boolean;
  matchedRuleId?: string;
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
   * Enable network interception & mock overrides (fetch, axios, XHR). Default: true
   */
  enableNetwork?: boolean;

  /**
   * Enable Lighthouse screen performance auditing. Default: true
   */
  enableLighthouse?: boolean;

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

export * from '../modules/lighthouse/types';
