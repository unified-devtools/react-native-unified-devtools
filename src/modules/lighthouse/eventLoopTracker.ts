/**
 * EventLoopTracker - Measures React Native JavaScript thread responsiveness and event loop lag
 * Target: < 35ms drift. Lag > 35ms indicates thread lockups / dropped interactions.
 */

export interface EventLoopSnapshot {
  currentLagMs: number;
  averageLagMs: number;
  maxLagMs: number;
  totalBlockingTimeMs: number;
  sampleCount: number;
}

export type EventLoopListener = (snapshot: EventLoopSnapshot) => void;

export class EventLoopTracker {
  private intervalMs: number;
  private timerId: NodeJS.Timeout | null = null;
  private isTracking = false;
  private lastTick = 0;
  private sampleCount = 0;
  private totalLag = 0;
  private maxLag = 0;
  private currentLag = 0;
  private totalBlockingTime = 0;
  private listeners: Set<EventLoopListener> = new Set();

  constructor(intervalMs = 35) {
    this.intervalMs = intervalMs;
  }

  public start(): void {
    if (this.isTracking) return;
    this.isTracking = true;
    this.reset();
    this.lastTick = Date.now();

    this.timerId = setInterval(() => {
      if (!this.isTracking) return;
      const now = Date.now();
      const elapsed = now - this.lastTick;
      const lag = Math.max(0, elapsed - this.intervalMs);

      this.currentLag = lag;
      this.sampleCount++;
      this.totalLag += lag;

      if (lag > this.maxLag) {
        this.maxLag = lag;
      }

      // Blocking time: time exceeding 50ms is treated as Long Task in web CWV / RN
      if (lag > 15) {
        this.totalBlockingTime += lag;
      }

      this.lastTick = now;
      this.notify();
    }, this.intervalMs);
  }

  public stop(): void {
    this.isTracking = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public reset(): void {
    this.sampleCount = 0;
    this.totalLag = 0;
    this.maxLag = 0;
    this.currentLag = 0;
    this.totalBlockingTime = 0;
    this.lastTick = Date.now();
  }

  public isRunning(): boolean {
    return this.isTracking;
  }

  public getSnapshot(): EventLoopSnapshot {
    return {
      currentLagMs: Math.round(this.currentLag),
      averageLagMs:
        this.sampleCount > 0 ? Math.round(this.totalLag / this.sampleCount) : 0,
      maxLagMs: Math.round(this.maxLag),
      totalBlockingTimeMs: Math.round(this.totalBlockingTime),
      sampleCount: this.sampleCount,
    };
  }

  public subscribe(listener: EventLoopListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snap);
      } catch (err) {
        // Safe callback execution
      }
    });
  }
}

export const eventLoopTracker = new EventLoopTracker(35);
