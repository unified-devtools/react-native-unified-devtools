import { computeLighthouseScore, runLighthouseAudit } from '../lighthouseAuditor';
import type { ScreenMetricSnapshot } from '../types';

describe('lighthouseAuditor', () => {
  it('calculates 90+ score and passes for excellent performance metrics', () => {
    const metrics: ScreenMetricSnapshot = {
      screenName: 'HomeScreen',
      timestamp: Date.now(),
      mountDurationMs: 140,
      fps: 59.5,
      droppedFrames: 0,
      eventLoopLagMs: 8,
      reRenderCount: 1,
      reRenderHotspots: [],
      hermesHeapMb: 20,
      slowQueriesCount: 0,
    };

    const result = computeLighthouseScore(metrics);
    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe('fast');
    expect(result.gradeLabel).toBe('EXCELLENT');
    expect(result.diagnostics.every((d) => d.severity === 'pass')).toBe(true);
  });

  it('detects re-render hotspots, lag, and drops score accordingly', () => {
    const slowMetrics: ScreenMetricSnapshot = {
      screenName: 'DetailScreen',
      timestamp: Date.now(),
      mountDurationMs: 750,
      fps: 28,
      droppedFrames: 12,
      eventLoopLagMs: 85,
      reRenderCount: 9,
      reRenderHotspots: [{ componentName: 'CartButton', count: 6 }],
      hermesHeapMb: 45,
      slowQueriesCount: 2,
    };

    const result = computeLighthouseScore(slowMetrics);
    expect(result.overallScore).toBeLessThan(60);
    expect(result.grade).toBe('slow');

    const hotspotDiag = result.diagnostics.find((d) => d.category === 'reRender');
    expect(hotspotDiag).toBeDefined();
    expect(hotspotDiag?.severity).toBe('warning');
    expect(hotspotDiag?.description).toContain('CartButton');

    const lagDiag = result.diagnostics.find((d) => d.category === 'eventLoop');
    expect(lagDiag?.severity).toBe('critical');
  });

  it('runs complete audit session asynchronously', async () => {
    const audit = await runLighthouseAudit('ProfileScreen', { sampleDurationMs: 50 });
    expect(audit).toBeDefined();
    expect(audit.metrics.screenName).toBe('ProfileScreen');
    expect(audit.overallScore).toBeGreaterThanOrEqual(0);
    expect(audit.overallScore).toBeLessThanOrEqual(100);
  });
});
