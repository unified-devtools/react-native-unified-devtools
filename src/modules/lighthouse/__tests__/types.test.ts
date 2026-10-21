import type { LighthouseScoreResult, ScreenMetricSnapshot } from '../types';

describe('Lighthouse Types', () => {
  it('instantiates valid ScreenMetricSnapshot', () => {
    const snapshot: ScreenMetricSnapshot = {
      screenName: 'HomeScreen',
      timestamp: Date.now(),
      mountDurationMs: 140,
      fps: 59.8,
      droppedFrames: 1,
      eventLoopLagMs: 8,
      reRenderCount: 2,
      reRenderHotspots: [{ componentName: 'HeaderPill', count: 2 }],
      hermesHeapMb: 24.5,
      slowQueriesCount: 0,
    };

    expect(snapshot.screenName).toBe('HomeScreen');
    expect(snapshot.mountDurationMs).toBeLessThan(250);
    expect(snapshot.fps).toBeGreaterThan(50);
  });

  it('instantiates valid LighthouseScoreResult with 0-100 range', () => {
    const result: LighthouseScoreResult = {
      overallScore: 94,
      grade: 'fast',
      gradeLabel: 'EXCELLENT',
      summary: 'Screen is fast and smooth',
      metrics: {
        screenName: 'FeedScreen',
        timestamp: Date.now(),
        mountDurationMs: 180,
        fps: 60,
        droppedFrames: 0,
        eventLoopLagMs: 5,
        reRenderCount: 1,
        reRenderHotspots: [],
        hermesHeapMb: 19.2,
        slowQueriesCount: 0,
      },
      subScores: {
        mount: 95,
        fps: 100,
        lag: 98,
        reRenders: 90,
        memoryAndNetwork: 95,
      },
      diagnostics: [
        {
          id: 'mount-ok',
          category: 'mount',
          severity: 'pass',
          title: 'Fast Screen Mount',
          description: 'Mount time is within the 250ms target.',
        },
      ],
    };

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.severity).toBe('pass');
  });
});
