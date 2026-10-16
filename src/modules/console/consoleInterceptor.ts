import type { ConsoleLogItem, ConsoleLogLevel } from '../../types';

class ConsoleLogManager {
  private logs: ConsoleLogItem[] = [];
  private listeners: Set<(logs: ConsoleLogItem[]) => void> = new Set();
  private isInitialized = false;

  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  public init() {
    if (this.isInitialized || process.env.NODE_ENV === 'test') return;
    this.isInitialized = true;

    const levels: ConsoleLogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

    levels.forEach((level) => {
      const originalFn = this.originalConsole[level];

      console[level] = (...args: unknown[]) => {
        // Call native console first
        originalFn.apply(console, args);

        try {
          const item: ConsoleLogItem = {
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            level,
            timestamp: Date.now(),
            args: args.map((arg) => this.cloneSafe(arg)),
            stackTrace: level === 'error' ? new Error().stack : undefined,
          };

          this.logs.unshift(item); // Newest first

          // Keep max 300 logs
          if (this.logs.length > 300) {
            this.logs.pop();
          }

          this.notify();
        } catch {
          // Prevent any logging error from crashing the app
        }
      };
    });
  }

  private cloneSafe(obj: unknown, depth = 0): unknown {
    if (depth > 3) return '[Deep Object]';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: obj.stack,
      };
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 50).map((item) => this.cloneSafe(item, depth + 1));
    }

    try {
      const copy: Record<string, unknown> = {};
      const keys = Object.keys(obj).slice(0, 50);
      for (const k of keys) {
        copy[k] = this.cloneSafe((obj as Record<string, unknown>)[k], depth + 1);
      }
      return copy;
    } catch {
      return String(obj);
    }
  }

  public getLogs(): ConsoleLogItem[] {
    return this.logs;
  }

  public clear() {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: (logs: ConsoleLogItem[]) => void) {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = [...this.logs];
    this.listeners.forEach((l) => l(current));
  }
}

export const consoleManager = new ConsoleLogManager();
