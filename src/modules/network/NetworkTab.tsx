import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type {
  HttpMethod,
  NetworkMockRule,
  NetworkOverrideMode,
  NetworkRequestItem,
} from '../../types';
import { networkManager } from './networkInterceptor';
import { NetworkDetailsModal } from './NetworkDetailsModal';

const METHODS: HttpMethod[] = ['ANY', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const STATUS_PRESETS = [
  { status: 200, label: '200 OK' },
  { status: 201, label: '201 Created' },
  { status: 400, label: '400 Bad' },
  { status: 401, label: '401 Unauth' },
  { status: 403, label: '403 Forbidden' },
  { status: 404, label: '404 Not Found' },
  { status: 429, label: '429 RateLimit' },
  { status: 500, label: '500 ServerErr' },
  { status: 503, label: '503 Unavailable' },
];

const DELAY_PRESETS = [0, 300, 800, 1500, 3000];

export const NetworkTab: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Sub-tab: 'real' = Real Network, 'mock' = Mock Network
  const [activeSubTab, setActiveSubTab] = useState<'real' | 'mock'>('real');

  const [requests, setRequests] = useState<NetworkRequestItem[]>(networkManager.getRequests());
  const [rules, setRules] = useState<NetworkMockRule[]>(networkManager.getRules());
  const [masterMockEnabled, setMasterMockEnabled] = useState<boolean>(
    networkManager.isMasterOverrideEnabled()
  );

  // Filters for Real Network
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | '2xx' | '4xx' | '5xx' | 'MOCK'>('ALL');

  // Request Details Modal
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequestItem | null>(null);

  // Mock Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formPattern, setFormPattern] = useState('');
  const [formMethod, setFormMethod] = useState<HttpMethod>('ANY');
  const [formMode, setFormMode] = useState<NetworkOverrideMode>('response');
  const [formStatus, setFormStatus] = useState<number>(200);
  const [formDelayMs, setFormDelayMs] = useState<number>(0);
  const [formBody, setFormBody] = useState<string>(
    JSON.stringify({ message: 'Mock response from Unified DevTools' }, null, 2)
  );

  React.useEffect(() => {
    const unsubReq = networkManager.subscribe((newReqs) => {
      setRequests(newReqs);
    });
    const unsubRules = networkManager.subscribeRules((newRules) => {
      setRules(newRules);
      setMasterMockEnabled(networkManager.isMasterOverrideEnabled());
    });
    return () => {
      unsubReq();
      unsubRules();
    };
  }, []);

  const handleToggleMasterMock = () => {
    const next = !masterMockEnabled;
    networkManager.setMasterOverrideEnabled(next);
    setMasterMockEnabled(next);
  };

  const handleClearRequests = () => {
    networkManager.clear();
  };

  const activeRulesCount = rules.filter((r) => r.enabled).length;

  const handleStartCreateRule = () => {
    setEditingRuleId(null);
    setFormPattern('');
    setFormMethod('ANY');
    setFormMode('response');
    setFormStatus(200);
    setFormDelayMs(0);
    setFormBody(JSON.stringify({ message: 'Mock response from Unified DevTools' }, null, 2));
    setIsFormOpen(true);
  };

  const handleStartEditRule = (rule: NetworkMockRule) => {
    setEditingRuleId(rule.id);
    setFormPattern(rule.urlPattern);
    setFormMethod(rule.method);
    setFormMode(rule.mode);
    setFormStatus(rule.status);
    setFormDelayMs(rule.delayMs || 0);
    setFormBody(rule.responseBody);
    setIsFormOpen(true);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(formBody);
      setFormBody(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore invalid json format attempt
    }
  };

  const handleSaveMockRule = () => {
    if (!formPattern.trim()) return;

    if (editingRuleId) {
      networkManager.updateRule(editingRuleId, {
        urlPattern: formPattern.trim(),
        method: formMethod,
        mode: formMode,
        status: formStatus,
        delayMs: formDelayMs,
        responseBody: formBody,
      });
    } else {
      networkManager.addRule({
        enabled: true,
        urlPattern: formPattern.trim(),
        method: formMethod,
        mode: formMode,
        status: formStatus,
        delayMs: formDelayMs,
        responseBody: formBody,
      });
    }

    setIsFormOpen(false);
  };

  const handleOverrideFromRequest = (prefill: Partial<NetworkMockRule>) => {
    setEditingRuleId(null);
    setFormPattern(prefill.urlPattern || '');
    setFormMethod(prefill.method || 'ANY');
    setFormMode(prefill.mode || 'response');
    setFormStatus(prefill.status || 200);
    setFormDelayMs(prefill.delayMs || 0);
    setFormBody(prefill.responseBody || JSON.stringify({ message: 'Mock response' }, null, 2));
    setActiveSubTab('mock');
    setIsFormOpen(true);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesUrl = req.url.toLowerCase().includes(query);
        const matchesMethod = req.method.toLowerCase().includes(query);
        if (!matchesUrl && !matchesMethod) return false;
      }

      if (selectedMethod !== 'ALL' && req.method.toUpperCase() !== selectedMethod) {
        return false;
      }

      if (selectedStatusFilter === '2xx') {
        if (!req.status || req.status < 200 || req.status >= 300) return false;
      } else if (selectedStatusFilter === '4xx') {
        if (!req.status || req.status < 400 || req.status >= 500) return false;
      } else if (selectedStatusFilter === '5xx') {
        if (!req.status || req.status < 500 || req.status >= 600) return false;
      } else if (selectedStatusFilter === 'MOCK') {
        if (!req.isOverridden) return false;
      }

      return true;
    });
  }, [requests, search, selectedMethod, selectedStatusFilter]);

  const renderRequestItem = ({ item }: { item: NetworkRequestItem }) => {
    let pathname = item.url;
    let domain = '';
    try {
      const parsed = new URL(item.url);
      pathname = parsed.pathname + parsed.search;
      domain = parsed.host;
    } catch {
      // keep full url
    }

    const isSuccess = item.status && item.status >= 200 && item.status < 400;
    const isError = item.status && item.status >= 400;

    const timeStr = new Date(item.startTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.requestRow}
        onPress={() => setSelectedRequest(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.methodBadge,
              item.method === 'GET'
                ? styles.methodGet
                : item.method === 'POST'
                ? styles.methodPost
                : item.method === 'DELETE'
                ? styles.methodDelete
                : styles.methodOther,
            ]}
          >
            <Text style={styles.methodText}>{item.method}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              item.isPending
                ? { backgroundColor: colors.status.fetching }
                : isSuccess
                ? { backgroundColor: colors.status.fresh }
                : isError
                ? { backgroundColor: colors.status.error }
                : { backgroundColor: colors.status.paused },
            ]}
          >
            <Text style={styles.statusText}>
              {item.isPending ? '...' : item.status || 0}
            </Text>
          </View>

          <View style={styles.urlCol}>
            <View style={styles.pathRow}>
              <Text style={styles.pathText} numberOfLines={1}>
                {pathname}
              </Text>
              {item.isOverridden ? (
                <View style={styles.mockBadge}>
                  <Text style={styles.mockBadgeText}>⚡ Mock</Text>
                </View>
              ) : null}
            </View>
            {domain ? (
              <Text style={styles.domainText} numberOfLines={1}>
                {domain}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.durationText}>
            {item.duration !== undefined ? `${item.duration}ms` : item.isPending ? 'pending' : ''}
          </Text>
          <Text style={styles.timeText}>{timeStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Network Sub-Tabs: Real Network vs Mock Network */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabItem, activeSubTab === 'real' && styles.subTabItemActive]}
          onPress={() => setActiveSubTab('real')}
          activeOpacity={0.8}
        >
          <Text style={[styles.subTabLabel, activeSubTab === 'real' && styles.subTabLabelActive]}>
            🌐 Real Network
          </Text>
          <View style={styles.subTabCount}>
            <Text style={styles.subTabCountText}>{requests.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabItem, activeSubTab === 'mock' && styles.subTabItemActive]}
          onPress={() => setActiveSubTab('mock')}
          activeOpacity={0.8}
        >
          <Text style={[styles.subTabLabel, activeSubTab === 'mock' && styles.subTabLabelActive]}>
            ⚡ Mock Network
          </Text>
          <View
            style={[
              styles.subTabCount,
              activeRulesCount > 0 && { backgroundColor: colors.status.paused },
            ]}
          >
            <Text style={styles.subTabCountText}>{rules.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* =========================================================
       * SUB-TAB 1: REAL NETWORK
       * ======================================================= */}
      {activeSubTab === 'real' && (
        <View style={styles.tabContent}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Filter endpoints, methods, domains..."
              placeholderTextColor={colors.textDim}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Chips Bar */}
          <View style={styles.filterBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, selectedMethod === m && styles.chipActive]}
                  onPress={() => setSelectedMethod(m)}
                >
                  <Text style={[styles.chipText, selectedMethod === m && styles.chipTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.chipDivider} />

              {(['ALL', '2xx', '4xx', '5xx', 'MOCK'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, selectedStatusFilter === s && styles.chipActive]}
                  onPress={() => setSelectedStatusFilter(s)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedStatusFilter === s && styles.chipTextActive,
                      s === 'MOCK' && { color: colors.status.paused },
                    ]}
                  >
                    {s === 'MOCK' ? '⚡ Mocked' : s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Quick Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={handleToggleMasterMock}
              style={[
                styles.masterMockBtn,
                masterMockEnabled ? styles.masterOn : styles.masterOff,
              ]}
            >
              <Text style={styles.masterMockText}>
                ⚡ Network Mock: {masterMockEnabled ? 'ON' : 'OFF'}
              </Text>
              {activeRulesCount > 0 ? (
                <View style={styles.activeRulesBadge}>
                  <Text style={styles.activeRulesText}>{activeRulesCount} active</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={styles.toolbarRight}>
              <TouchableOpacity
                onPress={() => {
                  handleStartCreateRule();
                  setActiveSubTab('mock');
                }}
                style={styles.toolbarBtn}
              >
                <Text style={styles.toolbarBtnText}>+ New Mock</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClearRequests} style={styles.toolbarBtn}>
                <Text style={styles.toolbarBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Request List */}
          <FlatList
            data={filteredRequests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestItem}
            style={styles.list}
            contentContainerStyle={
              filteredRequests.length === 0 ? styles.emptyList : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🌐</Text>
                <Text style={styles.emptyTitle}>No Network Requests</Text>
                <Text style={styles.emptySub}>
                  Trigger any fetch or Axios call in your app. Requests and payloads appear here live.
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* =========================================================
       * SUB-TAB 2: MOCK NETWORK
       * ======================================================= */}
      {activeSubTab === 'mock' && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.mockScrollContent}>
          {/* Mock Controls Header */}
          <View style={styles.mockHeaderRow}>
            <TouchableOpacity
              onPress={handleToggleMasterMock}
              style={[
                styles.masterMockBtn,
                masterMockEnabled ? styles.masterOn : styles.masterOff,
              ]}
            >
              <Text style={styles.masterMockText}>
                ⚡ Network Mock: {masterMockEnabled ? 'ENABLED' : 'PAUSED'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (isFormOpen) {
                  setIsFormOpen(false);
                } else {
                  handleStartCreateRule();
                }
              }}
              style={styles.newRuleBtn}
            >
              <Text style={styles.newRuleBtnText}>
                {isFormOpen ? '✕ Cancel' : '+ New Mock Rule'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form to Create / Edit Mock Rule */}
          {isFormOpen ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingRuleId ? '✏️ Edit Mock Rule' : '⚡ Create Mock Rule'}
              </Text>
              <Text style={styles.formSub}>
                Intercepts matching requests and returns your custom mock response immediately.
              </Text>

              {/* URL Pattern */}
              <Text style={styles.fieldLabel}>URL Pattern (wildcard * or substring):</Text>
              <TextInput
                style={styles.textInput}
                value={formPattern}
                onChangeText={setFormPattern}
                placeholder="e.g. /users, */users*, https://.../users"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* HTTP Method */}
              <Text style={styles.fieldLabel}>HTTP Method:</Text>
              <View style={styles.pillsRow}>
                {METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pill, formMethod === m && styles.pillActive]}
                    onPress={() => setFormMethod(m)}
                  >
                    <Text style={[styles.pillText, formMethod === m && styles.pillTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mode */}
              <Text style={styles.fieldLabel}>Behavior Mode:</Text>
              <View style={styles.pillsRow}>
                <TouchableOpacity
                  style={[styles.pill, formMode === 'response' && styles.pillActive]}
                  onPress={() => setFormMode('response')}
                >
                  <Text style={[styles.pillText, formMode === 'response' && styles.pillTextActive]}>
                    Custom Response
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, formMode === 'offline' && styles.pillActive]}
                  onPress={() => setFormMode('offline')}
                >
                  <Text style={[styles.pillText, formMode === 'offline' && styles.pillTextActive]}>
                    📵 Offline Error
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, formMode === 'timeout' && styles.pillActive]}
                  onPress={() => setFormMode('timeout')}
                >
                  <Text style={[styles.pillText, formMode === 'timeout' && styles.pillTextActive]}>
                    ⏳ Timeout Error
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status Presets (for Custom Response) */}
              {formMode === 'response' && (
                <>
                  <Text style={styles.fieldLabel}>Status Code Preset:</Text>
                  <View style={styles.pillsRow}>
                    {STATUS_PRESETS.map((p) => (
                      <TouchableOpacity
                        key={p.status}
                        style={[
                          styles.statusPill,
                          formStatus === p.status && {
                            backgroundColor: p.status < 400 ? colors.status.fresh : colors.status.error,
                            borderColor: p.status < 400 ? colors.status.fresh : colors.status.error,
                          },
                        ]}
                        onPress={() => setFormStatus(p.status)}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            formStatus === p.status && { color: '#fff', fontWeight: '700' },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Latency Delay */}
              <Text style={styles.fieldLabel}>Artificial Delay:</Text>
              <View style={styles.pillsRow}>
                {DELAY_PRESETS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.pill, formDelayMs === d && styles.pillActive]}
                    onPress={() => setFormDelayMs(d)}
                  >
                    <Text style={[styles.pillText, formDelayMs === d && styles.pillTextActive]}>
                      {d === 0 ? 'Instant' : `+${d}ms`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Response Body Editor */}
              {formMode === 'response' && (
                <>
                  <View style={styles.bodyHeaderRow}>
                    <Text style={styles.fieldLabel}>Response Body (JSON):</Text>
                    <TouchableOpacity onPress={handleFormatJson} style={styles.formatBtn}>
                      <Text style={styles.formatBtnText}>Format JSON</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.codeArea]}
                    value={formBody}
                    onChangeText={setFormBody}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              )}

              {/* Save Button */}
              <TouchableOpacity onPress={handleSaveMockRule} style={styles.saveRuleBtn}>
                <Text style={styles.saveRuleBtnText}>
                  {editingRuleId ? '✓ Update Mock Rule' : '✓ Arm Mock Rule'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Mock Rules List */}
          <View style={styles.rulesListSection}>
            <Text style={styles.rulesSectionTitle}>
              Configured Mock Rules ({rules.length})
            </Text>

            {rules.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🧪</Text>
                <Text style={styles.emptyTitle}>No Mock Rules Active</Text>
                <Text style={styles.emptySub}>
                  Add a mock rule to test custom API responses, error states (401, 500), simulate offline failures, or test loading spinners.
                </Text>
                <TouchableOpacity onPress={handleStartCreateRule} style={styles.addFirstBtn}>
                  <Text style={styles.addFirstBtnText}>+ Create Mock Rule</Text>
                </TouchableOpacity>
              </View>
            ) : (
              rules.map((rule) => (
                <View key={rule.id} style={styles.ruleCard}>
                  <View style={styles.ruleCardHeader}>
                    <View style={styles.ruleBadgeGroup}>
                      <View style={styles.ruleMethodBadge}>
                        <Text style={styles.ruleMethodText}>{rule.method}</Text>
                      </View>
                      <View
                        style={[
                          styles.ruleStatusBadge,
                          {
                            backgroundColor:
                              rule.mode === 'offline' || rule.mode === 'timeout'
                                ? colors.status.paused
                                : rule.status < 400
                                ? colors.status.fresh
                                : colors.status.error,
                          },
                        ]}
                      >
                        <Text style={styles.ruleStatusText}>
                          {rule.mode === 'offline'
                            ? 'Offline'
                            : rule.mode === 'timeout'
                            ? 'Timeout'
                            : `${rule.status}`}
                        </Text>
                      </View>
                      {rule.delayMs ? (
                        <View style={styles.ruleDelayBadge}>
                          <Text style={styles.ruleDelayText}>+{rule.delayMs}ms</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Toggle Switch */}
                    <TouchableOpacity
                      onPress={() => networkManager.toggleRule(rule.id)}
                      style={[
                        styles.ruleSwitch,
                        rule.enabled ? styles.switchOn : styles.switchOff,
                      ]}
                    >
                      <Text style={styles.switchText}>{rule.enabled ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.rulePatternText} selectable>
                    {rule.urlPattern}
                  </Text>

                  <View style={styles.ruleCardFooter}>
                    <TouchableOpacity
                      onPress={() => handleStartEditRule(rule)}
                      style={styles.ruleActionBtn}
                    >
                      <Text style={styles.ruleActionText}>✏️ Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => networkManager.deleteRule(rule.id)}
                      style={[styles.ruleActionBtn, styles.ruleDeleteBtn]}
                    >
                      <Text style={[styles.ruleActionText, styles.ruleDeleteText]}>
                        🗑️ Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Details Modal */}
      <NetworkDetailsModal
        request={selectedRequest}
        visible={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        onOverrideRequest={handleOverrideFromRequest}
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
    subTabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 12,
      gap: 12,
    },
    subTabItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    subTabItemActive: {
      borderBottomColor: colors.sky,
    },
    subTabLabel: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: '600',
    },
    subTabLabelActive: {
      color: colors.sky,
      fontWeight: '700',
    },
    subTabCount: {
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subTabCountText: {
      color: colors.text,
      fontSize: 10.5,
      fontWeight: '700',
    },
    tabContent: {
      flex: 1,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 12,
      marginTop: 8,
      marginBottom: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      paddingVertical: 7,
    },
    clearSearchBtn: {
      padding: 4,
    },
    clearSearchText: {
      color: colors.textDim,
      fontSize: 12,
    },
    filterBar: {
      paddingHorizontal: 12,
      paddingBottom: 6,
    },
    chipsScroll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.sky,
      borderColor: colors.sky,
    },
    chipText: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: '600',
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    chipDivider: {
      width: 1,
      height: 16,
      backgroundColor: colors.border,
      marginHorizontal: 2,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.headerBg,
    },
    masterMockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 4.5,
      borderRadius: 6,
      gap: 6,
    },
    masterOn: {
      backgroundColor: colors.status.fresh + '22',
      borderWidth: 1,
      borderColor: colors.status.fresh,
    },
    masterOff: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    masterMockText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: '700',
    },
    activeRulesBadge: {
      backgroundColor: colors.status.fresh,
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    activeRulesText: {
      color: '#fff',
      fontSize: 9.5,
      fontWeight: '800',
    },
    toolbarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    toolbarBtn: {
      paddingHorizontal: 9,
      paddingVertical: 4.5,
      backgroundColor: colors.card,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toolbarBtnText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: '600',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 30,
    },
    emptyList: {
      flexGrow: 1,
    },
    requestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.bg,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
      marginRight: 10,
    },
    methodBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 4,
      minWidth: 44,
      alignItems: 'center',
    },
    methodGet: {
      backgroundColor: colors.sky + '22',
    },
    methodPost: {
      backgroundColor: colors.status.fresh + '22',
    },
    methodDelete: {
      backgroundColor: colors.status.error + '22',
    },
    methodOther: {
      backgroundColor: colors.status.paused + '22',
    },
    methodText: {
      color: colors.text,
      fontSize: 10.5,
      fontWeight: '700',
    },
    statusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 4,
      minWidth: 30,
      alignItems: 'center',
    },
    statusText: {
      color: '#fff',
      fontSize: 10.5,
      fontWeight: '700',
    },
    urlCol: {
      flex: 1,
      gap: 2,
    },
    pathRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    pathText: {
      color: colors.text,
      fontSize: 12.5,
      fontWeight: '600',
      flexShrink: 1,
    },
    mockBadge: {
      backgroundColor: colors.status.paused,
      borderRadius: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    mockBadgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
    },
    domainText: {
      color: colors.textDim,
      fontSize: 10.5,
    },
    rowRight: {
      alignItems: 'flex-end',
      gap: 2,
    },
    durationText: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: '600',
    },
    timeText: {
      color: colors.textDim,
      fontSize: 10,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
      gap: 8,
    },
    emptyIcon: {
      fontSize: 40,
      marginBottom: 4,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    emptySub: {
      color: colors.textDim,
      fontSize: 12.5,
      textAlign: 'center',
      lineHeight: 17,
      maxWidth: 290,
    },
    mockScrollContent: {
      padding: 12,
      paddingBottom: 40,
      gap: 12,
    },
    mockHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    newRuleBtn: {
      backgroundColor: colors.sky,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    newRuleBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    formCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 14,
      gap: 10,
    },
    formTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    formSub: {
      color: colors.textDim,
      fontSize: 12,
      lineHeight: 16,
    },
    fieldLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 6,
      color: colors.text,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
    },
    codeArea: {
      minHeight: 120,
      fontFamily: 'monospace',
      textAlignVertical: 'top',
      fontSize: 11.5,
    },
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.sky,
      borderColor: colors.sky,
    },
    pillText: {
      color: colors.textDim,
      fontSize: 11.5,
      fontWeight: '600',
    },
    pillTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    statusPill: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusPillText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: '500',
    },
    bodyHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    formatBtn: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    formatBtnText: {
      color: colors.sky,
      fontSize: 11.5,
      fontWeight: '600',
    },
    saveRuleBtn: {
      backgroundColor: colors.sky,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
      marginTop: 8,
    },
    saveRuleBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    rulesListSection: {
      gap: 10,
      marginTop: 4,
    },
    rulesSectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    ruleCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    ruleCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ruleBadgeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ruleMethodBadge: {
      backgroundColor: colors.headerBg,
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 4,
    },
    ruleMethodText: {
      color: colors.sky,
      fontSize: 10.5,
      fontWeight: '700',
    },
    ruleStatusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2.5,
      borderRadius: 4,
    },
    ruleStatusText: {
      color: '#fff',
      fontSize: 10.5,
      fontWeight: '700',
    },
    ruleDelayBadge: {
      backgroundColor: colors.border,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    ruleDelayText: {
      color: colors.textDim,
      fontSize: 10,
    },
    ruleSwitch: {
      paddingHorizontal: 9,
      paddingVertical: 3.5,
      borderRadius: 12,
    },
    switchOn: {
      backgroundColor: colors.status.fresh,
    },
    switchOff: {
      backgroundColor: colors.status.inactive,
    },
    switchText: {
      color: '#fff',
      fontSize: 10.5,
      fontWeight: '700',
    },
    rulePatternText: {
      color: colors.text,
      fontSize: 13,
      fontFamily: 'monospace',
      fontWeight: '600',
    },
    ruleCardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    ruleActionBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    ruleActionText: {
      color: colors.textDim,
      fontSize: 11.5,
      fontWeight: '600',
    },
    ruleDeleteBtn: {
      marginLeft: 4,
    },
    ruleDeleteText: {
      color: colors.status.error,
    },
    addFirstBtn: {
      backgroundColor: colors.sky,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
      marginTop: 8,
    },
    addFirstBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
  });
