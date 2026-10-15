import { useEffect, useState } from 'react';
import { useQueryClient, type Query, type QueryClient } from '@tanstack/react-query';
import { calculateQueryStats } from './queryUtils';
import type { QueryStats } from '../../types';

export function useQueryDevtools(clientProp?: QueryClient) {
  let contextClient: QueryClient | undefined;
  try {
    contextClient = useQueryClient();
  } catch {
    contextClient = undefined;
  }

  const queryClient = clientProp ?? contextClient;

  const [queries, setQueries] = useState<Query[]>(() => {
    return queryClient ? queryClient.getQueryCache().getAll() : [];
  });

  useEffect(() => {
    if (!queryClient) return;

    const cache = queryClient.getQueryCache();
    setQueries([...cache.getAll()]);

    const unsubscribe = cache.subscribe(() => {
      setQueries([...cache.getAll()]);
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const stats: QueryStats = calculateQueryStats(queries);

  return {
    queryClient,
    queries,
    stats,
  };
}
