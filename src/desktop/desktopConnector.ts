import { NativeModules, Platform } from 'react-native';
import { consoleManager } from '../modules/console/consoleInterceptor';
import { networkManager } from '../modules/network/networkInterceptor';
import type { ConsoleLogItem, NetworkRequestItem, NetworkMockRule } from '../types';

export interface DesktopConnectorOptions {
  host?: string;
  port?: number;
  autoReconnect?: boolean;
  queryClient?: any;
}

class DesktopConnector {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: any = null;
  private options: DesktopConnectorOptions = {};
  private offlineQueue: string[] = [];

  public init(options: DesktopConnectorOptions = {}) {
    if (this.ws) return;
    this.options = {
      port: 9020,
      autoReconnect: true,
      ...options,
    };

    this.connect();
    this.setupConsoleBridge();
    this.setupNetworkBridge();
    this.setupQueryBridge();
  }

  private resolveHost(): string {
    if (this.options.host) return this.options.host;

    // 1. Android Emulator loopback
    if (Platform.OS === 'android') {
      return '10.0.2.2';
    }

    // 2. Physical device or iOS Simulator
    try {
      const scriptURL = NativeModules?.SourceCode?.scriptURL;
      if (scriptURL) {
        // e.g. "http://192.168.1.15:8081/index.bundle?..."
        const address = scriptURL.split('://')[1].split('/')[0].split(':')[0];
        if (address && address !== 'localhost' && address !== '127.0.0.1') {
          return address;
        }
      }
    } catch {}

    // Default to localhost
    return '127.0.0.1';
  }

  private connect() {
    const host = this.resolveHost();
    const port = this.options.port || 9020;
    const url = `ws://${host}:${port}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.sendHandshake();
        this.flushQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          this.handleIncomingCommand(packet);
        } catch {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.ws = null;
        if (this.options.autoReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      if (this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private send(packet: any) {
    const data = JSON.stringify(packet);
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      if (this.offlineQueue.length > 500) this.offlineQueue.shift();
      this.offlineQueue.push(data);
    }
  }

  private flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      if (item) this.ws.send(item);
    }
  }

  private sendHandshake() {
    this.send({
      type: 'client:handshake',
      payload: {
        appName: 'React Native App',
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        deviceName: Platform.select({
          ios: 'iOS Simulator',
          android: 'Android Device',
          default: 'Mobile Device',
        }),
      },
    });
  }

  private sentRequests = new Set<string>();
  private completedRequests = new Set<string>();

  private handleIncomingCommand(packet: any) {
    // 1. Network Mock rules sync from Desktop
    if (packet.type === 'network:set_mocks') {
      const mocks: any[] = packet.payload || [];
      const formattedMocks: NetworkMockRule[] = mocks.map((m) => {
        const bodyStr = typeof m.responseBody === 'string' ? m.responseBody : JSON.stringify(m.responseBody ?? {});

        return {
          id: m.id,
          urlPattern: m.urlPattern,
          method: m.method,
          status: m.statusCode,
          delayMs: m.delayMs,
          responseBody: bodyStr,
          enabled: m.enabled,
          mode: 'response',
          createdAt: Date.now(),
        };
      });
      networkManager.setRules(formattedMocks);
    }

    // 2. Query cache actions from Desktop
    else if (packet.type === 'query:action' && this.options.queryClient) {
      const { action, queryKey } = packet.payload;
      let key = queryKey;
      if (queryKey) {
        try {
          key = JSON.parse(queryKey);
        } catch {}
      }

      const resolvedKey = key ? (Array.isArray(key) ? key : [key]) : undefined;

      if (action === 'refetch' && resolvedKey) {
        this.options.queryClient.refetchQueries({ queryKey: resolvedKey });
      } else if (action === 'invalidate' && resolvedKey) {
        this.options.queryClient.invalidateQueries({ queryKey: resolvedKey });
      } else if (action === 'reset' && resolvedKey) {
        this.options.queryClient.resetQueries({ queryKey: resolvedKey });
      } else if (action === 'remove' && resolvedKey) {
        this.options.queryClient.removeQueries({ queryKey: resolvedKey });
      } else if (action === 'refetchAll') {
        this.options.queryClient.refetchQueries();
      } else if (action === 'clearAll') {
        this.options.queryClient.clear();
      } else if (action === 'triggerLoading' && resolvedKey) {
        const q = this.options.queryClient.getQueryCache().find({ queryKey: resolvedKey });
        if (q) {
          q.setState((old: any) => ({ ...old, status: 'pending', fetchStatus: 'fetching' }));
        }
      } else if (action === 'triggerError' && resolvedKey) {
        const q = this.options.queryClient.getQueryCache().find({ queryKey: resolvedKey });
        if (q) {
          q.setState((old: any) => ({ ...old, status: 'error', error: new Error('Simulated Devtools Error') }));
        }
      }
    }
  }

  private setupConsoleBridge() {
    consoleManager.init();
    consoleManager.subscribe((logs: ConsoleLogItem[]) => {
      if (logs.length === 0) return;
      const latest = logs[0];
      this.send({
        type: 'console:log',
        payload: {
          level: latest.level,
          args: latest.args,
          timestamp: latest.timestamp,
          stack: latest.stackTrace,
        },
      });
    });
  }

  private setupNetworkBridge() {
    networkManager.init();
    networkManager.subscribe((requests: NetworkRequestItem[]) => {
      if (!requests || requests.length === 0) return;

      requests.forEach((req) => {
        // 1. Request initiated
        if (!this.sentRequests.has(req.id)) {
          this.sentRequests.add(req.id);
          this.send({
            type: 'network:request',
            payload: {
              id: req.id,
              url: req.url,
              method: req.method,
              headers: req.requestHeaders,
              body: req.requestBody,
              timestamp: req.startTime,
              isMocked: req.isOverridden,
            },
          });
        }

        // 2. Response completed
        if (req.status !== undefined && req.status !== 0 && !this.completedRequests.has(req.id)) {
          this.completedRequests.add(req.id);
          this.send({
            type: 'network:response',
            payload: {
              id: req.id,
              status: req.status,
              headers: req.responseHeaders,
              body: req.responseBody,
              durationMs: req.duration || 0,
              isMocked: req.isOverridden,
            },
          });
        }
      });

      // Keep tracking sets within reasonable size
      if (this.sentRequests.size > 1000) {
        this.sentRequests.clear();
        this.completedRequests.clear();
      }
    });
  }

  private setupQueryBridge() {
    const qc = this.options.queryClient;
    if (!qc || !qc.getQueryCache) return;

    try {
      const cache = qc.getQueryCache();

      const syncQuery = (q: any) => {
        if (!q || !q.queryKey) return;
        const key = JSON.stringify(q.queryKey);
        const observersCount = typeof q.getObserversCount === 'function' ? q.getObserversCount() : 0;
        let status: 'fetching' | 'stale' | 'fresh' | 'error' | 'paused' | 'inactive' = 'fresh';

        if (q.state.fetchStatus === 'fetching') {
          status = 'fetching';
        } else if (q.state.fetchStatus === 'paused') {
          status = 'paused';
        } else if (q.state.status === 'error') {
          status = 'error';
        } else if (observersCount === 0) {
          status = 'inactive';
        } else if (q.isStale && q.isStale()) {
          status = 'stale';
        }

        this.send({
          type: 'query:update',
          payload: {
            key,
            queryHash: q.queryHash,
            status,
            data: q.state.data,
            updatedAt: q.state.dataUpdatedAt || Date.now(),
            observersCount,
            state: {
              status: q.state.status,
              fetchStatus: q.state.fetchStatus,
              error: q.state.error ? (q.state.error.message || String(q.state.error)) : null,
              dataUpdatedAt: q.state.dataUpdatedAt,
              errorUpdatedAt: q.state.errorUpdatedAt,
              fetchFailureCount: q.state.fetchFailureCount,
              isInvalidated: q.state.isInvalidated,
            },
            options: {
              gcTime: q.options?.gcTime ?? q.options?.cacheTime,
              staleTime: q.options?.staleTime,
              retry: q.options?.retry,
            },
          },
        });
      };

      // 1. Initial sync of all existing queries currently in cache
      cache.getAll().forEach((q: any) => syncQuery(q));

      // 2. Subscribe to all subsequent query events
      cache.subscribe((event: any) => {
        if (event && event.query) {
          syncQuery(event.query);
        }
      });
    } catch {}
  }
}

export const desktopConnector = new DesktopConnector();
export function connectToDesktop(options?: DesktopConnectorOptions) {
  desktopConnector.init(options);
}
