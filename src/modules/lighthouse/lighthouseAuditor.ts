/**
 * Lighthouse Performance Auditor Engine
 * Computes 0-100 Performance Score and Actionable Diagnostics for React Native Screens
 */

import { fpsTracker } from './fpsTracker';
import { eventLoopTracker } from './eventLoopTracker';
import { getHermesMemorySnapshot } from './hermesTracker';
import { screenPerformanceManager } from './screenProfiler';
import { networkManager } from '../network/networkInterceptor';
import type {
  AuditDiagnostic,
  LighthouseScoreGrade,
  LighthouseScoreResult,
  ScreenMetricSnapshot,
} from './types';

// Weights according to REACT_NATIVE_UNIFIED_DEVTOOLS_SPEC.md:
// Mount TTI (30%), FPS (25%), Event Loop Lag (20%), Re-renders (15%), Network & Memory (10%)
const WEIGHT_MOUNT = 0.3;
const WEIGHT_FPS = 0.25;
const WEIGHT_LAG = 0.2;
const WEIGHT_RENDERS = 0.15;
const WEIGHT_NETWORK_MEMORY = 0.1;

export function computeMountSubScore(mountMs: number): number {
  if (mountMs <= 0) return 95;
  if (mountMs <= 200) return 100;
  if (mountMs <= 250) return 90;
  if (mountMs <= 400) return 75;
  if (mountMs <= 600) return 55;
  if (mountMs <= 1000) return 30;
  return 10;
}

export function computeFpsSubScore(fps: number, droppedFrames: number): number {
  let score = 100;
  if (fps >= 58) score = 100;
  else if (fps >= 50) score = 85;
  else if (fps >= 40) score = 65;
  else if (fps >= 30) score = 45;
  else score = 20;

  // Penalize for dropped frames
  const dropPenalty = Math.min(30, droppedFrames * 2.5);
  return Math.max(0, Math.round(score - dropPenalty));
}

export function computeLagSubScore(maxLagMs: number): number {
  if (maxLagMs <= 16) return 100;
  if (maxLagMs <= 35) return 85;
  if (maxLagMs <= 60) return 60;
  if (maxLagMs <= 100) return 35;
  return 10;
}

export function computeRenderSubScore(reRenderCount: number): number {
  if (reRenderCount <= 2) return 100;
  if (reRenderCount <= 4) return 80;
  if (reRenderCount <= 6) return 60;
  if (reRenderCount <= 10) return 40;
  return 20;
}

export function computeNetworkMemorySubScore(
  slowQueriesCount: number,
  hermesHeapMb?: number
): number {
  let score = 100;
  if (slowQueriesCount === 1) score -= 25;
  else if (slowQueriesCount > 1) score -= Math.min(50, slowQueriesCount * 20);

  if (hermesHeapMb && hermesHeapMb > 60) {
    score -= 20;
  }
  return Math.max(0, score);
}

export function generateDiagnostics(metrics: ScreenMetricSnapshot): AuditDiagnostic[] {
  const list: AuditDiagnostic[] = [];

  // 1. Mount TTI Diagnostic
  if (metrics.mountDurationMs <= 250) {
    list.push({
      id: 'mount-pass',
      category: 'mount',
      severity: 'pass',
      title: 'Optimal Screen Mount (<250ms)',
      description: `Screen mounted in ${metrics.mountDurationMs || '<16'}ms, within standard frame budget.`,
    });
  } else if (metrics.mountDurationMs <= 600) {
    list.push({
      id: 'mount-warn',
      category: 'mount',
      severity: 'warning',
      title: 'Moderate Mount Latency',
      description: `Screen mount took ${metrics.mountDurationMs}ms (budget: <250ms).`,
      suggestion: 'Defer non-critical component trees or heavy initial state computations.',
    });
  } else {
    list.push({
      id: 'mount-crit',
      category: 'mount',
      severity: 'critical',
      title: 'Slow Screen Mount (>600ms)',
      description: `Screen mount took ${metrics.mountDurationMs}ms. User perceives delay on navigation.`,
      suggestion: 'Split heavy components with React.lazy/Suspense or optimize heavy layout trees.',
    });
  }

  // 2. FPS & Dropped frames
  if (metrics.fps >= 55 && metrics.droppedFrames <= 2) {
    list.push({
      id: 'fps-pass',
      category: 'fps',
      severity: 'pass',
      title: 'Smooth 60 FPS Experience',
      description: `Running at ${metrics.fps.toFixed(1)} FPS with ${metrics.droppedFrames} dropped frames.`,
    });
  } else {
    list.push({
      id: 'fps-warn',
      category: 'fps',
      severity: metrics.fps < 40 || metrics.droppedFrames > 8 ? 'critical' : 'warning',
      title: 'Dropped Frames Detected',
      description: `Average FPS was ${metrics.fps.toFixed(1)} with ${metrics.droppedFrames} dropped frame spikes.`,
      suggestion: 'Avoid doing complex JS calculations during scroll or gesture interactions.',
    });
  }

  // 3. Event Loop Lag / Blocking Time
  if (metrics.eventLoopLagMs <= 35) {
    list.push({
      id: 'lag-pass',
      category: 'eventLoop',
      severity: 'pass',
      title: 'Responsive JS Thread (<35ms lag)',
      description: `Max event loop drift was ${metrics.eventLoopLagMs}ms. Zero UI freeze.`,
    });
  } else {
    list.push({
      id: 'lag-warn',
      category: 'eventLoop',
      severity: metrics.eventLoopLagMs > 70 ? 'critical' : 'warning',
      title: 'JS Thread Blocking Lag',
      description: `Event loop heartbeat drifted by ${metrics.eventLoopLagMs}ms (>35ms threshold).`,
      suggestion: 'Break heavy sync blocks into InteractionManager.runAfterInteractions or requestAnimationFrame.',
    });
  }

  // 4. Re-renders & Hotspots
  if (metrics.reRenderHotspots.length === 0 && metrics.reRenderCount <= 2) {
    list.push({
      id: 'render-pass',
      category: 'reRender',
      severity: 'pass',
      title: 'Clean Render Cycle',
      description: 'Zero redundant re-render bursts detected on screen mount.',
    });
  } else {
    const topHotspot = metrics.reRenderHotspots[0];
    const name = topHotspot ? `'${topHotspot.componentName}'` : 'Components';
    const count = topHotspot ? topHotspot.count : metrics.reRenderCount;

    list.push({
      id: 'render-warn',
      category: 'reRender',
      severity: count >= 8 ? 'critical' : 'warning',
      title: 'Re-render Burst Detected',
      description: `${name} re-rendered ${count} times during screen session.`,
      suggestion: 'Wrap component with React.memo and ensure callback props use useCallback / useMemo.',
    });
  }

  // 5. Network / Slow queries
  if (metrics.slowQueriesCount === 0) {
    list.push({
      id: 'net-pass',
      category: 'network',
      severity: 'pass',
      title: 'Fast Screen Data Fetching',
      description: 'Zero slow API or query requests exceeding 500ms.',
    });
  } else {
    list.push({
      id: 'net-warn',
      category: 'network',
      severity: metrics.slowQueriesCount > 2 ? 'critical' : 'warning',
      title: 'Slow Network Requests (>500ms)',
      description: `${metrics.slowQueriesCount} request(s) took over 500ms and delayed screen interactivity.`,
      suggestion: 'Cache responses with TanStack Query or preload data before navigation.',
    });
  }

  // 6. Memory Heap (Hermes)
  if (metrics.hermesHeapMb !== undefined) {
    if (metrics.hermesHeapMb <= 50) {
      list.push({
        id: 'mem-pass',
        category: 'memory',
        severity: 'pass',
        title: 'Hermes Memory Stable',
        description: `Allocated heap is ${metrics.hermesHeapMb}MB. Zero GC pressure.`,
      });
    } else {
      list.push({
        id: 'mem-warn',
        category: 'memory',
        severity: 'warning',
        title: 'High Hermes Heap Allocation',
        description: `Hermes heap currently uses ${metrics.hermesHeapMb}MB.`,
        suggestion: 'Check for unbounded arrays, unreleased image textures, or long-lived closures.',
      });
    }
  }

  return list;
}

export function computeLighthouseScore(metrics: ScreenMetricSnapshot): LighthouseScoreResult {
  const mountScore = computeMountSubScore(metrics.mountDurationMs);
  const fpsScore = computeFpsSubScore(metrics.fps, metrics.droppedFrames);
  const lagScore = computeLagSubScore(metrics.eventLoopLagMs);
  const renderScore = computeRenderSubScore(metrics.reRenderCount);
  const networkMemoryScore = computeNetworkMemorySubScore(
    metrics.slowQueriesCount,
    metrics.hermesHeapMb
  );

  const weightedTotal =
    mountScore * WEIGHT_MOUNT +
    fpsScore * WEIGHT_FPS +
    lagScore * WEIGHT_LAG +
    renderScore * WEIGHT_RENDERS +
    networkMemoryScore * WEIGHT_NETWORK_MEMORY;

  const overallScore = Math.max(0, Math.min(100, Math.round(weightedTotal)));

  let grade: LighthouseScoreGrade = 'fast';
  let gradeLabel = 'EXCELLENT';
  let summary = 'Screen is fast and smooth';

  if (overallScore < 50) {
    grade = 'slow';
    gradeLabel = 'POOR';
    summary = 'Screen is laggy with high dropped frames or blocking work';
  } else if (overallScore < 90) {
    grade = 'average';
    gradeLabel = 'NEEDS IMPROVEMENT';
    summary = 'Screen has noticeable latency or re-render bursts';
  }

  const diagnostics = generateDiagnostics(metrics);

  return {
    overallScore,
    grade,
    gradeLabel,
    summary,
    metrics,
    subScores: {
      mount: mountScore,
      fps: fpsScore,
      lag: lagScore,
      reRenders: renderScore,
      memoryAndNetwork: networkMemoryScore,
    },
    diagnostics,
  };
}

export interface RunAuditOptions {
  sampleDurationMs?: number;
}

/**
 * Executes a live audit session over sampleDurationMs
 */
export async function runLighthouseAudit(
  screenName?: string,
  options: RunAuditOptions = {}
): Promise<LighthouseScoreResult> {
  const duration = options.sampleDurationMs ?? 2000;
  const targetScreen = screenName || screenPerformanceManager.getCurrentScreen();

  // Reset trackers
  fpsTracker.reset();
  fpsTracker.start();
  eventLoopTracker.reset();
  eventLoopTracker.start();

  // Wait for the sample duration window
  await new Promise((resolve) => setTimeout(resolve, duration));

  // Stop trackers
  fpsTracker.stop();
  eventLoopTracker.stop();

  const fpsSnap = fpsTracker.getSnapshot();
  const lagSnap = eventLoopTracker.getSnapshot();
  const screenSnap = screenPerformanceManager.getSnapshot(targetScreen);
  const hermesSnap = getHermesMemorySnapshot();

  // Count slow network requests (>500ms)
  let slowRequests = 0;
  try {
    const requests = networkManager.getRequests();
    slowRequests = requests.filter(
      (r) => r.duration !== undefined && r.duration > 500
    ).length;
  } catch (e) {
    slowRequests = 0;
  }

  const snapshot: ScreenMetricSnapshot = {
    screenName: targetScreen,
    timestamp: Date.now(),
    mountDurationMs: screenSnap.mountDurationMs,
    fps: fpsSnap.fps,
    droppedFrames: fpsSnap.droppedFrames,
    eventLoopLagMs: lagSnap.maxLagMs,
    reRenderCount: screenSnap.reRenderCount,
    reRenderHotspots: screenSnap.reRenderHotspots,
    hermesHeapMb: hermesSnap.heapAllocatedMb,
    slowQueriesCount: slowRequests,
  };

  return computeLighthouseScore(snapshot);
}
