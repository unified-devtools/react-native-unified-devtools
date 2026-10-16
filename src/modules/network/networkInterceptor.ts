import type {
  HttpMethod,
  NetworkClientType,
  NetworkMockRule,
  NetworkOverrideMode,
  NetworkRequestItem,
} from '../../types';

function getStatusText(status: number): string {
  const map: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return map[status] || 'Unknown';
}

function matchUrlPattern(pattern: string, url: string): boolean {
  if (!pattern || !url) return false;
  const p = pattern.trim();
  const u = url.trim();
  if (p === '*' || p === '') return true;

  // 1. Direct equality (ignore trailing slashes)
  const normP = p.replace(/\/+$/, '');
  const normU = u.replace(/\/+$/, '');
  if (normP === normU) return true;

  // 2. Exact match against pathname
  try {
    const urlObj = new URL(u);
    const pathname = urlObj.pathname.replace(/\/+$/, '');
    if (pathname === normP || normP === pathname + urlObj.search) return true;
  } catch {}

  // 3. Simple substring match if no glob character
  if (!p.includes('*')) {
    if (u.includes(p)) return true;
    try {
      const urlObj = new URL(u);
      if (urlObj.pathname.includes(p)) return true;
    } catch {}
  }

  // 4. Wildcard / Glob match
  try {
    const escaped = p
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');

    const fullRegex = new RegExp(`^${escaped}$`, 'i');
    if (fullRegex.test(u)) return true;

    const subRegex = new RegExp(escaped, 'i');
    if (subRegex.test(u)) return true;

    try {
      const urlObj = new URL(u);
      if (subRegex.test(urlObj.pathname)) return true;
    } catch {}
  } catch {
    return u.includes(p);
  }

  return false;
}

class NetworkManager {
  private requests: NetworkRequestItem[] = [];
  private mockRules: NetworkMockRule[] = [];
  private overridesEnabled = true;
  private listeners = new Set<(requests: NetworkRequestItem[]) => void>();
  private rulesListeners = new Set<(rules: NetworkMockRule[]) => void>();
  private isInitialized = false;

  private originalFetch: typeof global.fetch | null = null;
  private originalXHR: typeof global.XMLHttpRequest | null = null;

  public init() {
    if (this.isInitialized || process.env.NODE_ENV === 'test') return;
    this.isInitialized = true;

    this.instrumentFetch();
    this.instrumentXHR();
  }

  public getRequests(): NetworkRequestItem[] {
    return this.requests;
  }

  public clear(): void {
    this.requests = [];
    this.notifyRequests();
  }

  public getRules(): NetworkMockRule[] {
    return this.mockRules;
  }

  public isMasterOverrideEnabled(): boolean {
    return this.overridesEnabled;
  }

  public setMasterOverrideEnabled(enabled: boolean): void {
    this.overridesEnabled = enabled;
    this.notifyRules();
  }

  public addRule(rule: Omit<NetworkMockRule, 'id' | 'createdAt'>): NetworkMockRule {
    const newRule: NetworkMockRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    this.mockRules.unshift(newRule);
    this.notifyRules();
    return newRule;
  }

  public updateRule(id: string, updates: Partial<NetworkMockRule>): void {
    this.mockRules = this.mockRules.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    this.notifyRules();
  }

  public toggleRule(id: string): void {
    this.mockRules = this.mockRules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    this.notifyRules();
  }

  public deleteRule(id: string): void {
    this.mockRules = this.mockRules.filter((r) => r.id !== id);
    this.notifyRules();
  }

  public subscribe(listener: (requests: NetworkRequestItem[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.requests]);
    return () => this.listeners.delete(listener);
  }

  public subscribeRules(listener: (rules: NetworkMockRule[]) => void): () => void {
    this.rulesListeners.add(listener);
    listener([...this.mockRules]);
    return () => this.rulesListeners.delete(listener);
  }

  private notifyRequests(): void {
    const data = [...this.requests];
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch {
        // Safe notification
      }
    });
  }

  private notifyRules(): void {
    const data = [...this.mockRules];
    this.rulesListeners.forEach((listener) => {
      try {
        listener(data);
      } catch {
        // Safe notification
      }
    });
  }

  public findMatchingRule(url: string, method: string): NetworkMockRule | undefined {
    if (!this.overridesEnabled) return undefined;
    const reqMethod = (method || 'GET').toUpperCase();

    return this.mockRules.find((rule) => {
      if (!rule.enabled) return false;
      const ruleMethod = rule.method.toUpperCase();
      if (ruleMethod !== 'ANY' && ruleMethod !== reqMethod) return false;
      return matchUrlPattern(rule.urlPattern, url);
    });
  }

  private recordRequest(item: NetworkRequestItem): void {
    this.requests.unshift(item);
    if (this.requests.length > 500) {
      this.requests.pop();
    }
    this.notifyRequests();
  }

  private updateRequest(id: string, updates: Partial<NetworkRequestItem>): void {
    const idx = this.requests.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.requests[idx] = { ...this.requests[idx], ...updates };
      this.notifyRequests();
    }
  }

  /* -------------------------------------------------------------
   * 1. Global fetch() Interception & Mock Overrides
   * ----------------------------------------------------------- */
  private instrumentFetch(): void {
    if (typeof global.fetch !== 'function') return;
    this.originalFetch = global.fetch;
    const originalFetch = this.originalFetch;

    global.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (typeof Request !== 'undefined' && input instanceof Request) {
        url = input.url;
      } else if (input && typeof (input as any).url === 'string') {
        url = (input as any).url;
      }

      const method = (
        init?.method ||
        (typeof Request !== 'undefined' && input instanceof Request
          ? input.method
          : 'GET')
      ).toUpperCase();

      // Parse headers
      const requestHeaders: Record<string, string> = {};
      const rawHeaders = init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
      if (rawHeaders) {
        if (typeof Headers !== 'undefined' && rawHeaders instanceof Headers) {
          rawHeaders.forEach((val: string, key: string) => {
            requestHeaders[key] = val;
          });
        } else if (Array.isArray(rawHeaders)) {
          rawHeaders.forEach(([key, val]) => {
            requestHeaders[key] = val;
          });
        } else if (typeof rawHeaders === 'object') {
          Object.assign(requestHeaders, rawHeaders);
        }
      }

      // Parse request body
      let requestBody: unknown = init?.body;
      if (typeof requestBody === 'string') {
        try {
          requestBody = JSON.parse(requestBody);
        } catch {
          // Keep raw string
        }
      }

      const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const startTime = Date.now();

      // Check for matching mock rule
      const matchedRule = this.findMatchingRule(url, method);

      if (matchedRule) {
        // Apply artificial latency if configured
        if (matchedRule.delayMs && matchedRule.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, matchedRule.delayMs));
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (matchedRule.mode === 'offline') {
          this.recordRequest({
            id,
            url,
            method,
            client: 'fetch',
            startTime,
            endTime,
            duration,
            status: 0,
            statusText: 'Network Failed (Offline Mock)',
            requestHeaders,
            requestBody,
            error: 'TypeError: Network request failed',
            isPending: false,
            isOverridden: true,
            matchedRuleId: matchedRule.id,
          });
          throw new TypeError('Network request failed');
        }

        if (matchedRule.mode === 'timeout') {
          this.recordRequest({
            id,
            url,
            method,
            client: 'fetch',
            startTime,
            endTime,
            duration,
            status: 0,
            statusText: 'Timed Out (Mock)',
            requestHeaders,
            requestBody,
            error: 'The operation timed out.',
            isPending: false,
            isOverridden: true,
            matchedRuleId: matchedRule.id,
          });
          throw new Error('The operation timed out.');
        }

        // Response Override
        let responseParsedBody: unknown = matchedRule.responseBody;
        try {
          responseParsedBody = JSON.parse(matchedRule.responseBody);
        } catch {
          // Keep as text string
        }

        const respHeadersRecord: Record<string, string> = {
          'content-type': 'application/json; charset=utf-8',
          'x-powered-by': 'Unified-DevTools-Mock',
          ...(matchedRule.responseHeaders || {}),
        };

        this.recordRequest({
          id,
          url,
          method,
          client: 'fetch',
          startTime,
          endTime,
          duration,
          status: matchedRule.status,
          statusText: matchedRule.statusText || getStatusText(matchedRule.status),
          requestHeaders,
          requestBody,
          responseHeaders: respHeadersRecord,
          responseBody: responseParsedBody,
          isPending: false,
          isOverridden: true,
          matchedRuleId: matchedRule.id,
        });

        const synthHeaders = typeof Headers !== 'undefined'
          ? new Headers(respHeadersRecord)
          : (respHeadersRecord as any);

        return new Response(matchedRule.responseBody, {
          status: matchedRule.status,
          statusText: matchedRule.statusText || getStatusText(matchedRule.status),
          headers: synthHeaders,
        });
      }

      // Normal execution - No mock rule matched
      const requestItem: NetworkRequestItem = {
        id,
        url,
        method,
        client: 'fetch',
        startTime,
        requestHeaders,
        requestBody,
        isPending: true,
      };
      this.recordRequest(requestItem);

      try {
        const response = await originalFetch(input, init);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const responseHeaders: Record<string, string> = {};
        if (response.headers && typeof response.headers.forEach === 'function') {
          response.headers.forEach((val: string, key: string) => {
            responseHeaders[key] = val;
          });
        }

        let responseBody: unknown = undefined;
        try {
          const clone = response.clone();
          const text = await clone.text();
          try {
            responseBody = JSON.parse(text);
          } catch {
            responseBody = text;
          }
        } catch {
          // Unreadable / streaming response
        }

        this.updateRequest(id, {
          endTime,
          duration,
          status: response.status,
          statusText: response.statusText,
          responseHeaders,
          responseBody,
          isPending: false,
        });

        return response;
      } catch (err: any) {
        const endTime = Date.now();
        this.updateRequest(id, {
          endTime,
          duration: endTime - startTime,
          status: 0,
          statusText: 'Failed',
          error: err?.message || String(err),
          isPending: false,
        });
        throw err;
      }
    };
  }

  /* -------------------------------------------------------------
   * 2. XMLHttpRequest Interception (Axios, Apollo, XHR)
   * ----------------------------------------------------------- */
  private instrumentXHR(): void {
    if (typeof global.XMLHttpRequest !== 'function') return;
    this.originalXHR = global.XMLHttpRequest;
    const OriginalXHR = this.originalXHR;
    const manager = this;

    const originalOpen = OriginalXHR.prototype.open;
    const originalSetRequestHeader = OriginalXHR.prototype.setRequestHeader;
    const originalSend = OriginalXHR.prototype.send;

    OriginalXHR.prototype.open = function (
      this: any,
      method: string,
      url: string | URL,
      async?: boolean,
      user?: string | null,
      password?: string | null
    ) {
      this._rdtId = `xhr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this._rdtMethod = (method || 'GET').toUpperCase();
      this._rdtUrl = typeof url === 'string' ? url : url.toString();
      this._rdtHeaders = {};
      this._rdtStartTime = Date.now();

      return originalOpen.apply(this, [
        method,
        url as any,
        async ?? true,
        user,
        password,
      ]);
    };

    OriginalXHR.prototype.setRequestHeader = function (
      this: any,
      header: string,
      value: string
    ) {
      if (this._rdtHeaders) {
        this._rdtHeaders[header] = value;
      }
      return originalSetRequestHeader.apply(this, [header, value]);
    };

    OriginalXHR.prototype.send = function (this: any, body?: any) {
      const url = this._rdtUrl || '';
      const method = this._rdtMethod || 'GET';
      const id = this._rdtId || `xhr_${Date.now()}`;
      const startTime = this._rdtStartTime || Date.now();
      const requestHeaders = this._rdtHeaders || {};

      let requestBody: unknown = body;
      if (typeof body === 'string') {
        try {
          requestBody = JSON.parse(body);
        } catch {
          // Keep string
        }
      }

      // Check mock rule
      const matchedRule = manager.findMatchingRule(url, method);

      if (matchedRule) {
        const applyMock = () => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          const createSafeEvent = (type: string) => {
            if (typeof Event === 'function') {
              try {
                return new Event(type);
              } catch {
                // fallback to object
              }
            }
            return {
              type,
              target: this,
              currentTarget: this,
              bubbles: false,
              cancelable: false,
              defaultPrevented: false,
              eventPhase: 2,
              timeStamp: Date.now(),
            };
          };

          if (matchedRule.mode === 'offline') {
            manager.recordRequest({
              id,
              url,
              method,
              client: 'xhr',
              startTime,
              endTime,
              duration,
              status: 0,
              statusText: 'Network Failed (Offline Mock)',
              requestHeaders,
              requestBody,
              error: 'Network Error',
              isPending: false,
              isOverridden: true,
              matchedRuleId: matchedRule.id,
            });

            this.status = 0;
            this.readyState = 4;
            this._hasError = true;

            const errEvent = createSafeEvent('error');
            const endEvent = createSafeEvent('loadend');

            if (typeof this.setReadyState === 'function') {
              try {
                this.setReadyState(4);
              } catch {
                // ignore
              }
            }

            if (typeof this.onreadystatechange === 'function') {
              try { this.onreadystatechange(errEvent as any); } catch {}
            }
            if (typeof this.onerror === 'function') {
              try { this.onerror(errEvent as any); } catch {}
            }
            if (typeof this.onloadend === 'function') {
              try { this.onloadend(endEvent as any); } catch {}
            }
            if (typeof this.dispatchEvent === 'function') {
              try { this.dispatchEvent(errEvent as any); } catch {}
              try { this.dispatchEvent(endEvent as any); } catch {}
            }
            return;
          }

          if (matchedRule.mode === 'timeout') {
            manager.recordRequest({
              id,
              url,
              method,
              client: 'xhr',
              startTime,
              endTime,
              duration,
              status: 0,
              statusText: 'Timed Out (Mock)',
              requestHeaders,
              requestBody,
              error: 'Timeout',
              isPending: false,
              isOverridden: true,
              matchedRuleId: matchedRule.id,
            });

            this.status = 0;
            this.readyState = 4;
            this._hasError = true;
            this._timedOut = true;

            const timeoutEvent = createSafeEvent('timeout');
            const endEvent = createSafeEvent('loadend');

            if (typeof this.setReadyState === 'function') {
              try {
                this.setReadyState(4);
              } catch {
                // ignore
              }
            }

            if (typeof this.onreadystatechange === 'function') {
              try { this.onreadystatechange(timeoutEvent as any); } catch {}
            }
            if (typeof this.ontimeout === 'function') {
              try { this.ontimeout(timeoutEvent as any); } catch {}
            }
            if (typeof this.onloadend === 'function') {
              try { this.onloadend(endEvent as any); } catch {}
            }
            if (typeof this.dispatchEvent === 'function') {
              try { this.dispatchEvent(timeoutEvent as any); } catch {}
              try { this.dispatchEvent(endEvent as any); } catch {}
            }
            return;
          }

          // Mock Response
          let parsedResponse: unknown = matchedRule.responseBody;
          try {
            parsedResponse = JSON.parse(matchedRule.responseBody);
          } catch {
            // Keep as string
          }

          const responseHeadersStr =
            'content-type: application/json; charset=utf-8\r\nx-powered-by: Unified-DevTools-Mock\r\n';

          manager.recordRequest({
            id,
            url,
            method,
            client: 'xhr',
            startTime,
            endTime,
            duration,
            status: matchedRule.status,
            statusText: matchedRule.statusText || getStatusText(matchedRule.status),
            requestHeaders,
            requestBody,
            responseHeaders: {
              'content-type': 'application/json; charset=utf-8',
              'x-powered-by': 'Unified-DevTools-Mock',
            },
            responseBody: parsedResponse,
            isPending: false,
            isOverridden: true,
            matchedRuleId: matchedRule.id,
          });

          // Set React Native internal XHR fields so Axios response parsing succeeds
          this._response = matchedRule.responseBody;
          this._cachedResponse = undefined;
          this.responseURL = url;

          if (typeof this.setResponseHeaders === 'function') {
            try {
              this.setResponseHeaders({
                'content-type': 'application/json; charset=utf-8',
                'x-powered-by': 'Unified-DevTools-Mock',
                ...(matchedRule.responseHeaders || {}),
              });
            } catch {
              // ignore
            }
          }

          // Simulate XHR success response properties
          Object.defineProperty(this, 'readyState', { value: 4, writable: true, configurable: true });
          Object.defineProperty(this, 'status', { value: matchedRule.status, writable: true, configurable: true });
          Object.defineProperty(this, 'statusText', {
            value: matchedRule.statusText || getStatusText(matchedRule.status),
            writable: true,
            configurable: true,
          });
          Object.defineProperty(this, 'responseText', {
            value: matchedRule.responseBody,
            writable: true,
            configurable: true,
          });
          Object.defineProperty(this, 'response', {
            value: matchedRule.responseBody,
            writable: true,
            configurable: true,
          });

          this.getAllResponseHeaders = () => responseHeadersStr;
          this.getResponseHeader = (name: string) => {
            if (name.toLowerCase() === 'content-type') return 'application/json; charset=utf-8';
            return null;
          };

          const readyEvent = createSafeEvent('readystatechange');
          const loadEvent = createSafeEvent('load');
          const endEvent = createSafeEvent('loadend');

          if (typeof this.setReadyState === 'function') {
            try {
              this.setReadyState(4);
            } catch {
              // ignore
            }
          }

          if (typeof this.onreadystatechange === 'function') {
            try { this.onreadystatechange(readyEvent as any); } catch {}
          }
          if (typeof this.onload === 'function') {
            try { this.onload(loadEvent as any); } catch {}
          }
          if (typeof this.onloadend === 'function') {
            try { this.onloadend(endEvent as any); } catch {}
          }

          if (typeof this.dispatchEvent === 'function') {
            try { this.dispatchEvent(readyEvent as any); } catch {}
            try { this.dispatchEvent(loadEvent as any); } catch {}
            try { this.dispatchEvent(endEvent as any); } catch {}
          }
        };

        if (matchedRule.delayMs && matchedRule.delayMs > 0) {
          setTimeout(applyMock, matchedRule.delayMs);
        } else {
          setTimeout(applyMock, 0);
        }
        return;
      }

      // Normal XHR execution
      manager.recordRequest({
        id,
        url,
        method,
        client: 'xhr',
        startTime,
        requestHeaders,
        requestBody,
        isPending: true,
      });

      this.addEventListener('loadend', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const rawResponseHeaders = this.getAllResponseHeaders() || '';
        const responseHeaders: Record<string, string> = {};
        rawResponseHeaders.split('\r\n').forEach((line: string) => {
          const parts = line.split(': ');
          if (parts.length >= 2) {
            responseHeaders[parts[0].toLowerCase()] = parts.slice(1).join(': ');
          }
        });

        let responseBody: unknown = this.response || this.responseText;
        if (typeof responseBody === 'string') {
          try {
            responseBody = JSON.parse(responseBody);
          } catch {
            // Keep string
          }
        }

        manager.updateRequest(id, {
          endTime,
          duration,
          status: this.status,
          statusText: this.statusText || getStatusText(this.status),
          responseHeaders,
          responseBody,
          error: this.status === 0 ? 'Network Error' : undefined,
          isPending: false,
        });
      });

      return originalSend.apply(this, [body]);
    };
  }
}

export const networkManager = new NetworkManager();
