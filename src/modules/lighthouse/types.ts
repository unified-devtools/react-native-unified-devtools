/**
 * React Native Unified DevTools - Screen Lighthouse Performance Auditor Types
 * Conforms to REACT_NATIVE_UNIFIED_DEVTOOLS_SPEC.md & REACT_NATIVE_DEVTOOLS_TAB_DESIGNS.md
 */

export type DiagnosticSeverity = 'pass' | 'warning' | 'critical';

export type DiagnosticCategory =
  | 'mount'
  | 'fps'
  | 'eventLoop'
  | 'reRender'
  | 'memory'
  | 'network';

export interface AuditDiagnostic {
  id: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  title: string;
  description: string;
  suggestion?: string;
}

export interface ReRenderHotspot {
  componentName: string;
  count: number;
}

export interface ScreenMetricSnapshot {
  screenName: string;
  timestamp: number;
  /** Milliseconds from navigation/mount start to render commit (Target: < 250ms) */
  mountDurationMs: number;
  /** Live JS thread / display FPS (Target: 60) */
  fps: number;
  /** Number of dropped frames during measurement window */
  droppedFrames: number;
  /** JS event loop heartbeat drift / lag in ms (Target: < 35ms) */
  eventLoopLagMs: number;
  /** Number of re-renders within window */
  reRenderCount: number;
  /** Hotspot components that re-rendered > 3 times */
  reRenderHotspots: ReRenderHotspot[];
  /** Hermes memory heap in MB (if Hermes is active) */
  hermesHeapMb?: number;
  /** Number of slow network/query requests (> 500ms) */
  slowQueriesCount: number;
}

export type LighthouseScoreGrade = 'fast' | 'average' | 'slow';

export interface LighthouseScoreResult {
  /** Overall performance score (0 - 100) */
  overallScore: number;
  /** Rating bucket */
  grade: LighthouseScoreGrade;
  /** Visual rating tag (e.g. "EXCELLENT", "NEEDS IMPROVEMENT", "POOR") */
  gradeLabel: string;
  /** Qualitative headline summary */
  summary: string;
  /** Core metric values */
  metrics: ScreenMetricSnapshot;
  /** Sub-score breakdowns (0 - 100 each) */
  subScores: {
    mount: number;
    fps: number;
    lag: number;
    reRenders: number;
    memoryAndNetwork: number;
  };
  /** Actionable checklist */
  diagnostics: AuditDiagnostic[];
}

export interface LighthouseAuditConfig {
  /** Target mount budget in ms. Default: 250 */
  targetMountMs?: number;
  /** Target frame rate. Default: 60 */
  targetFps?: number;
  /** Maximum tolerable event loop lag in ms. Default: 35 */
  maxLagMs?: number;
  /** Sample window duration for recording audit in ms. Default: 3000 */
  sampleWindowMs?: number;
}
