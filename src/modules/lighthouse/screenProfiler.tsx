import React, { Profiler, useEffect, useRef } from 'react';
import type { ReRenderHotspot } from './types';

interface ScreenData {
  mountDurationMs: number;
  mountTimestamp: number;
  renders: Array<{ componentName: string; timestamp: number }>;
}

export class ScreenPerformanceManager {
  private currentScreen = 'DefaultScreen';
  private screens: Map<string, ScreenData> = new Map();
  private listeners: Set<(screenName: string) => void> = new Set();

  public setCurrentScreen(screenName: string): void {
    const isNew = this.currentScreen !== screenName;
    this.currentScreen = screenName;
    if (!this.screens.has(screenName)) {
      this.screens.set(screenName, {
        mountDurationMs: 0,
        mountTimestamp: Date.now(),
        renders: [],
      });
    }
    if (isNew) {
      this.notify();
    }
  }

  public getCurrentScreen(): string {
    return this.currentScreen;
  }

  public recordMount(screenName: string, durationMs: number): void {
    this.setCurrentScreen(screenName);
    const data = this.screens.get(screenName) || {
      mountDurationMs: 0,
      mountTimestamp: Date.now(),
      renders: [],
    };
    data.mountDurationMs = Math.round(durationMs);
    data.mountTimestamp = Date.now();
    this.screens.set(screenName, data);
  }

  public recordRender(screenName: string, componentName = 'Screen'): void {
    let data = this.screens.get(screenName);
    if (!data) {
      data = {
        mountDurationMs: 0,
        mountTimestamp: Date.now(),
        renders: [],
      };
      this.screens.set(screenName, data);
    }
    data.renders.push({
      componentName,
      timestamp: Date.now(),
    });

    // Prune renders older than 10 seconds to prevent memory buildup
    const now = Date.now();
    data.renders = data.renders.filter((r) => now - r.timestamp < 10000);
  }

  public getMountDuration(screenName: string): number {
    return this.screens.get(screenName)?.mountDurationMs || 0;
  }

  public getSnapshot(screenName = this.currentScreen): {
    screenName: string;
    mountDurationMs: number;
    reRenderCount: number;
    reRenderHotspots: ReRenderHotspot[];
  } {
    const data = this.screens.get(screenName);
    if (!data) {
      return {
        screenName,
        mountDurationMs: 0,
        reRenderCount: 0,
        reRenderHotspots: [],
      };
    }

    // Count component frequency
    const freq: Record<string, number> = {};
    for (const r of data.renders) {
      freq[r.componentName] = (freq[r.componentName] || 0) + 1;
    }

    const hotspots: ReRenderHotspot[] = Object.entries(freq)
      .filter(([_, count]) => count >= 3)
      .map(([componentName, count]) => ({ componentName, count }))
      .sort((a, b) => b.count - a.count);

    return {
      screenName,
      mountDurationMs: data.mountDurationMs,
      reRenderCount: data.renders.length,
      reRenderHotspots: hotspots,
    };
  }

  public reset(): void {
    this.currentScreen = 'DefaultScreen';
    this.screens.clear();
  }

  public subscribe(listener: (screenName: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l(this.currentScreen);
      } catch (e) {
        // Safe callback execution
      }
    });
  }
}

export const screenPerformanceManager = new ScreenPerformanceManager();

export interface ScreenProfilerProps {
  id: string;
  children?: React.ReactNode;
}

/**
 * ScreenProfiler - Non-intrusive React.Profiler wrapper for React Native screens
 */
export const ScreenProfiler: React.FC<ScreenProfilerProps> = ({ id, children }) => {
  const mountRecordedRef = useRef(false);

  useEffect(() => {
    screenPerformanceManager.setCurrentScreen(id);
  }, [id]);

  const onRenderCallback = (
    _profilerId: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    _baseDuration: number,
    _startTime: number,
    _commitTime: number
  ) => {
    if (phase === 'mount' && !mountRecordedRef.current) {
      mountRecordedRef.current = true;
      screenPerformanceManager.recordMount(id, actualDuration);
    } else {
      screenPerformanceManager.recordRender(id, id);
    }
  };

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
};

/**
 * Hook to measure performance within a screen component directly
 */
export function useScreenProfiler(screenName: string) {
  useEffect(() => {
    screenPerformanceManager.setCurrentScreen(screenName);
    const start = Date.now();
    screenPerformanceManager.recordMount(screenName, 0);

    return () => {
      const duration = Date.now() - start;
      if (screenPerformanceManager.getMountDuration(screenName) === 0) {
        screenPerformanceManager.recordMount(screenName, duration);
      }
    };
  }, [screenName]);

  const recordRender = (componentName?: string) => {
    screenPerformanceManager.recordRender(screenName, componentName || screenName);
  };

  return {
    screenName,
    recordRender,
    getSnapshot: () => screenPerformanceManager.getSnapshot(screenName),
  };
}
