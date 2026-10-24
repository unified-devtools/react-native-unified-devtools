import React, { useEffect, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { navigationManager } from './navigationManager';
import type { NavigationEventItem, NavigationRouteNode, NavigationStateSnapshot } from './types';

export const NavigationTab: React.FC = () => {
  const [snapshot, setSnapshot] = useState<NavigationStateSnapshot>(() =>
    navigationManager.getSnapshot()
  );
  const [subTab, setSubTab] = useState<'tree' | 'params' | 'timeline' | 'jump'>('tree');
  const [jumpScreenInput, setJumpScreenInput] = useState('');
  const [jumpParamsInput, setJumpParamsInput] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);

  useEffect(() => {
    return navigationManager.subscribe((next) => {
      setSnapshot(next);
    });
  }, []);

  const handleQuickJump = () => {
    if (!jumpScreenInput.trim()) {
      setJumpError('Screen name cannot be empty');
      return;
    }
    setJumpError(null);
    let parsedParams: Record<string, unknown> | undefined = undefined;
    if (jumpParamsInput.trim()) {
      try {
        parsedParams = JSON.parse(jumpParamsInput.trim());
      } catch {
        setJumpError('Params must be valid JSON');
        return;
      }
    }
    navigationManager.navigate(jumpScreenInput.trim(), parsedParams);
  };

  const renderRouteNode = (node: NavigationRouteNode, depth = 0) => {
    return (
      <View key={node.key} style={[styles.treeNode, { paddingLeft: 12 + depth * 16 }]}>
        <View style={styles.treeRow}>
          <Text style={styles.treeBullet}>{node.isActive ? '🟢' : '⚪'}</Text>
          <Text style={[styles.treeName, node.isActive && styles.treeNameActive]}>
            {node.name}
          </Text>
          {node.isActive && (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>ACTIVE</Text>
            </View>
          )}
        </View>
        <Text style={styles.treeKey}>Key: {node.key}</Text>
        {node.children && node.children.length > 0 && (
          <View style={styles.treeChildren}>
            {node.children.map((child) => renderRouteNode(child, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  const renderTimelineItem = ({ item }: { item: NavigationEventItem }) => {
    const timeFormatted = new Date(item.timestamp).toLocaleTimeString();
    return (
      <View style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <View style={styles.badgeAction}>
            <Text style={styles.badgeActionText}>{item.actionType}</Text>
          </View>
          <Text style={styles.timelineTime}>{timeFormatted}</Text>
          {item.durationMs !== undefined && item.durationMs > 0 && (
            <Text style={styles.timelineDuration}>{item.durationMs}ms</Text>
          )}
        </View>

        <View style={styles.routeFlow}>
          {item.fromRoute ? (
            <>
              <Text style={styles.routeFlowText}>{item.fromRoute}</Text>
              <Text style={styles.routeFlowArrow}> → </Text>
            </>
          ) : null}
          <Text style={styles.routeFlowTarget}>{item.toRoute}</Text>
        </View>

        {item.params && Object.keys(item.params).length > 0 && (
          <View style={styles.paramsBox}>
            <Text style={styles.paramsLabel}>Params:</Text>
            <Text style={styles.paramsJson}>{JSON.stringify(item.params, null, 2)}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Banner / Current Screen State */}
      <View style={styles.banner}>
        <View style={styles.bannerMain}>
          <Text style={styles.bannerLabel}>CURRENT SCREEN</Text>
          <Text style={styles.currentScreenName}>
            {snapshot.currentRoute?.name || 'No Active Route'}
          </Text>
          <Text style={styles.currentScreenKey}>
            Key: {snapshot.currentRoute?.key || '-'}
          </Text>
        </View>

        <View style={styles.bannerActions}>
          <TouchableOpacity
            style={[styles.btnAction, !snapshot.canGoBack && styles.btnActionDisabled]}
            disabled={!snapshot.canGoBack}
            onPress={() => navigationManager.goBack()}
          >
            <Text style={styles.btnActionText}>‹ Go Back</Text>
          </TouchableOpacity>
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeText}>{snapshot.totalNavigations} Moves</Text>
          </View>
        </View>
      </View>

      {/* Sub-Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, subTab === 'tree' && styles.tabButtonActive]}
          onPress={() => setSubTab('tree')}
        >
          <Text style={[styles.tabButtonText, subTab === 'tree' && styles.tabButtonTextActive]}>
            Route Tree
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, subTab === 'params' && styles.tabButtonActive]}
          onPress={() => setSubTab('params')}
        >
          <Text style={[styles.tabButtonText, subTab === 'params' && styles.tabButtonTextActive]}>
            Params
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, subTab === 'timeline' && styles.tabButtonActive]}
          onPress={() => setSubTab('timeline')}
        >
          <Text style={[styles.tabButtonText, subTab === 'timeline' && styles.tabButtonTextActive]}>
            Timeline ({snapshot.history.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, subTab === 'jump' && styles.tabButtonActive]}
          onPress={() => setSubTab('jump')}
        >
          <Text style={[styles.tabButtonText, subTab === 'jump' && styles.tabButtonTextActive]}>
            Quick Jump
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Contents */}
      <View style={styles.content}>
        {subTab === 'tree' && (
          <ScrollView style={styles.scroll}>
            {snapshot.routeTree.length > 0 ? (
              snapshot.routeTree.map((rootNode) => renderRouteNode(rootNode))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No Route Tree available. Ensure NavigationContainer is mounted.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {subTab === 'params' && (
          <ScrollView style={styles.scroll}>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>
                {snapshot.currentRoute?.params &&
                Object.keys(snapshot.currentRoute.params).length > 0
                  ? JSON.stringify(snapshot.currentRoute.params, null, 2)
                  : '// No route params provided for this screen.'}
              </Text>
            </View>
          </ScrollView>
        )}

        {subTab === 'timeline' && (
          <View style={styles.flex1}>
            <View style={styles.timelineBar}>
              <Text style={styles.timelineCountText}>
                {snapshot.history.length} Event(s) Recorded
              </Text>
              {snapshot.history.length > 0 && (
                <TouchableOpacity
                  style={styles.btnClear}
                  onPress={() => navigationManager.clearHistory()}
                >
                  <Text style={styles.btnClearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={snapshot.history}
              keyExtractor={(item) => item.id}
              renderItem={renderTimelineItem}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No navigation actions logged yet.</Text>
                </View>
              }
            />
          </View>
        )}

        {subTab === 'jump' && (
          <ScrollView style={styles.scroll}>
            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Target Route Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Details, Profile, Settings"
                placeholderTextColor="#666"
                value={jumpScreenInput}
                onChangeText={setJumpScreenInput}
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Route Params (JSON Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formInputMulti]}
                placeholder='{"userId": 123, "tab": "billing"}'
                placeholderTextColor="#666"
                value={jumpParamsInput}
                onChangeText={setJumpParamsInput}
                multiline
                numberOfLines={3}
                autoCapitalize="none"
              />

              {jumpError && <Text style={styles.formError}>{jumpError}</Text>}

              <TouchableOpacity style={styles.btnJump} onPress={handleQuickJump}>
                <Text style={styles.btnJumpText}>Dispatch Navigate</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1e',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerMain: {
    flex: 1,
    marginRight: 12,
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a1a1aa',
    letterSpacing: 0.8,
  },
  currentScreenName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fafafa',
    marginTop: 2,
  },
  currentScreenKey: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
    fontFamily: 'Courier',
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#27272a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  btnActionDisabled: {
    opacity: 0.4,
  },
  btnActionText: {
    fontSize: 12,
    color: '#e4e4e7',
    fontWeight: '600',
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#18271e',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#22c55e44',
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ade80',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    paddingHorizontal: 8,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#6366f1',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  tabButtonTextActive: {
    color: '#818cf8',
  },
  content: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  treeNode: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  treeBullet: {
    fontSize: 12,
  },
  treeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4d4d8',
  },
  treeNameActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#14532d',
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4ade80',
  },
  treeKey: {
    fontSize: 10,
    color: '#52525b',
    marginLeft: 20,
    marginTop: 2,
    fontFamily: 'Courier',
  },
  treeChildren: {
    marginTop: 4,
  },
  timelineBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  timelineCountText: {
    fontSize: 12,
    color: '#71717a',
  },
  btnClear: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#27272a',
    borderRadius: 4,
  },
  btnClearText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  timelineCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeAction: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#312e81',
    borderRadius: 4,
  },
  badgeActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  timelineTime: {
    fontSize: 11,
    color: '#71717a',
  },
  timelineDuration: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '600',
  },
  routeFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  routeFlowText: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  routeFlowArrow: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '700',
  },
  routeFlowTarget: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fafafa',
  },
  paramsBox: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#09090b',
    borderRadius: 4,
  },
  paramsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#71717a',
    marginBottom: 2,
  },
  paramsJson: {
    fontSize: 11,
    color: '#cbd5e1',
    fontFamily: 'Courier',
  },
  codeContainer: {
    margin: 12,
    padding: 12,
    backgroundColor: '#09090b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  codeText: {
    fontSize: 12,
    color: '#38bdf8',
    fontFamily: 'Courier',
  },
  formContainer: {
    padding: 16,
    gap: 10,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d4d4d8',
  },
  formInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fafafa',
    fontSize: 13,
  },
  formInputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
    fontFamily: 'Courier',
  },
  formError: {
    fontSize: 12,
    color: '#f87171',
  },
  btnJump: {
    marginTop: 8,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnJumpText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
  },
});
