import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Query, QueryClient } from '@tanstack/react-query';
import { THEME } from '../../theme/colors';
import { QueryDetails } from './QueryDetails';
import { QueryList } from './QueryList';

interface QueryTabProps {
  queries: Query[];
  queryClient: QueryClient;
}

export const QueryTab: React.FC<QueryTabProps> = ({
  queries,
  queryClient,
}) => {
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);

  // Keep selected query synchronized with active cache instance
  const activeSelectedQuery = selectedQuery
    ? queries.find((q) => q.queryHash === selectedQuery.queryHash) ?? null
    : null;

  return (
    <View style={styles.container}>
      {activeSelectedQuery ? (
        <QueryDetails
          query={activeSelectedQuery}
          queryClient={queryClient}
          onBack={() => setSelectedQuery(null)}
        />
      ) : (
        <QueryList
          queries={queries}
          selectedQuery={activeSelectedQuery}
          onSelectQuery={(q) => setSelectedQuery(q)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
});
