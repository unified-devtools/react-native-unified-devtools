import type { Query } from '@tanstack/react-query';
import {
  calculateQueryStats,
  formatQueryKey,
  formatTimeAgo,
  getQueryStatus,
} from '../queryUtils';

describe('queryUtils', () => {
  describe('getQueryStatus', () => {
    it('returns "error" when status is error', () => {
      const mockQuery = {
        state: { status: 'error', fetchStatus: 'idle' },
      } as unknown as Query;
      expect(getQueryStatus(mockQuery)).toBe('error');
    });

    it('returns "fetching" when fetchStatus is fetching', () => {
      const mockQuery = {
        state: { status: 'success', fetchStatus: 'fetching' },
      } as unknown as Query;
      expect(getQueryStatus(mockQuery)).toBe('fetching');
    });

    it('returns "paused" when fetchStatus is paused', () => {
      const mockQuery = {
        state: { status: 'success', fetchStatus: 'paused' },
      } as unknown as Query;
      expect(getQueryStatus(mockQuery)).toBe('paused');
    });

    it('returns "inactive" when observer count is 0', () => {
      const mockQuery = {
        state: { status: 'success', fetchStatus: 'idle' },
        getObserversCount: () => 0,
        isStale: () => false,
      } as unknown as Query;
      expect(getQueryStatus(mockQuery)).toBe('inactive');
    });

    it('returns "stale" when query is stale and active', () => {
      const mockQuery = {
        state: { status: 'success', fetchStatus: 'idle' },
        getObserversCount: () => 1,
        isStale: () => true,
      } as unknown as Query;
      expect(getQueryStatus(mockQuery)).toBe('stale');
    });

    it('returns "fresh" when active and not stale', () => {
      const mockQuery = {
        state: { status: 'success', fetchStatus: 'idle' },
        getObserversCount: () => 1,
        isStale: () => false,
      } as unknown as Query;
      expect(getQueryStatus(mockQuery)).toBe('fresh');
    });
  });

  describe('formatQueryKey', () => {
    it('returns string queryKey as is', () => {
      expect(formatQueryKey('user-profile')).toBe('user-profile');
    });

    it('serializes array queryKey to JSON string', () => {
      expect(formatQueryKey(['users', 123])).toBe('["users",123]');
    });

    it('serializes object queryKey to JSON string', () => {
      expect(formatQueryKey({ scope: 'todos', filter: 'active' })).toBe(
        '{"scope":"todos","filter":"active"}'
      );
    });

    it('falls back to String representation on serialization error (e.g. circular ref)', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(formatQueryKey(circular)).toBe('[object Object]');
    });
  });

  describe('calculateQueryStats', () => {
    it('aggregates query counts accurately across statuses', () => {
      const queries = [
        {
          state: { status: 'error', fetchStatus: 'idle' },
        },
        {
          state: { status: 'success', fetchStatus: 'fetching' },
        },
        {
          state: { status: 'success', fetchStatus: 'paused' },
        },
        {
          state: { status: 'success', fetchStatus: 'idle' },
          getObserversCount: () => 0,
          isStale: () => false,
        },
        {
          state: { status: 'success', fetchStatus: 'idle' },
          getObserversCount: () => 2,
          isStale: () => true,
        },
        {
          state: { status: 'success', fetchStatus: 'idle' },
          getObserversCount: () => 1,
          isStale: () => false,
        },
      ] as unknown as Query[];

      const stats = calculateQueryStats(queries);

      expect(stats.all).toBe(6);
      expect(stats.error).toBe(1);
      expect(stats.fetching).toBe(1);
      expect(stats.paused).toBe(1);
      expect(stats.inactive).toBe(1);
      expect(stats.stale).toBe(1);
      expect(stats.fresh).toBe(1);
    });

    it('handles empty query array', () => {
      const stats = calculateQueryStats([]);
      expect(stats.all).toBe(0);
      expect(stats.fresh).toBe(0);
      expect(stats.error).toBe(0);
    });
  });

  describe('formatTimeAgo', () => {
    it('returns "never" when timestamp is 0 or undefined', () => {
      expect(formatTimeAgo(0)).toBe('never');
    });

    it('returns "just now" for differences under 2 seconds', () => {
      expect(formatTimeAgo(Date.now() - 500)).toBe('just now');
    });

    it('returns seconds ago for differences between 2s and 59s', () => {
      expect(formatTimeAgo(Date.now() - 15000)).toBe('15s ago');
    });

    it('returns minutes ago for differences between 1m and 59m', () => {
      expect(formatTimeAgo(Date.now() - 120000)).toBe('2m ago');
    });

    it('returns hours ago for differences over 60 minutes', () => {
      expect(formatTimeAgo(Date.now() - 7200000)).toBe('2h ago');
    });
  });
});
