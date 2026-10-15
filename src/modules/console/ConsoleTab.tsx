import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';
import type { ConsoleLogItem, ConsoleLogLevel } from '../../types';
import { consoleManager } from './consoleInterceptor';
import { JsonTree } from '../../shared/JsonTree';

export const ConsoleTab: React.FC = () => {
  const [logs, setLogs] = useState<ConsoleLogItem[]>([]);
  const [activeLevel, setActiveLevel] = useState<ConsoleLogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = consoleManager.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter((item) => {
    if (activeLevel !== 'all' && item.level !== activeLevel) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const stringified = JSON.stringify(item.args).toLowerCase();
      return stringified.includes(query);
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d
      .getMilliseconds()
      .toString()
      .padStart(3, '0')}`;
  };

  const renderLogItem = ({ item }: { item: ConsoleLogItem }) => {
    const isError = item.level === 'error';
    const isWarn = item.level === 'warn';
    const levelColor = THEME.colors.console[item.level] || THEME.colors.text;

    return (
      <View
        style={[
          styles.logRow,
          isError && styles.errorRow,
          isWarn && styles.warnRow,
        ]}
      >
        <View style={styles.logHeader}>
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: levelColor + '22', borderColor: levelColor },
            ]}
          >
            <Text style={[styles.levelText, { color: levelColor }]}>
              {item.level.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Arguments rendering */}
        <View style={styles.argsContainer}>
          {item.args.map((arg, idx) => (
            <View key={idx} style={styles.argItem}>
              {typeof arg === 'object' && arg !== null ? (
                <JsonTree data={arg} initiallyExpanded={false} />
              ) : (
                <Text
                  style={[
                    styles.argText,
                    isError && styles.errorText,
                    isWarn && styles.warnText,
                  ]}
                  selectable
                >
                  {String(arg)}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Stack trace for errors */}
        {item.stackTrace && (
          <View style={styles.stackContainer}>
            <Text style={styles.stackText} numberOfLines={3} selectable>
              {item.stackTrace}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Control Bar: Filters & Search */}
      <View style={styles.controlBar}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, activeLevel === 'all' && styles.filterBtnActive]}
            onPress={() => setActiveLevel('all')}
          >
            <Text style={[styles.filterBtnText, activeLevel === 'all' && styles.filterBtnTextActive]}>
              All ({logs.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, activeLevel === 'error' && styles.filterBtnActive]}
            onPress={() => setActiveLevel('error')}
          >
            <Text style={[styles.filterBtnText, activeLevel === 'error' && styles.filterBtnTextActive]}>
              Errors ({errorCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, activeLevel === 'warn' && styles.filterBtnActive]}
            onPress={() => setActiveLevel('warn')}
          >
            <Text style={[styles.filterBtnText, activeLevel === 'warn' && styles.filterBtnTextActive]}>
              Warns ({warnCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, activeLevel === 'log' && styles.filterBtnActive]}
            onPress={() => setActiveLevel('log')}
          >
            <Text style={[styles.filterBtnText, activeLevel === 'log' && styles.filterBtnTextActive]}>
              Logs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearBtn} onPress={() => consoleManager.clear()}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Filter console output..."
          placeholderTextColor={THEME.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Log Feed */}
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderLogItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {logs.length === 0 ? 'No console logs captured yet.' : 'No logs match your filter.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  controlBar: {
    padding: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.headerBg,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  filterBtnActive: {
    borderColor: THEME.colors.sky,
  },
  filterBtnText: {
    color: THEME.colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: THEME.colors.text,
  },
  clearBtn: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  clearBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: THEME.colors.card,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: THEME.colors.text,
    fontSize: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  logRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.bg,
  },
  errorRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.status.error,
  },
  warnRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.status.stale,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  timestamp: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  levelBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 0.5,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
  argsContainer: {
    gap: 4,
  },
  argItem: {
    marginVertical: 1,
  },
  argText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontFamily: 'Courier',
  },
  errorText: {
    color: '#fca5a5',
  },
  warnText: {
    color: '#fde68a',
  },
  stackContainer: {
    marginTop: 6,
    padding: 6,
    backgroundColor: THEME.colors.codeBg,
    borderRadius: 4,
  },
  stackText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.colors.borderSubtle,
  },
  emptyContainer: {
    padding: 36,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
