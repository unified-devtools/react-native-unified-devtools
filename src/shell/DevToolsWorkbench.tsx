import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Query, QueryClient } from '@tanstack/react-query';
import { THEME } from '../theme/colors';
import type { ConsoleLogItem, DevToolsTab, QueryStats } from '../types';
import { QueryTab } from '../modules/query/QueryTab';
import { ConsoleTab } from '../modules/console/ConsoleTab';
import { TanStackIcon } from '../shared/TanStackIcon';
import { ReactIcon } from '../shared/ReactIcon';

interface DevToolsWorkbenchProps {
  visible: boolean;
  onClose: () => void;
  defaultTab?: DevToolsTab;
  queries: Query[];
  queryClient?: QueryClient;
  queryStats: QueryStats;
  logs: ConsoleLogItem[];
}

export const DevToolsWorkbench: React.FC<DevToolsWorkbenchProps> = ({
  visible,
  onClose,
  defaultTab = 'query',
  queries,
  queryClient,
  queryStats,
  logs,
}) => {
  const [activeTab, setActiveTab] = useState<DevToolsTab>(defaultTab);

  const errorLogsCount = logs.filter((l) => l.level === 'error').length;

  const handleRefetchAll = () => {
    queryClient?.refetchQueries();
  };

  const handleClearCache = () => {
    queryClient?.clear();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Main Top Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <ReactIcon size={20} />
              </View>
              <Text style={styles.headerTitle}>Unified DevTools</Text>
              <Text style={styles.versionTag}>v0.83+</Text>
            </View>

            <View style={styles.headerActions}>
              {activeTab === 'query' && queryClient && (
                <>
                  <TouchableOpacity
                    onPress={handleRefetchAll}
                    style={styles.headerButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.headerButtonText}>Refetch All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleClearCache}
                    style={[styles.headerButton, styles.clearButton]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.headerButtonText, styles.clearButtonText]}>Clear</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Selector Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'query' && styles.tabItemActive]}
              onPress={() => setActiveTab('query')}
            >
              <TanStackIcon size={14} />
              <Text style={[styles.tabLabel, activeTab === 'query' && styles.tabLabelActive]}>
                Queries
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{queryStats.all}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'console' && styles.tabItemActive]}
              onPress={() => setActiveTab('console')}
            >
              <Text style={styles.tabIcon}>💬</Text>
              <Text style={[styles.tabLabel, activeTab === 'console' && styles.tabLabelActive]}>
                Console
              </Text>
              <View
                style={[
                  styles.countBadge,
                  errorLogsCount > 0 && { backgroundColor: THEME.colors.status.error },
                ]}
              >
                <Text style={styles.countText}>{errorLogsCount > 0 ? errorLogsCount : logs.length}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Active Tab Viewport */}
          <View style={styles.viewport}>
            {activeTab === 'query' && (
              queryClient ? (
                <QueryTab queries={queries} queryClient={queryClient} />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderText}>
                    No QueryClient provided. Wrap your app in QueryClientProvider or pass queryClient prop.
                  </Text>
                </View>
              )
            )}

            {activeTab === 'console' && <ConsoleTab />}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.headerBg,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: THEME.colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  versionTag: {
    color: THEME.colors.accent,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#3f1519',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButton: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  headerButtonText: {
    color: THEME.colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  clearButton: {
    borderColor: '#7f1d1d',
  },
  clearButtonText: {
    color: '#f87171',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  closeButtonText: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingHorizontal: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: THEME.colors.accent,
  },
  tabIcon: {
    fontSize: 13,
  },
  tabLabel: {
    color: THEME.colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: THEME.colors.text,
  },
  countBadge: {
    backgroundColor: THEME.colors.card,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: THEME.colors.border,
  },
  countText: {
    color: THEME.colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  viewport: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
