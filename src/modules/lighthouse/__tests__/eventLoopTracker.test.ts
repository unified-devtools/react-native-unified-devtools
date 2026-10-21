import { EventLoopTracker } from '../eventLoopTracker';
import { getHermesMemorySnapshot } from '../hermesTracker';

describe('EventLoopTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tracks JS thread heartbeat and calculates lag', () => {
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const tracker = new EventLoopTracker(35);
    tracker.start();

    // Advance timer by 35ms normally
    now += 35;
    jest.advanceTimersByTime(35);

    // Simulate JS thread block of 85ms (lag = 50ms)
    now += 85;
    jest.advanceTimersByTime(35);

    const snapshot = tracker.getSnapshot();
    expect(snapshot.maxLagMs).toBeGreaterThanOrEqual(45);
    expect(snapshot.sampleCount).toBeGreaterThan(0);

    tracker.stop();
  });
});

describe('hermesTracker', () => {
  afterEach(() => {
    delete (global as any).HermesInternal;
  });

  it('returns safe fallback when Hermes is not present', () => {
    const mem = getHermesMemorySnapshot();
    expect(mem.isHermes).toBe(false);
    expect(mem.heapAllocatedMb).toBeUndefined();
  });

  it('extracts memory heap metrics when Hermes is present', () => {
    (global as any).HermesInternal = {
      getRuntimeProperties: () => ({
        'Hermes js_allocated_bytes': '25165824', // 24 MB
        'Hermes js_heap_size': '33554432', // 32 MB
      }),
    };

    const mem = getHermesMemorySnapshot();
    expect(mem.isHermes).toBe(true);
    expect(mem.heapAllocatedMb).toBeCloseTo(24, 1);
    expect(mem.heapTotalMb).toBeCloseTo(32, 1);
  });
});
