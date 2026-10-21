import { ConsoleLogManager } from '../consoleInterceptor';

describe('consoleInterceptor', () => {
  let manager: ConsoleLogManager;

  beforeEach(() => {
    manager = new ConsoleLogManager();
  });

  afterEach(() => {
    manager.restore();
  });

  it('starts with empty logs', () => {
    expect(manager.getLogs()).toEqual([]);
  });

  it('clears logs and notifies listeners', (done) => {
    let callCount = 0;
    const unsubscribe = manager.subscribe((logs) => {
      callCount += 1;
      if (callCount === 1) {
        expect(logs).toEqual([]);
      } else if (callCount === 2) {
        expect(logs).toEqual([]);
        unsubscribe();
        done();
      }
    });

    manager.clear();
  });

  it('unsubscribes listeners accurately', () => {
    const mockListener = jest.fn();
    const unsubscribe = manager.subscribe(mockListener);

    expect(mockListener).toHaveBeenCalledTimes(1);
    unsubscribe();

    manager.clear();
    setTimeout(() => {
      expect(mockListener).toHaveBeenCalledTimes(1);
    }, 10);
  });

  describe('interception & cloneSafe', () => {
    beforeEach(() => {
      manager.init(true);
    });

    it('intercepts log, info, warn, error, and debug messages', () => {
      console.log('test log message');
      console.info('test info message');
      console.warn('test warn message');
      console.error('test error message');
      console.debug('test debug message');

      const logs = manager.getLogs();
      expect(logs).toHaveLength(5);
      expect(logs[4].level).toBe('log');
      expect(logs[4].args).toEqual(['test log message']);
      expect(logs[3].level).toBe('info');
      expect(logs[2].level).toBe('warn');
      expect(logs[1].level).toBe('error');
      expect(logs[1].stackTrace).toBeDefined();
      expect(logs[0].level).toBe('debug');
    });

    it('safely handles null and undefined arguments', () => {
      console.log(null, undefined);
      const logs = manager.getLogs();
      expect(logs[0].args).toEqual([null, undefined]);
    });

    it('skips re-initialization and respects test environment guard', () => {
      const freshManager = new ConsoleLogManager();
      freshManager.init(); // force = false, in test env
      expect((freshManager as any).isInitialized).toBe(false);

      freshManager.init(true);
      expect((freshManager as any).isInitialized).toBe(true);

      // Re-init guard (already initialized)
      freshManager.init(true);
      expect((freshManager as any).isInitialized).toBe(true);
      freshManager.restore();
    });

    it('safely clones Error objects', () => {
      const error = new Error('Custom failure');
      console.error(error);

      const logs = manager.getLogs();
      const clonedError = logs[0].args[0] as Record<string, unknown>;
      expect(clonedError.name).toBe('Error');
      expect(clonedError.message).toBe('Custom failure');
      expect(clonedError.stack).toBeDefined();
    });

    it('caps deep nested objects at [Deep Object]', () => {
      const deeplyNested = {
        l1: {
          l2: {
            l3: {
              l4: {
                l5: 'too deep',
              },
            },
          },
        },
      };

      console.log(deeplyNested);
      const logs = manager.getLogs();
      const firstArg = logs[0].args[0] as any;
      expect(firstArg.l1.l2.l3.l4).toBe('[Deep Object]');
    });

    it('limits large arrays to 50 items', () => {
      const largeArray = Array.from({ length: 70 }, (_, i) => i);
      console.log(largeArray);

      const logs = manager.getLogs();
      const firstArg = logs[0].args[0] as unknown[];
      expect(firstArg).toHaveLength(50);
    });

    it('limits objects with more than 50 keys', () => {
      const largeObj: Record<string, number> = {};
      for (let i = 0; i < 70; i++) {
        largeObj[`key_${i}`] = i;
      }
      console.log(largeObj);

      const logs = manager.getLogs();
      const firstArg = logs[0].args[0] as Record<string, unknown>;
      expect(Object.keys(firstArg)).toHaveLength(50);
    });

    it('caps maximum stored logs to 300 items', () => {
      const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
      for (let i = 0; i < 310; i++) {
        console.log(`Log entry ${i}`);
      }
      spy.mockRestore();

      expect(manager.getLogs()).toHaveLength(300);
    });

    it('falls back to string representation when object property access throws', () => {
      const explosive = {
        get faulty() {
          throw new Error('Access denied');
        },
      };

      console.log(explosive);
      const logs = manager.getLogs();
      expect(logs[0].args[0]).toBe('[object Object]');
    });
  });
});
