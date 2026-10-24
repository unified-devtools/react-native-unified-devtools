import { useEffect, useState } from 'react';
import { navigationManager } from './navigationManager';
import type { NavigationStateSnapshot, UseNavigationDevToolsOptions } from './types';

export function useNavigationDevTools(
  navigationRef: any,
  options: UseNavigationDevToolsOptions = {}
): NavigationStateSnapshot & {
  navigate: (name: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
  clearHistory: () => void;
} {
  const [snapshot, setSnapshot] = useState<NavigationStateSnapshot>(() =>
    navigationManager.getSnapshot()
  );

  useEffect(() => {
    if (!navigationRef) return;

    navigationManager.attach(navigationRef, options);

    const unsubscribe = navigationManager.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return () => {
      unsubscribe();
    };
  }, [navigationRef, options.maxHistorySize]);

  return {
    ...snapshot,
    navigate: (name, params) => navigationManager.navigate(name, params),
    goBack: () => navigationManager.goBack(),
    clearHistory: () => navigationManager.clearHistory(),
  };
}
