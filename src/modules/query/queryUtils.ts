import type { Query } from '@tanstack/react-query';
import type { QueryStats, QueryStatusType } from '../../types';

export function getQueryStatus(query: Query): QueryStatusType {
  const { state } = query;

  if (state.status === 'error') {
    return 'error';
  }
  if (state.fetchStatus === 'fetching') {
    return 'fetching';
  }
  if (state.fetchStatus === 'paused') {
    return 'paused';
  }
  if (typeof query.getObserversCount === 'function' && query.getObserversCount() === 0) {
    return 'inactive';
  }
  if (typeof query.isStale === 'function' && query.isStale()) {
    return 'stale';
  }
  return 'fresh';
}

export function formatQueryKey(queryKey: unknown): string {
  if (typeof queryKey === 'string') return queryKey;
  try {
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
}

export function calculateQueryStats(queries: Query[]): QueryStats {
  const stats: QueryStats = {
    all: queries.length,
    fresh: 0,
    fetching: 0,
    paused: 0,
    stale: 0,
    inactive: 0,
    error: 0,
  };

  for (const q of queries) {
    const status = getQueryStatus(q);
    stats[status] += 1;
  }

  return stats;
}

export function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return 'never';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 2) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}
