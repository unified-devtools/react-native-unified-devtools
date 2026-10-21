import { FpsTracker } from '../fpsTracker';

describe('FpsTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).requestAnimationFrame;
    delete (global as any).cancelAnimationFrame;
  });

  it('tracks frame times and computes FPS and dropped frames', () => {
    let rafCallback: ((timestamp: number) => void) | null = null;
    let frameId = 1;

    (global as any).requestAnimationFrame = jest.fn((cb) => {
      rafCallback = cb;
      return frameId++;
    });
    (global as any).cancelAnimationFrame = jest.fn(() => {
      rafCallback = null;
    });

    const tracker = new FpsTracker();
    tracker.start();
    expect(tracker.isRunning()).toBe(true);

    // Initial frame
    rafCallback!(1000);
    // 2nd frame 16.6ms later -> ~60fps
    rafCallback!(1016.6);
    // 3rd frame 16.6ms later
    rafCallback!(1033.3);
    // 4th frame after a 50ms drop -> dropped frame
    rafCallback!(1083.3);

    const snapshot = tracker.getSnapshot();
    expect(snapshot.fps).toBeGreaterThan(0);
    expect(snapshot.droppedFrames).toBeGreaterThanOrEqual(1);

    tracker.stop();
    expect(tracker.isRunning()).toBe(false);
  });

  it('notifies listeners on frame updates', () => {
    let rafCallback: ((timestamp: number) => void) | null = null;
    (global as any).requestAnimationFrame = jest.fn((cb) => {
      rafCallback = cb;
      return 1;
    });
    (global as any).cancelAnimationFrame = jest.fn();

    const tracker = new FpsTracker();
    const listener = jest.fn();
    const unsubscribe = tracker.subscribe(listener);

    tracker.start();
    rafCallback!(1000);
    // trigger 500ms elapsed
    rafCallback!(1600);

    expect(listener).toHaveBeenCalled();
    unsubscribe();
    tracker.stop();
  });
});
