export interface NavigationEventItem {
  id: string;
  actionType: string;
  fromRoute?: string;
  toRoute: string;
  params?: Record<string, unknown>;
  timestamp: number;
  durationMs?: number;
  rawAction?: unknown;
}

export interface NavigationRouteNode {
  key: string;
  name: string;
  params?: Record<string, unknown>;
  path?: string;
  isActive: boolean;
  children?: NavigationRouteNode[];
}

export interface NavigationStateSnapshot {
  currentRoute: {
    key: string;
    name: string;
    params?: Record<string, unknown>;
    path?: string;
  } | null;
  routeTree: NavigationRouteNode[];
  history: NavigationEventItem[];
  canGoBack: boolean;
  totalNavigations: number;
}

export interface UseNavigationDevToolsOptions {
  maxHistorySize?: number;
  enableActionLogging?: boolean;
  onScreenTransition?: (from: string, to: string, durationMs: number) => void;
}

export type NavigationListener = (snapshot: NavigationStateSnapshot) => void;
