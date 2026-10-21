/**
 * FpsTracker - Measures live JS/UI frame rate and dropped frames
 * Uses requestAnimationFrame with minimal overhead.
 */

export interface FpsData {
  fps: number;
  droppedFrames: number;
  totalFrames: number;
  timestamp: number;
}

export type FpsListener = (data: FpsData) => void;

const getRaf = (): ((callback: (timestamp: number) => void) => number) => {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame;
  }
  return (cb) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
};

const getCancelRaf = (): ((id: number) => void) => {
  if (typeof cancelAnimationFrame === 'function') {
    return cancelAnimationFrame;
  }
  return (id) => clearTimeout(id as unknown as NodeJS.Timeout);
};

export class FpsTracker {
  private isTracking = false;
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private droppedFrames = 0;
  private currentFps = 60;
  private windowStart = 0;
  private listeners: Set<FpsListener> = new Set();

  public start(): void {
    if (this.isTracking) return;
    this.isTracking = true;
    this.reset();

    const raf = getRaf();

    const loop = (timestamp: number) => {
      if (!this.isTracking) return;

      if (this.lastFrameTime === 0) {
        this.lastFrameTime = timestamp;
        this.windowStart = timestamp;
      } else {
        const delta = timestamp - this.lastFrameTime;
        this.frameCount++;

        // Any frame taking longer than ~21ms represents a dropped frame on 60Hz (16.6ms budget)
        if (delta > 21) {
          const dropped = Math.floor(delta / 16.67) - 1;
          this.droppedFrames += Math.max(1, dropped);
        }

        const windowElapsed = timestamp - this.windowStart;
        if (windowElapsed >= 500) {
          // Compute rolling FPS over the window
          this.currentFps = Math.min(60, Math.round((this.frameCount * 1000) / windowElapsed));
          this.notify();
          this.windowStart = timestamp;
          this.frameCount = 0;
        }

        this.lastFrameTime = timestamp;
      }

      this.rafId = raf(loop);
    };

    this.rafId = raf(loop);
  }

  public stop(): void {
    this.isTracking = false;
    if (this.rafId !== null) {
      const cancelRaf = getCancelRaf();
      cancelRaf(this.rafId);
      this.rafId = null;
    }
  }

  public reset(): void {
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.currentFps = 60;
    this.windowStart = 0;
  }

  public isRunning(): boolean {
    return this.isTracking;
  }

  public getSnapshot(): FpsData {
    return {
      fps: this.currentFps,
      droppedFrames: this.droppedFrames,
      totalFrames: this.frameCount,
      timestamp: Date.now(),
    };
  }

  public subscribe(listener: FpsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const data = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        // Safe execution
      }
    });
  }
}

export const fpsTracker = new FpsTracker();
