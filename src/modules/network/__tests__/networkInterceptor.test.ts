import {
  getStatusText,
  matchUrlPattern,
  NetworkManager,
} from '../networkInterceptor';

describe('networkInterceptor', () => {
  describe('getStatusText', () => {
    it('returns standard status descriptions', () => {
      expect(getStatusText(200)).toBe('OK');
      expect(getStatusText(201)).toBe('Created');
      expect(getStatusText(204)).toBe('No Content');
      expect(getStatusText(400)).toBe('Bad Request');
      expect(getStatusText(401)).toBe('Unauthorized');
      expect(getStatusText(404)).toBe('Not Found');
      expect(getStatusText(429)).toBe('Too Many Requests');
      expect(getStatusText(500)).toBe('Internal Server Error');
      expect(getStatusText(504)).toBe('Gateway Timeout');
    });

    it('returns "Unknown" for unmapped status codes', () => {
      expect(getStatusText(418)).toBe('Unknown');
      expect(getStatusText(999)).toBe('Unknown');
    });
  });

  describe('matchUrlPattern', () => {
    it('matches wildcard "*"', () => {
      expect(matchUrlPattern('*', 'https://api.example.com/users')).toBe(true);
    });

    it('returns false when inputs are missing', () => {
      expect(matchUrlPattern('', '')).toBe(false);
      expect(matchUrlPattern('', 'https://api.example.com/users')).toBe(false);
      expect(matchUrlPattern('test', '')).toBe(false);
    });

    it('matches exact URLs and handles trailing slashes', () => {
      expect(
        matchUrlPattern(
          'https://api.example.com/v1/users',
          'https://api.example.com/v1/users/'
        )
      ).toBe(true);
    });

    it('matches URL pathnames and query strings', () => {
      expect(
        matchUrlPattern('/v1/users', 'https://api.example.com/v1/users')
      ).toBe(true);
      expect(
        matchUrlPattern(
          '/v1/users?role=admin',
          'https://api.example.com/v1/users?role=admin'
        )
      ).toBe(true);
    });

    it('matches substring patterns without wildcard', () => {
      expect(
        matchUrlPattern('users', 'https://api.example.com/api/v1/users/list')
      ).toBe(true);
    });

    it('matches glob patterns with wildcards', () => {
      expect(
        matchUrlPattern('*/v1/products/*', 'https://api.example.com/v1/products/42')
      ).toBe(true);
      expect(
        matchUrlPattern('/v1/products/*', 'https://api.example.com/v1/products/42')
      ).toBe(true);
      expect(
        matchUrlPattern('https://api.example.com/*', 'https://api.example.com/orders')
      ).toBe(true);
      expect(
        matchUrlPattern('https://other.com/*', 'https://api.example.com/orders')
      ).toBe(false);
    });
  });

  describe('NetworkManager mock rules CRUD & matching', () => {
    let manager: NetworkManager;

    beforeEach(() => {
      manager = new NetworkManager();
    });

    afterEach(() => {
      manager.restore();
    });

    it('adds and retrieves mock rules', () => {
      const rule = manager.addRule({
        name: 'Mock Users API',
        enabled: true,
        urlPattern: '/api/users',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '{"users":[]}',
        responseHeaders: {},
        delayMs: 100,
      });

      expect(rule.id).toBeDefined();
      expect(rule.createdAt).toBeDefined();
      expect(manager.getRules()).toHaveLength(1);
      expect(manager.getRules()[0].name).toBe('Mock Users API');
    });

    it('updates mock rules', () => {
      const rule = manager.addRule({
        name: 'Initial Name',
        enabled: true,
        urlPattern: '/api/items',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '[]',
        responseHeaders: {},
        delayMs: 0,
      });

      manager.updateRule(rule.id, { name: 'Updated Name', status: 201 });
      const updated = manager.getRules().find((r) => r.id === rule.id);
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.status).toBe(201);
    });

    it('toggles rule enabled status', () => {
      const rule = manager.addRule({
        name: 'Toggle Test',
        enabled: true,
        urlPattern: '/api/toggle',
        method: 'POST',
        mode: 'response',
        status: 200,
        responseBody: '{}',
        responseHeaders: {},
        delayMs: 0,
      });

      manager.toggleRule(rule.id);
      expect(manager.getRules()[0].enabled).toBe(false);

      manager.toggleRule(rule.id);
      expect(manager.getRules()[0].enabled).toBe(true);
    });

    it('deletes mock rules', () => {
      const rule = manager.addRule({
        name: 'To Delete',
        enabled: true,
        urlPattern: '/api/delete',
        method: 'DELETE',
        mode: 'response',
        status: 204,
        responseBody: '',
        responseHeaders: {},
        delayMs: 0,
      });

      expect(manager.getRules()).toHaveLength(1);
      manager.deleteRule(rule.id);
      expect(manager.getRules()).toHaveLength(0);
    });

    it('finds matching enabled rule based on URL and method', () => {
      manager.addRule({
        name: 'Match Rule',
        enabled: true,
        urlPattern: '/api/profile',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '{"name":"John"}',
        responseHeaders: {},
        delayMs: 0,
      });

      const matched = manager.findMatchingRule(
        'https://example.com/api/profile',
        'GET'
      );
      expect(matched).toBeDefined();
      expect(matched?.name).toBe('Match Rule');

      // Method mismatch
      const methodMismatch = manager.findMatchingRule(
        'https://example.com/api/profile',
        'POST'
      );
      expect(methodMismatch).toBeUndefined();
    });

    it('matches rule when rule method is ANY', () => {
      manager.addRule({
        name: 'Any Method Rule',
        enabled: true,
        urlPattern: '/api/webhook',
        method: 'ANY',
        mode: 'response',
        status: 200,
        responseBody: '{"status":"ok"}',
        responseHeaders: {},
        delayMs: 0,
      });

      expect(
        manager.findMatchingRule('https://example.com/api/webhook', 'POST')
      ).toBeDefined();
      expect(
        manager.findMatchingRule('https://example.com/api/webhook', 'PUT')
      ).toBeDefined();
    });

    it('returns undefined when master overrides are disabled', () => {
      manager.addRule({
        name: 'Active Rule',
        enabled: true,
        urlPattern: '/api/*',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '{}',
        responseHeaders: {},
        delayMs: 0,
      });

      manager.setMasterOverrideEnabled(false);
      expect(manager.isMasterOverrideEnabled()).toBe(false);

      const matched = manager.findMatchingRule(
        'https://example.com/api/test',
        'GET'
      );
      expect(matched).toBeUndefined();
    });

    it('subscribes and receives rule updates', (done) => {
      let count = 0;
      const unsubscribe = manager.subscribeRules((rules) => {
        count += 1;
        if (count === 1) {
          expect(rules).toEqual([]);
        } else if (count === 2) {
          expect(rules).toHaveLength(1);
          unsubscribe();
          done();
        }
      });

      manager.addRule({
        name: 'Rule sub test',
        enabled: true,
        urlPattern: '/test',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '{}',
      });
    });

    it('clears requests accurately', () => {
      expect(manager.getRequests()).toEqual([]);
      manager.clear();
      expect(manager.getRequests()).toEqual([]);
    });

    it('skips initialization if already initialized or without force in test', () => {
      const fresh = new NetworkManager();
      fresh.init();
      expect((fresh as any).isInitialized).toBe(false);
      fresh.init(true);
      expect((fresh as any).isInitialized).toBe(true);
      fresh.init(true);
      expect((fresh as any).isInitialized).toBe(true);
      fresh.restore();
    });

    it('catches listener errors during notification safely', (done) => {
      let initialCall = true;
      manager.subscribe(() => {
        if (!initialCall) throw new Error('Failing listener');
        initialCall = false;
      });
      let initialRulesCall = true;
      manager.subscribeRules(() => {
        if (!initialRulesCall) throw new Error('Failing rules listener');
        initialRulesCall = false;
      });
      manager.clear();
      manager.addRule({
        name: 'test',
        enabled: true,
        urlPattern: '/test',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '{}',
      });
      setTimeout(done, 20);
    });

    it('caps stored requests to 500 items', () => {
      manager.init(true);
      for (let i = 0; i < 505; i++) {
        (manager as any).recordRequest({
          id: `req_${i}`,
          url: `https://example.com/api/${i}`,
          method: 'GET',
          client: 'fetch',
          startTime: Date.now(),
          requestHeaders: {},
          isPending: false,
        });
      }

      expect(manager.getRequests()).toHaveLength(500);
    });
  });

  describe('fetch interception & mock execution', () => {
    let manager: NetworkManager;
    let originalGlobalFetch: typeof global.fetch;

    beforeEach(() => {
      originalGlobalFetch = global.fetch;
      manager = new NetworkManager();
      manager.init(true);
    });

    afterEach(() => {
      manager.restore();
      global.fetch = originalGlobalFetch;
    });

    it('intercepts fetch and returns mocked response', async () => {
      manager.addRule({
        name: 'Users Mock',
        enabled: true,
        urlPattern: '/api/v1/users',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: JSON.stringify({ id: 1, name: 'Alice' }),
        responseHeaders: { 'x-custom-test': 'devtools' },
      });

      const res = await fetch('https://api.service.com/api/v1/users');
      expect(res.status).toBe(200);
      expect(res.headers.get('x-custom-test')).toBe('devtools');

      const data = await res.json();
      expect(data).toEqual({ id: 1, name: 'Alice' });

      const recorded = manager.getRequests();
      expect(recorded).toHaveLength(1);
      expect(recorded[0].isOverridden).toBe(true);
      expect(recorded[0].status).toBe(200);
      expect(recorded[0].responseBody).toEqual({ id: 1, name: 'Alice' });
    });

    it('supports URL object and Request object inputs', async () => {
      const mockRawFetch = jest.fn().mockResolvedValue(
        new Response('Plain Text Output', {
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'text/plain' }),
        })
      );
      manager.restore();
      global.fetch = mockRawFetch;
      manager.init(true);

      // 1. URL instance
      await fetch(new URL('https://api.service.com/api/url-obj'));
      // 2. Request instance
      const req = new Request('https://api.service.com/api/req-obj', {
        method: 'PUT',
        headers: new Headers({ 'x-req-hdr': 'req-val' }),
      });
      await fetch(req);
      // 3. Object with .url property
      await fetch({ url: 'https://api.service.com/api/obj-url' } as any);

      const recorded = manager.getRequests();
      expect(recorded).toHaveLength(3);
      expect(recorded[2].url).toBe('https://api.service.com/api/url-obj');
      expect(recorded[1].url).toBe('https://api.service.com/api/req-obj');
      expect(recorded[1].method).toBe('PUT');
      expect(recorded[0].url).toBe('https://api.service.com/api/obj-url');
      expect(recorded[1].responseBody).toBe('Plain Text Output');
    });

    it('parses headers as Array of tuples and plain object with non-json body', async () => {
      const mockRawFetch = jest.fn().mockResolvedValue(
        new Response('{}', { status: 200 })
      );
      manager.restore();
      global.fetch = mockRawFetch;
      manager.init(true);

      await fetch('https://api.service.com/api/tuple-headers', {
        headers: [['x-header-tuple', 'tuple-val']],
      });

      // Plain record headers & raw non-JSON body string
      await fetch('https://api.service.com/api/plain-headers', {
        headers: { 'x-simple-record': 'record-val' },
        body: 'raw non json string body',
        method: 'POST',
      });

      const recorded = manager.getRequests();
      expect(recorded[1].requestHeaders['x-header-tuple']).toBe('tuple-val');
      expect(recorded[0].requestHeaders['x-simple-record']).toBe('record-val');
      expect(recorded[0].requestBody).toBe('raw non json string body');
    });

    it('simulates offline failure with mode: offline', async () => {
      manager.addRule({
        name: 'Offline Mock',
        enabled: true,
        urlPattern: '/api/offline',
        method: 'GET',
        mode: 'offline',
        status: 0,
        responseBody: '',
      });

      await expect(fetch('https://api.service.com/api/offline')).rejects.toThrow(
        'Network request failed'
      );

      const recorded = manager.getRequests();
      expect(recorded).toHaveLength(1);
      expect(recorded[0].error).toBe('TypeError: Network request failed');
      expect(recorded[0].isOverridden).toBe(true);
    });

    it('simulates timeout with mode: timeout', async () => {
      manager.addRule({
        name: 'Timeout Mock',
        enabled: true,
        urlPattern: '/api/timeout',
        method: 'POST',
        mode: 'timeout',
        status: 0,
        responseBody: '',
      });

      await expect(
        fetch('https://api.service.com/api/timeout', { method: 'POST' })
      ).rejects.toThrow('The operation timed out.');

      const recorded = manager.getRequests();
      expect(recorded).toHaveLength(1);
      expect(recorded[0].error).toBe('The operation timed out.');
    });

    it('applies artificial latency delay', async () => {
      manager.addRule({
        name: 'Delayed Mock',
        enabled: true,
        urlPattern: '/api/delayed',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '{"delayed":true}',
        delayMs: 20,
      });

      const start = Date.now();
      await fetch('https://api.service.com/api/delayed');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(18);
    });

    it('handles network error in passthrough fetch', async () => {
      const mockFailingFetch = jest
        .fn()
        .mockRejectedValue(new Error('Connection dropped'));
      manager.restore();
      global.fetch = mockFailingFetch;
      manager.init(true);

      await expect(
        fetch('https://api.service.com/api/broken-connection')
      ).rejects.toThrow('Connection dropped');

      const recorded = manager.getRequests();
      expect(recorded).toHaveLength(1);
      expect(recorded[0].error).toBe('Connection dropped');
      expect(recorded[0].status).toBe(0);
      expect(recorded[0].isPending).toBe(false);
    });
  });

  describe('XMLHttpRequest interception', () => {
    let manager: NetworkManager;
    let savedXHR: typeof global.XMLHttpRequest;

    class FakeXHR {
      private listeners: Record<string, Array<(e: any) => void>> = {};

      public open(
        _method: string,
        _url: string | URL,
        _async?: boolean,
        _user?: string | null,
        _password?: string | null
      ) {}
      public setRequestHeader(_header: string, _value: string) {}
      public send(_body?: any) {
        setTimeout(() => {
          this.status = 200;
          this.statusText = 'OK';
          this.responseText = '{"real":true}';
          this.response = '{"real":true}';
          this.dispatchEvent({ type: 'loadend' });
        }, 5);
      }
      public addEventListener(event: string, callback: any) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
      }
      public removeEventListener(event: string, callback: any) {
        if (this.listeners[event]) {
          this.listeners[event] = this.listeners[event].filter(
            (cb) => cb !== callback
          );
        }
      }
      public dispatchEvent(event: any) {
        if (this.listeners[event.type]) {
          this.listeners[event.type].forEach((cb) => cb(event));
        }
      }
      public setReadyState(state: number) {
        this.readyState = state;
      }
      public setResponseHeaders = jest.fn();
      public getAllResponseHeaders() {
        return 'content-type: application/json\r\nx-server: jest-mock\r\n';
      }
      public status = 200;
      public statusText = 'OK';
      public responseText = '{"success":true}';
      public response = '{"success":true}';
      public readyState = 4;
      public onreadystatechange: any = jest.fn();
      public onload: any = jest.fn();
      public onerror: any = jest.fn();
      public ontimeout: any = jest.fn();
      public onloadend: any = jest.fn();
    }

    beforeEach(() => {
      savedXHR = global.XMLHttpRequest;
      (global as any).XMLHttpRequest = FakeXHR;
      manager = new NetworkManager();
      manager.init(true);
    });

    afterEach(() => {
      manager.restore();
      global.XMLHttpRequest = savedXHR;
    });

    it('intercepts XHR and matches mock response rule', async () => {
      manager.addRule({
        name: 'XHR Mock Rule',
        enabled: true,
        urlPattern: '/xhr/test',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '{"xhr":true}',
      });

      const xhr = new (global.XMLHttpRequest as any)();
      xhr.open('GET', 'https://api.example.com/xhr/test');
      xhr.setRequestHeader('x-requested-with', 'XMLHttpRequest');
      xhr.send();

      await new Promise((r) => setTimeout(r, 15));

      const requests = manager.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].client).toBe('xhr');
      expect(requests[0].isOverridden).toBe(true);
      expect(requests[0].responseBody).toEqual({ xhr: true });
      expect(xhr.getResponseHeader('content-type')).toBe(
        'application/json; charset=utf-8'
      );
      expect(xhr.getResponseHeader('x-non-existent')).toBeNull();
    });

    it('intercepts XHR with offline mode', async () => {
      manager.addRule({
        name: 'XHR Offline Rule',
        enabled: true,
        urlPattern: '/xhr/offline',
        method: 'POST',
        mode: 'offline',
        status: 0,
        responseBody: '',
      });

      const xhr = new (global.XMLHttpRequest as any)();
      xhr.open('POST', 'https://api.example.com/xhr/offline');
      xhr.send(JSON.stringify({ test: 1 }));

      await new Promise((r) => setTimeout(r, 15));

      const requests = manager.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].client).toBe('xhr');
      expect(requests[0].error).toBe('Network Error');
    });

    it('intercepts XHR with timeout mode', async () => {
      manager.addRule({
        name: 'XHR Timeout Rule',
        enabled: true,
        urlPattern: '/xhr/timeout',
        method: 'GET',
        mode: 'timeout',
        status: 0,
        responseBody: '',
      });

      const xhr = new (global.XMLHttpRequest as any)();
      xhr.open('GET', 'https://api.example.com/xhr/timeout');
      xhr.send();

      await new Promise((r) => setTimeout(r, 15));

      const requests = manager.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].client).toBe('xhr');
      expect(requests[0].error).toBe('Timeout');
    });

    it('intercepts XHR with delayMs latency', async () => {
      manager.addRule({
        name: 'XHR Delayed Rule',
        enabled: true,
        urlPattern: '/xhr/delayed',
        method: 'GET',
        mode: 'response',
        status: 200,
        responseBody: '{"delayed":true}',
        delayMs: 20,
      });

      const xhr = new (global.XMLHttpRequest as any)();
      xhr.open('GET', 'https://api.example.com/xhr/delayed');
      xhr.send();

      await new Promise((r) => setTimeout(r, 45));

      const requests = manager.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].responseBody).toEqual({ delayed: true });
    });

    it('records and completes non-mocked passthrough XHR', async () => {
      const xhr = new (global.XMLHttpRequest as any)();
      xhr.open('GET', 'https://api.example.com/xhr/passthrough');
      xhr.setRequestHeader('x-api-key', 'secret-key');
      xhr.send();

      await new Promise((r) => setTimeout(r, 20));

      const requests = manager.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toBe('https://api.example.com/xhr/passthrough');
      expect(requests[0].client).toBe('xhr');
      expect(requests[0].status).toBe(200);
      expect(requests[0].isPending).toBe(false);
      expect(requests[0].responseHeaders?.['content-type']).toBe(
        'application/json'
      );
    });
  });
});
