import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Query, QueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import { formatQueryKey, formatTimeAgo, getQueryStatus } from './queryUtils';
import { Badge } from '../../shared/Badge';

interface QueryListProps {
  queries: Query[];
  queryClient?: QueryClient;
  selectedQuery: Query | null;
  onSelectQuery: (query: Query) => void;
}

export const QueryList: React.FC<QueryListProps> = ({
  queries,
  queryClient,
  selectedQuery,
  onSelectQuery,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'status' | 'key' | 'time'>('status');

  const filtered = queries.filter((q) => {
    if (!filterText.trim()) return true;
    const keyStr = formatQueryKey(q.queryKey).toLowerCase();
    return keyStr.includes(filterText.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'status') {
      const order = { error: 0, fetching: 1, paused: 2, stale: 3, fresh: 4, inactive: 5 };
      const statusA = getQueryStatus(a);
      const statusB = getQueryStatus(b);
      return order[statusA] - order[statusB];
    }
    if (sortBy === 'key') {
      return a.queryHash.localeCompare(b.queryHash);
    }
    if (sortBy === 'time') {
      return (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0);
    }
    return 0;
  });

  const renderItem = ({ item }: { item: Query }) => {
    const status = getQueryStatus(item);
    const observers =
      typeof item.getObserversCount === 'function' ? item.getObserversCount() : 0;
    const isSelected = selectedQuery?.queryHash === item.queryHash;

    return (
      <TouchableOpacity
        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
        onPress={() => onSelectQuery(item)}
        activeOpacity={0.7}
      >
        <View style={styles.badgeCol}>
          <Badge status={status} size="sm" />
          {observers > 0 && (
            <View style={styles.observerPill}>
              <Text style={styles.observerText}>{observers}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.keyText} numberOfLines={1}>
            {formatQueryKey(item.queryKey)}
          </Text>
          <Text style={styles.timeText}>
            Updated {formatTimeAgo(item.state.dataUpdatedAt)}
          </Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search & Actions Bar */}
      <View style={styles.controlsRow}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Filter queries..."
            placeholderTextColor={colors.textMuted}
            value={filterText}
            onChangeText={setFilterText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {queryClient && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => queryClient.refetchQueries()}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>Refetch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.clearBtn]}
                onPress={() => queryClient.clear()}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, styles.clearBtnText]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.sortToggle}>
          <TouchableOpacity
            style={[styles.sortBtn, sortBy === 'status' && styles.sortBtnActive]}
            onPress={() => setSortBy('status')}
          >
            <Text style={[styles.sortBtnText, sortBy === 'status' && styles.sortBtnTextActive]}>
              Status
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, sortBy === 'key' && styles.sortBtnActive]}
            onPress={() => setSortBy('key')}
          >
            <Text style={[styles.sortBtnText, sortBy === 'key' && styles.sortBtnTextActive]}>
              Key
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, sortBy === 'time' && styles.sortBtnActive]}
            onPress={() => setSortBy('time')}
          >
            <Text style={[styles.sortBtnText, sortBy === 'time' && styles.sortBtnTextActive]}>
              Time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.queryHash}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {queries.length === 0
                ? 'No queries in QueryClient cache.'
                : 'No queries match your filter.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    controlsRow: {
      padding: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.headerBg,
      gap: 8,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      color: colors.text,
      fontSize: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtn: {
      backgroundColor: colors.card,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnText: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: '600',
    },
    clearBtn: {
      borderColor: '#ef4444',
    },
    clearBtnText: {
      color: '#ef4444',
      fontWeight: '700',
    },
    sortToggle: {
      flexDirection: 'row',
      gap: 6,
    },
    sortBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.card,
    },
    sortBtnActive: {
      borderColor: colors.accent,
    },
    sortBtnText: {
      color: colors.textDim,
      fontSize: 10,
      fontWeight: '600',
    },
    sortBtnTextActive: {
      color: colors.text,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.bg,
    },
    itemRowSelected: {
      backgroundColor: colors.card,
    },
    badgeCol: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      width: 80,
    },
    observerPill: {
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    observerText: {
      color: colors.textDim,
      fontSize: 9,
      fontWeight: '700',
    },
    infoCol: {
      flex: 1,
      paddingHorizontal: 8,
    },
    keyText: {
      color: colors.text,
      fontSize: 12,
      fontFamily: 'Courier',
      fontWeight: '600',
    },
    timeText: {
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 2,
    },
    chevron: {
      color: colors.textMuted,
      fontSize: 18,
      paddingLeft: 4,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderSubtle,
    },
    emptyContainer: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: 'italic',
    },
  });
