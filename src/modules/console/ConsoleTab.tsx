import React, { useEffect, useMemo, useState } from 'react';
import {
  Clipboard,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type { ConsoleLogItem, ConsoleLogLevel } from '../../types';
import { consoleManager } from './consoleInterceptor';
import { JsonTree } from '../../shared/JsonTree';

export const ConsoleTab: React.FC = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [logs, setLogs] = useState<ConsoleLogItem[]>([]);
  const [activeLevel, setActiveLevel] = useState<ConsoleLogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyLog = (item: ConsoleLogItem) => {
    try {
      const parts = item.args.map((arg) => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      });
      let text = parts.join(' ');
      if (item.stackTrace) {
        text += `\n\nStack:\n${item.stackTrace}`;
      }
      Clipboard.setString(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  const renderLogItem = ({ item }: { item: ConsoleLogItem }) => {
    const isError = item.level === 'error';
    const isWarn = item.level === 'warn';
    const levelColor = colors.console[item.level] || colors.text;
    const isCopied = copiedId === item.id;

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

          {/* Copy Icon / Button beside status badge */}
          <TouchableOpacity
            style={styles.copyLogBtn}
            onPress={() => handleCopyLog(item)}
            activeOpacity={0.7}
            accessibilityLabel="Copy log output"
          >
            <Text style={[styles.copyLogText, isCopied && styles.copyLogSuccess]}>
              {isCopied ? '✓ Copied' : '📋 Copy'}
            </Text>
          </TouchableOpacity>
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
          placeholderTextColor={colors.textMuted}
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

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    controlBar: {
      padding: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.headerBg,
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
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    filterBtnActive: {
      borderColor: colors.sky,
    },
    filterBtnText: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: '600',
    },
    filterBtnTextActive: {
      color: colors.text,
    },
    clearBtn: {
      marginLeft: 'auto',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#450a0a' : '#fee2e2',
      borderWidth: 1,
      borderColor: isDark ? '#7f1d1d' : '#fca5a5',
    },
    clearBtnText: {
      color: '#ef4444',
      fontSize: 11,
      fontWeight: '700',
    },
    searchInput: {
      backgroundColor: colors.card,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      color: colors.text,
      fontSize: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logRow: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.bg,
    },
    errorRow: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)',
      borderLeftWidth: 3,
      borderLeftColor: colors.status.error,
    },
    warnRow: {
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)',
      borderLeftWidth: 3,
      borderLeftColor: colors.status.stale,
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 4,
    },
    timestamp: {
      color: colors.textMuted,
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
    copyLogBtn: {
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 4,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    copyLogText: {
      color: colors.textDim,
      fontSize: 9.5,
      fontWeight: '600',
    },
    copyLogSuccess: {
      color: colors.status.fresh,
      fontWeight: '700',
    },
    argsContainer: {
      gap: 4,
    },
    argItem: {
      marginVertical: 1,
    },
    argText: {
      color: colors.text,
      fontSize: 12,
      fontFamily: 'Courier',
    },
    errorText: {
      color: isDark ? '#fca5a5' : '#dc2626',
    },
    warnText: {
      color: isDark ? '#fde68a' : '#d97706',
    },
    stackContainer: {
      marginTop: 6,
      padding: 6,
      backgroundColor: colors.codeBg,
      borderRadius: 4,
    },
    stackText: {
      color: colors.textMuted,
      fontSize: 10,
      fontFamily: 'Courier',
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderSubtle,
    },
    emptyContainer: {
      padding: 36,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: 'italic',
    },
  });
