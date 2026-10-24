import type {
  NavigationEventItem,
  NavigationListener,
  NavigationRouteNode,
  NavigationStateSnapshot,
  UseNavigationDevToolsOptions,
} from './types';

export class NavigationDevToolsManager {
  private static instance: NavigationDevToolsManager;
  private listeners: Set<NavigationListener> = new Set();
  private navigationRef: any = null;
  private history: NavigationEventItem[] = [];
  private maxHistorySize: number = 50;
  private lastRouteName: string = '';
  private lastTransitionStart: number = 0;
  private totalNavigations: number = 0;
  private options: UseNavigationDevToolsOptions = {};
  private unsubscribeListener: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): NavigationDevToolsManager {
    if (!NavigationDevToolsManager.instance) {
      NavigationDevToolsManager.instance = new NavigationDevToolsManager();
    }
    return NavigationDevToolsManager.instance;
  }

  public attach(ref: any, options: UseNavigationDevToolsOptions = {}) {
    if (!ref) return;

    this.navigationRef = ref;
    this.options = options;
    if (options.maxHistorySize) {
      this.maxHistorySize = options.maxHistorySize;
    }

    if (this.unsubscribeListener) {
      this.unsubscribeListener();
      this.unsubscribeListener = null;
    }

    // Capture initial state once container is ready
    const syncState = () => {
      try {
        const current = this.navigationRef?.getCurrentRoute?.();
        if (current) {
          this.lastRouteName = current.name;
        }
        this.notify();
      } catch (e) {
        // Ignored if ref not yet mounted
      }
    };

    if (typeof this.navigationRef.isReady === 'function') {
      if (this.navigationRef.isReady()) {
        syncState();
      }
    } else {
      syncState();
    }

    // Attach React Navigation v7 / v6 state listener
    if (typeof this.navigationRef.addListener === 'function') {
      const unsub = this.navigationRef.addListener('state', (_event: any) => {
        this.handleStateChange();
      });
      this.unsubscribeListener = unsub;
    }
  }

  public detach() {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
      this.unsubscribeListener = null;
    }
    this.navigationRef = null;
  }

  private handleStateChange() {
    if (!this.navigationRef) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let currentRoute: any = null;

    try {
      currentRoute = this.navigationRef.getCurrentRoute?.();
    } catch {
      return;
    }

    if (!currentRoute) return;

    const currentName = currentRoute.name;
    const duration = this.lastTransitionStart > 0 ? Math.round(now - this.lastTransitionStart) : 0;
    this.lastTransitionStart = now;

    if (currentName !== this.lastRouteName) {
      this.totalNavigations++;
      const eventItem: NavigationEventItem = {
        id: `nav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        actionType: 'NAVIGATE',
        fromRoute: this.lastRouteName || undefined,
        toRoute: currentName,
        params: currentRoute.params,
        timestamp: Date.now(),
        durationMs: duration,
      };

      this.history.unshift(eventItem);
      if (this.history.length > this.maxHistorySize) {
        this.history.pop();
      }

      if (this.options.onScreenTransition && this.lastRouteName) {
        this.options.onScreenTransition(this.lastRouteName, currentName, duration);
      }

      this.lastRouteName = currentName;
    }

    this.notify();
  }

  public getSnapshot(): NavigationStateSnapshot {
    let currentRoute: any = null;
    let routeTree: NavigationRouteNode[] = [];
    let canGoBack = false;

    if (this.navigationRef) {
      try {
        currentRoute = this.navigationRef.getCurrentRoute?.() ?? null;
      } catch {}

      try {
        canGoBack = Boolean(this.navigationRef.canGoBack?.());
      } catch {}

      try {
        const rootState = this.navigationRef.getRootState?.();
        if (rootState) {
          routeTree = this.parseRouteTree(rootState, currentRoute?.key);
        }
      } catch {}
    }

    return {
      currentRoute: currentRoute
        ? {
            key: currentRoute.key,
            name: currentRoute.name,
            params: currentRoute.params,
            path: currentRoute.path,
          }
        : null,
      routeTree,
      history: [...this.history],
      canGoBack,
      totalNavigations: this.totalNavigations,
    };
  }

  private parseRouteTree(state: any, activeKey?: string): NavigationRouteNode[] {
    if (!state || !Array.isArray(state.routes)) return [];

    const activeIndex = typeof state.index === 'number' ? state.index : 0;

    return state.routes.map((route: any, idx: number) => {
      const isRouteActive = route.key === activeKey || idx === activeIndex;
      const node: NavigationRouteNode = {
        key: route.key,
        name: route.name,
        params: route.params,
        path: route.path,
        isActive: isRouteActive,
      };

      if (route.state) {
        node.children = this.parseRouteTree(route.state, activeKey);
      }

      return node;
    });
  }

  public navigate(name: string, params?: Record<string, unknown>) {
    if (this.navigationRef && typeof this.navigationRef.navigate === 'function') {
      this.lastTransitionStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.navigationRef.navigate(name, params);
    }
  }

  public goBack() {
    if (this.navigationRef && typeof this.navigationRef.goBack === 'function') {
      this.lastTransitionStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.navigationRef.goBack();
    }
  }

  public reset(state: any) {
    if (this.navigationRef && typeof this.navigationRef.reset === 'function') {
      this.navigationRef.reset(state);
    }
  }

  public clearHistory() {
    this.history = [];
    this.notify();
  }

  public subscribe(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((cb) => {
      try {
        cb(snap);
      } catch (err) {
        // Prevent listener crashes from breaking devtools
      }
    });
  }
}

export const navigationManager = NavigationDevToolsManager.getInstance();
