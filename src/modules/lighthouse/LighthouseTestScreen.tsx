import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ScreenProfiler, screenPerformanceManager } from './screenProfiler';
import { DARK_THEME } from '../../theme/colors';

export interface LighthouseTestScreenProps {
  id?: string;
  onNavigateBack?: () => void;
}

export const LighthouseTestScreen: React.FC<LighthouseTestScreenProps> = ({
  id = 'LighthouseTestScreen',
  onNavigateBack,
}) => {
  const [renderCounter, setRenderCounter] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready for Lighthouse stress testing');
  const [isHeavyLoading, setIsHeavyLoading] = useState(false);
  const [heavyItems, setHeavyItems] = useState<number[]>([]);
  const [allocatedMemoryMB, setAllocatedMemoryMB] = useState(0);

  // Live snapshot state
  const [snapshot, setSnapshot] = useState(() => screenPerformanceManager.getSnapshot(id));

  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshot(screenPerformanceManager.getSnapshot(id));
    }, 500);
    return () => clearInterval(interval);
  }, [id]);

  // 1. Simulate JS Blocking Lag
  const simulateBlockingLag = (durationMs = 95) => {
    setStatusMessage(`Simulating ${durationMs}ms JS thread blocking lag...`);
    const start = Date.now();
    while (Date.now() - start < durationMs) {
      // Intentionally spin to block JS event loop
    }
    setStatusMessage(`Completed ${durationMs}ms blocking loop (Event loop lag detected)`);
  };

  // 2. Trigger Burst of Re-renders
  const triggerRapidReRenders = (count = 5) => {
    setStatusMessage(`Triggering burst of ${count} rapid re-renders...`);
    for (let i = 1; i <= count; i++) {
      setTimeout(() => {
        setRenderCounter((prev) => prev + 1);
        screenPerformanceManager.recordRender(id, 'LighthouseStressComponent');
      }, i * 35);
    }
  };

  // 3. Drop FPS with heavy workload
  const triggerFpsDrop = () => {
    setStatusMessage('Simulating frame drop with 500 complex items...');
    setIsHeavyLoading(true);
    setTimeout(() => {
      const items = Array.from({ length: 400 }, (_, i) => i);
      setHeavyItems(items);
      setIsHeavyLoading(false);
      setStatusMessage('Rendered 400 items. Scroll to measure FPS jank.');
    }, 20);
  };

  const clearHeavyItems = () => {
    setHeavyItems([]);
    setStatusMessage('Heavy list cleared.');
  };

  // 4. Simulate Hermes Memory Allocation
  const simulateMemoryAllocation = () => {
    setStatusMessage('Allocating ~5MB temporary objects in JS heap...');
    const dummy: Array<{ id: number; data: string }> = [];
    for (let i = 0; i < 50000; i++) {
      dummy.push({ id: i, data: 'Lighthouse-Memory-Stress-Payload-' + i });
    }
    setAllocatedMemoryMB((prev) => prev + 5);
    setStatusMessage('Allocated 50,000 objects in JS heap.');
  };

  return (
    <ScreenProfiler id={id}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Nav */}
        <View style={styles.header}>
          {onNavigateBack && (
            <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>⚡ Lighthouse Auditor Test Screen</Text>
            <Text style={styles.subtitle}>Target Screen ID: {id}</Text>
          </View>
        </View>

        {/* Live Metrics Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Screen Profiler Snapshot</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Mount TTI</Text>
              <Text style={styles.metricValue}>{snapshot.mountDurationMs} ms</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Re-renders</Text>
              <Text style={styles.metricValue}>{snapshot.reRenderCount}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Local Counter</Text>
              <Text style={styles.metricValue}>{renderCounter}</Text>
            </View>
          </View>

          {snapshot.reRenderHotspots.length > 0 && (
            <View style={styles.hotspotsContainer}>
              <Text style={styles.hotspotTitle}>Re-render Hotspots Detected:</Text>
              {snapshot.reRenderHotspots.map((h) => (
                <Text key={h.componentName} style={styles.hotspotText}>
                  • {h.componentName} ({h.count} renders)
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Status Box */}
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Stress Test Status:</Text>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Performance Diagnostic Triggers</Text>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnLag]}
            onPress={() => simulateBlockingLag(95)}
          >
            <Text style={styles.actionBtnText}>⏱️ Simulate JS Thread Lag (95ms)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnRerender]}
            onPress={() => triggerRapidReRenders(5)}
          >
            <Text style={styles.actionBtnText}>⚡ Trigger Rapid Re-renders (x5 bursts)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnFps]}
            onPress={heavyItems.length > 0 ? clearHeavyItems : triggerFpsDrop}
          >
            <Text style={styles.actionBtnText}>
              {heavyItems.length > 0
                ? '🧹 Clear Heavy List'
                : '📉 Drop FPS (Mount 400 Stress Items)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnMem]}
            onPress={simulateMemoryAllocation}
          >
            <Text style={styles.actionBtnText}>
              🧠 Allocate JS Heap Memory (+5MB) [{allocatedMemoryMB}MB added]
            </Text>
          </TouchableOpacity>
        </View>

        {/* Heavy Stress Item List */}
        {isHeavyLoading ? (
          <ActivityIndicator color={DARK_THEME.colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          heavyItems.length > 0 && (
            <View style={styles.heavyList}>
              <Text style={styles.heavyListTitle}>Mounted Stress Items ({heavyItems.length})</Text>
              {heavyItems.slice(0, 30).map((num) => (
                <View key={num} style={styles.heavyItem}>
                  <Text style={styles.heavyItemText}>
                    Item #{num} — Stress node rendering to verify frame rates
                  </Text>
                </View>
              ))}
              {heavyItems.length > 30 && (
                <Text style={styles.heavyMoreText}>
                  + {heavyItems.length - 30} more items rendered in memory
                </Text>
              )}
            </View>
          )
        )}
      </ScrollView>
    </ScreenProfiler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.colors.bg,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    marginBottom: 16,
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: DARK_THEME.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DARK_THEME.colors.border,
  },
  backButtonText: {
    color: DARK_THEME.colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: DARK_THEME.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: DARK_THEME.colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    backgroundColor: DARK_THEME.colors.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: DARK_THEME.colors.border,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK_THEME.colors.textDim,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: DARK_THEME.colors.textMuted,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: DARK_THEME.colors.accent,
    marginTop: 4,
  },
  hotspotsContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: DARK_THEME.colors.borderSubtle,
  },
  hotspotTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 4,
  },
  hotspotText: {
    fontSize: 12,
    color: DARK_THEME.colors.text,
    marginVertical: 1,
  },
  statusBox: {
    backgroundColor: DARK_THEME.colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DARK_THEME.colors.border,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DARK_THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: 13,
    color: DARK_THEME.colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  section: {
    gap: 10,
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK_THEME.colors.textDim,
    marginBottom: 4,
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnLag: {
    backgroundColor: '#b45309',
  },
  btnRerender: {
    backgroundColor: '#0284c7',
  },
  btnFps: {
    backgroundColor: '#9333ea',
  },
  btnMem: {
    backgroundColor: '#0f766e',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  heavyList: {
    marginTop: 10,
    backgroundColor: DARK_THEME.colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: DARK_THEME.colors.border,
  },
  heavyListTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK_THEME.colors.textDim,
    marginBottom: 8,
  },
  heavyItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: DARK_THEME.colors.borderSubtle,
  },
  heavyItemText: {
    fontSize: 11,
    color: DARK_THEME.colors.textMuted,
  },
  heavyMoreText: {
    fontSize: 11,
    color: DARK_THEME.colors.accent,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
