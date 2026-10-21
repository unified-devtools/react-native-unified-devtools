import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ScoreGauge } from './components/ScoreGauge';
import { MetricTile } from './components/MetricTile';
import { DiagnosticsList } from './components/DiagnosticsList';
import { screenPerformanceManager } from './screenProfiler';
import { runLighthouseAudit } from './lighthouseAuditor';
import type { LighthouseScoreResult } from './types';

export const LighthouseTab: React.FC = () => {
  const { colors } = useTheme();
  const [currentScreen, setCurrentScreen] = useState(
    screenPerformanceManager.getCurrentScreen()
  );
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<LighthouseScoreResult | null>(null);

  // Sync screen name changes
  useEffect(() => {
    return screenPerformanceManager.subscribe((screen) => {
      setCurrentScreen((prev) => (prev === screen ? prev : screen));
    });
  }, []);

  const handleRunAudit = useCallback(async () => {
    if (isAuditing) return;
    setIsAuditing(true);
    try {
      const res = await runLighthouseAudit(currentScreen, { sampleDurationMs: 1500 });
      setAuditResult(res);
    } catch (err) {
      // Safe audit fallback
    } finally {
      setIsAuditing(false);
    }
  }, [currentScreen, isAuditing]);

  // Initial audit on tab mount if no audit exists
  useEffect(() => {
    if (!auditResult && !isAuditing) {
      handleRunAudit();
    }
  }, [auditResult, handleRunAudit, isAuditing]);

  const metrics = auditResult?.metrics;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Action Header */}
      <View style={[styles.header, { borderColor: colors.borderSubtle }]}>
        <View style={styles.screenLabelContainer}>
          <Text style={[styles.screenPrefix, { color: colors.textMuted }]}>
            CURRENT SCREEN:
          </Text>
          <Text style={[styles.screenName, { color: colors.accent }]} numberOfLines={1}>
            {currentScreen}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.auditButton,
            { backgroundColor: colors.accent },
            isAuditing && { opacity: 0.7 },
          ]}
          onPress={handleRunAudit}
          disabled={isAuditing}
        >
          {isAuditing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.auditButtonText}>⚡ Record New Audit</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Score Gauge */}
      {auditResult && (
        <ScoreGauge
          score={auditResult.overallScore}
          grade={auditResult.grade}
          gradeLabel={auditResult.gradeLabel}
          summary={auditResult.summary}
        />
      )}

      {/* Metrics Section */}
      <View style={styles.metricsContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textDim }]}>
          CORE METRICS BREAKDOWN
        </Text>

        <View style={styles.tilesGrid}>
          <View style={styles.gridRow}>
            <MetricTile
              icon="🚀"
              label="Mount TTI"
              value={`${metrics?.mountDurationMs ?? 0}ms`}
              subtext={
                (metrics?.mountDurationMs ?? 0) <= 250
                  ? 'Fast (<250ms)'
                  : 'Exceeds budget'
              }
              status={(metrics?.mountDurationMs ?? 0) <= 250 ? 'pass' : 'warning'}
            />
            <MetricTile
              icon="🎯"
              label="Frame Rate"
              value={`${metrics?.fps.toFixed(1) ?? '60.0'} FPS`}
              subtext={`Target 60 (${metrics?.droppedFrames ?? 0} dropped)`}
              status={(metrics?.fps ?? 60) >= 50 ? 'pass' : 'critical'}
            />
          </View>

          <View style={styles.gridRow}>
            <MetricTile
              icon="⏱️"
              label="Event Loop Lag"
              value={`${metrics?.eventLoopLagMs ?? 0}ms`}
              subtext={
                (metrics?.eventLoopLagMs ?? 0) <= 35
                  ? 'Zero blocking'
                  : 'Thread lockup'
              }
              status={(metrics?.eventLoopLagMs ?? 0) <= 35 ? 'pass' : 'warning'}
            />
            <MetricTile
              icon="🔄"
              label="Re-renders"
              value={`${metrics?.reRenderCount ?? 0} renders`}
              subtext={
                (metrics?.reRenderCount ?? 0) <= 3
                  ? 'Optimal'
                  : `${metrics?.reRenderHotspots.length ?? 0} hotspots`
              }
              status={(metrics?.reRenderCount ?? 0) <= 3 ? 'pass' : 'warning'}
            />
          </View>

          <View style={styles.gridRow}>
            <MetricTile
              icon="🧠"
              label="Hermes Heap"
              value={
                metrics?.hermesHeapMb !== undefined
                  ? `${metrics.hermesHeapMb} MB`
                  : 'N/A'
              }
              subtext={
                metrics?.hermesHeapMb !== undefined ? 'Runtime active' : 'Non-Hermes'
              }
              status="pass"
            />
            <MetricTile
              icon="🌐"
              label="Slow Queries (>500ms)"
              value={`${metrics?.slowQueriesCount ?? 0}`}
              subtext={
                (metrics?.slowQueriesCount ?? 0) === 0
                  ? 'All fast'
                  : 'Network bottleneck'
              }
              status={(metrics?.slowQueriesCount ?? 0) === 0 ? 'pass' : 'critical'}
            />
          </View>
        </View>
      </View>

      {/* Diagnostics Checklist */}
      {auditResult && <DiagnosticsList diagnostics={auditResult.diagnostics} />}

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  screenLabelContainer: {
    flex: 1,
    marginRight: 10,
  },
  screenPrefix: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  screenName: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  auditButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auditButtonText: {
    color: '#030712',
    fontSize: 12,
    fontWeight: '700',
  },
  metricsContainer: {
    marginHorizontal: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tilesGrid: {
    flexDirection: 'column',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spacer: {
    height: 30,
  },
});
