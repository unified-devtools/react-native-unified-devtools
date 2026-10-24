import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Query, QueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import type { ConsoleLogItem, DevToolsTab, NetworkRequestItem, QueryStats } from '../types';
import { QueryTab } from '../modules/query/QueryTab';
import { ConsoleTab } from '../modules/console/ConsoleTab';
import { NetworkTab } from '../modules/network/NetworkTab';
import { LighthouseTab } from '../modules/lighthouse/LighthouseTab';
import { NavigationTab } from '../modules/navigation/NavigationTab';
import { networkManager } from '../modules/network/networkInterceptor';
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
  sheetHeightRatio?: number;
}

export const DevToolsWorkbench: React.FC<DevToolsWorkbenchProps> = ({
  visible,
  onClose,
  defaultTab = 'query',
  queries,
  queryClient,
  queryStats,
  logs,
  sheetHeightRatio = 0.82,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<DevToolsTab>(defaultTab);

  const screenHeight = Dimensions.get('window').height;
  const sheetHeight = Math.round(screenHeight * Math.min(Math.max(sheetHeightRatio, 0.4), 0.95));

  const [modalVisible, setModalVisible] = useState(visible);
  const panY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Animate in / out based on visible prop
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      panY.setValue(sheetHeight);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(panY, {
          toValue: 0,
          damping: 24,
          mass: 0.8,
          stiffness: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible) {
      animateClose();
    }
  }, [visible]);

  const animateClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(panY, {
        toValue: sheetHeight,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      onClose();
    });
  };

  // Dedicated PanResponder for the top grab handle pill
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          animateClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            damping: 24,
            mass: 0.8,
            stiffness: 260,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // PanResponder for the header bar (allows child button clicks first, triggers on vertical drag down)
  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          animateClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            damping: 24,
            mass: 0.8,
            stiffness: 260,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const [networkRequests, setNetworkRequests] = useState<NetworkRequestItem[]>(
    networkManager.getRequests()
  );

  useEffect(() => {
    return networkManager.subscribe((reqs) => {
      setNetworkRequests(reqs);
    });
  }, []);

  const errorLogsCount = logs.filter((l) => l.level === 'error').length;
  const networkErrorCount = networkRequests.filter(
    (r) => (r.status !== undefined && r.status >= 400) || r.error
  ).length;

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={animateClose}
      statusBarTranslucent
    >
      <View style={styles.modalBackdropContainer}>
        {/* Semi-transparent Dimmed Backdrop Overlay (Click to dismiss) */}
        <Animated.View
          style={[
            styles.backdropOverlay,
            { opacity: backdropOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={animateClose}
          />
        </Animated.View>

        {/* Sliding DevTools Drawer Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              height: sheetHeight,
              transform: [{ translateY: panY }],
            },
          ]}
        >
          {/* Top Drag Handle Indicator Bar (Slide down to close) */}
          <View
            style={styles.handleBar}
            {...handlePanResponder.panHandlers}
          >
            <View style={styles.handlePill} />
          </View>

          {/* Main Top Header */}
          <View
            style={styles.header}
            {...headerPanResponder.panHandlers}
          >
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <ReactIcon size={18} />
              </View>
              <Text style={styles.headerTitle}>Unified DevTools</Text>
              <Text style={styles.versionTag}>v0.83+</Text>
            </View>

            <View style={styles.headerActions}>
              {/* Dual Mode Theme Toggle */}
              <TouchableOpacity
                onPress={toggleTheme}
                style={styles.themeToggleBtn}
                activeOpacity={0.7}
                accessibilityLabel="Toggle Dark and Light Mode"
              >
                <Text style={styles.themeToggleText}>
                  {isDark ? '☀️ Light' : '🌙 Dark'}
                </Text>
              </TouchableOpacity>

              {/* Close '✕' Button (Click to close) */}
              <TouchableOpacity
                onPress={animateClose}
                style={styles.closeButton}
                activeOpacity={0.7}
                accessibilityLabel="Close DevTools"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Horizontally Scrollable Tab Selector Bar */}
          <View style={styles.tabBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBarScroll}
            >
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
                    errorLogsCount > 0 && { backgroundColor: colors.status.error },
                  ]}
                >
                  <Text style={styles.countText}>{errorLogsCount > 0 ? errorLogsCount : logs.length}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'network' && styles.tabItemActive]}
                onPress={() => setActiveTab('network')}
              >
                <Text style={styles.tabIcon}>🌐</Text>
                <Text style={[styles.tabLabel, activeTab === 'network' && styles.tabLabelActive]}>
                  Network
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    networkErrorCount > 0 && { backgroundColor: colors.status.error },
                  ]}
                >
                  <Text style={styles.countText}>
                    {networkErrorCount > 0 ? networkErrorCount : networkRequests.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'lighthouse' && styles.tabItemActive]}
                onPress={() => setActiveTab('lighthouse')}
              >
                <Text style={styles.tabIcon}>⚡</Text>
                <Text style={[styles.tabLabel, activeTab === 'lighthouse' && styles.tabLabelActive]}>
                  Lighthouse
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'navigation' && styles.tabItemActive]}
                onPress={() => setActiveTab('navigation')}
              >
                <Text style={styles.tabIcon}>🧭</Text>
                <Text style={[styles.tabLabel, activeTab === 'navigation' && styles.tabLabelActive]}>
                  Navigation
                </Text>
              </TouchableOpacity>
            </ScrollView>
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

            {activeTab === 'network' && <NetworkTab />}

            {activeTab === 'lighthouse' && <LighthouseTab />}

            {activeTab === 'navigation' && <NavigationTab />}
          </View>

          <SafeAreaView style={styles.bottomSafeArea} />
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalBackdropContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdropOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.backdrop,
    },
    sheetContainer: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 20,
    },
    handleBar: {
      width: '100%',
      paddingTop: 10,
      paddingBottom: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.headerBg,
    },
    handlePill: {
      width: 42,
      height: 4.5,
      borderRadius: 3,
      backgroundColor: colors.handle,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingBottom: 10,
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    brandBadge: {
      width: 22,
      height: 22,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    versionTag: {
      color: colors.accent,
      fontSize: 9.5,
      fontWeight: '700',
      backgroundColor: colors.card,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
      borderWidth: 0.5,
      borderColor: colors.borderSubtle,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    themeToggleBtn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 7,
      paddingVertical: 3.5,
      borderRadius: 5,
    },
    themeToggleText: {
      color: colors.text,
      fontSize: 10.5,
      fontWeight: '700',
    },
    headerButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 7,
      paddingVertical: 3.5,
      borderRadius: 5,
    },
    headerButtonText: {
      color: colors.textDim,
      fontSize: 10.5,
      fontWeight: '600',
    },
    clearButton: {
      borderColor: '#ef4444',
    },
    clearButtonText: {
      color: '#ef4444',
    },
    closeButton: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 2,
    },
    closeButtonText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: 'bold',
    },
    tabBarContainer: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabBarScroll: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    tabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: {
      borderBottomColor: colors.accent,
    },
    tabIcon: {
      fontSize: 13,
    },
    tabLabel: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: '600',
    },
    tabLabelActive: {
      color: colors.text,
    },
    countBadge: {
      backgroundColor: colors.card,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    countText: {
      color: colors.text,
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
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    bottomSafeArea: {
      backgroundColor: colors.bg,
    },
  });
