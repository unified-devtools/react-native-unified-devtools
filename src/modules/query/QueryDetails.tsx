import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Query, QueryClient } from '@tanstack/react-query';
import { THEME } from '../../theme/colors';
import { formatQueryKey, formatTimeAgo, getQueryStatus } from './queryUtils';
import { Badge } from '../../shared/Badge';
import { JsonTree } from '../../shared/JsonTree';

interface QueryDetailsProps {
  query: Query;
  queryClient: QueryClient;
  onBack?: () => void;
}

export const QueryDetails: React.FC<QueryDetailsProps> = ({
  query,
  queryClient,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'data' | 'state' | 'options'>('data');
  const status = getQueryStatus(query);

  const handleRefetch = () => query.fetch();
  const handleInvalidate = () =>
    queryClient.invalidateQueries({ queryKey: query.queryKey });
  const handleReset = () =>
    queryClient.resetQueries({ queryKey: query.queryKey });
  const handleRemove = () => {
    queryClient.removeQueries({ queryKey: query.queryKey });
    onBack?.();
  };

  const handleTriggerLoading = () => {
    // @ts-ignore
    query.setState((old) => ({
      ...old,
      status: 'pending',
      fetchStatus: 'fetching',
    }));
  };

  const handleTriggerError = () => {
    // @ts-ignore
    query.setState((old) => ({
      ...old,
      status: 'error',
      error: new Error('Simulated Devtools Error'),
    }));
  };

  const observersCount =
    typeof query.getObserversCount === 'function' ? query.getObserversCount() : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleRow}>
          <Badge status={status} size="sm" />
          <Text style={styles.keyText} numberOfLines={2}>
            {formatQueryKey(query.queryKey)}
          </Text>
        </View>
      </View>

      {/* Action Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleRefetch}>
          <Text style={styles.actionBtnText}>Refetch</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleInvalidate}>
          <Text style={styles.actionBtnText}>Invalidate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleReset}>
          <Text style={styles.actionBtnText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleRemove}>
          <Text style={[styles.actionBtnText, styles.dangerBtnText]}>Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleTriggerLoading}>
          <Text style={styles.actionBtnText}>+Load</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleTriggerError}>
          <Text style={styles.actionBtnText}>+Err</Text>
        </TouchableOpacity>
      </View>

      {/* Meta Card */}
      <View style={styles.metaCard}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Observers:</Text>
          <Text style={styles.metaValue}>{observersCount}</Text>
          <Text style={[styles.metaLabel, { marginLeft: 16 }]}>Status:</Text>
          <Text style={styles.metaValue}>{query.state.status}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Fetch status:</Text>
          <Text style={styles.metaValue}>{query.state.fetchStatus}</Text>
          <Text style={[styles.metaLabel, { marginLeft: 16 }]}>Updated:</Text>
          <Text style={styles.metaValue}>{formatTimeAgo(query.state.dataUpdatedAt)}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'data' && styles.tabActive]}
          onPress={() => setActiveTab('data')}
        >
          <Text style={[styles.tabText, activeTab === 'data' && styles.tabTextActive]}>
            Data Explorer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'state' && styles.tabActive]}
          onPress={() => setActiveTab('state')}
        >
          <Text style={[styles.tabText, activeTab === 'state' && styles.tabTextActive]}>
            State
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'options' && styles.tabActive]}
          onPress={() => setActiveTab('options')}
        >
          <Text style={[styles.tabText, activeTab === 'options' && styles.tabTextActive]}>
            Options
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'data' && (
          <View style={styles.codeContainer}>
            {query.state.data !== undefined ? (
              <JsonTree data={query.state.data} />
            ) : (
              <Text style={styles.emptyText}>No data cached for this query.</Text>
            )}
          </View>
        )}

        {activeTab === 'state' && (
          <View style={styles.codeContainer}>
            <JsonTree
              data={{
                status: query.state.status,
                fetchStatus: query.state.fetchStatus,
                error: query.state.error ? String(query.state.error) : null,
                dataUpdatedAt: query.state.dataUpdatedAt,
                errorUpdatedAt: query.state.errorUpdatedAt,
                fetchFailureCount: query.state.fetchFailureCount,
                isInvalidated: query.state.isInvalidated,
              }}
            />
          </View>
        )}

        {activeTab === 'options' && (
          <View style={styles.codeContainer}>
            <JsonTree
              data={{
                queryKey: query.queryKey,
                queryHash: query.queryHash,
                // @ts-ignore
                gcTime: query.options?.gcTime ?? query.options?.cacheTime,
                // @ts-ignore
                staleTime: query.options?.staleTime,
                // @ts-ignore
                retry: query.options?.retry,
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  backButton: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  backButtonText: {
    color: THEME.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyText: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Courier',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.colors.headerBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  actionBtn: {
    backgroundColor: THEME.colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  actionBtnText: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  dangerBtn: {
    borderColor: '#7f1d1d',
    backgroundColor: '#450a0a',
  },
  dangerBtnText: {
    color: '#f87171',
  },
  metaCard: {
    backgroundColor: THEME.colors.card,
    marginHorizontal: 12,
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    color: THEME.colors.textDim,
    fontSize: 11,
  },
  metaValue: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: THEME.colors.accent,
  },
  tabText: {
    color: THEME.colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: THEME.colors.text,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
  },
  codeContainer: {
    backgroundColor: THEME.colors.codeBg,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    fontSize: 12,
  },
});
