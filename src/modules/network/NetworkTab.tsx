import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type { HttpMethod, NetworkMockRule, NetworkRequestItem } from '../../types';
import { networkManager } from './networkInterceptor';
import { NetworkDetailsModal } from './NetworkDetailsModal';
import { MockRulesModal } from './MockRulesModal';

export const NetworkTab: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [requests, setRequests] = useState<NetworkRequestItem[]>(networkManager.getRequests());
  const [rules, setRules] = useState<NetworkMockRule[]>(networkManager.getRules());
  const [masterOverrides, setMasterOverrides] = useState<boolean>(
    networkManager.isMasterOverrideEnabled()
  );

  // Filters
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | '2xx' | '4xx' | '5xx' | 'MOCK'>('ALL');

  // Modals
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequestItem | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<Partial<NetworkMockRule> | null>(null);

  React.useEffect(() => {
    const unsubReq = networkManager.subscribe((newReqs) => {
      setRequests(newReqs);
    });
    const unsubRules = networkManager.subscribeRules((newRules) => {
      setRules(newRules);
      setMasterOverrides(networkManager.isMasterOverrideEnabled());
    });
    return () => {
      unsubReq();
      unsubRules();
    };
  }, []);

  const handleToggleMasterOverride = () => {
    const next = !masterOverrides;
    networkManager.setMasterOverrideEnabled(next);
    setMasterOverrides(next);
  };

  const handleClear = () => {
    networkManager.clear();
  };

  const activeRulesCount = rules.filter((r) => r.enabled).length;

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesUrl = req.url.toLowerCase().includes(query);
        const matchesMethod = req.method.toLowerCase().includes(query);
        if (!matchesUrl && !matchesMethod) return false;
      }

      // Method filter
      if (selectedMethod !== 'ALL' && req.method.toUpperCase() !== selectedMethod) {
        return false;
      }

      // Status filter
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

  const renderItem = ({ item }: { item: NetworkRequestItem }) => {
    let pathname = item.url;
    let domain = '';
    try {
      const parsed = new URL(item.url);
      pathname = parsed.pathname + parsed.search;
      domain = parsed.host;
    } catch {
      // Keep url
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
          {/* Method Badge */}
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

          {/* Status Badge */}
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

          {/* URL & Domain */}
          <View style={styles.urlCol}>
            <View style={styles.pathRow}>
              <Text style={styles.pathText} numberOfLines={1}>
                {pathname}
              </Text>
              {item.isOverridden ? (
                <View style={styles.flaskBadge}>
                  <Text style={styles.flaskText}>⚡ Mock</Text>
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

        {/* Right Info: Duration & Timestamp */}
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
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter URLs, methods, or endpoints..."
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
        <View style={styles.chipsRow}>
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
        </View>
      </View>

      {/* Control Action Toolbar */}
      <View style={styles.toolbar}>
        {/* Master Override Toggle */}
        <TouchableOpacity
          onPress={handleToggleMasterOverride}
          style={[
            styles.masterOverrideBtn,
            masterOverrides ? styles.masterOn : styles.masterOff,
          ]}
        >
          <Text style={styles.masterOverrideText}>
            ⚡ Overrides: {masterOverrides ? 'ON' : 'OFF'}
          </Text>
          {activeRulesCount > 0 ? (
            <View style={styles.activeRulesBadge}>
              <Text style={styles.activeRulesText}>{activeRulesCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.toolbarRight}>
          <TouchableOpacity
            onPress={() => {
              setRuleToEdit(null);
              setIsRulesModalOpen(true);
            }}
            style={styles.toolbarBtn}
          >
            <Text style={styles.toolbarBtnText}>🧪 Mocks ({rules.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClear} style={styles.toolbarBtn}>
            <Text style={styles.toolbarBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Request List */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={
          filteredRequests.length === 0 ? styles.emptyList : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌐</Text>
            <Text style={styles.emptyTitle}>No Network Requests</Text>
            <Text style={styles.emptySub}>
              Trigger any fetch, axios, or GraphQL request in your app to inspect payloads and headers, or create mock overrides.
            </Text>
          </View>
        }
      />

      {/* Details Modal */}
      <NetworkDetailsModal
        request={selectedRequest}
        visible={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        onOverrideRequest={(prefill) => {
          setRuleToEdit(prefill);
          setIsRulesModalOpen(true);
        }}
      />

      {/* Mock Rules Modal */}
      <MockRulesModal
        visible={isRulesModalOpen}
        onClose={() => {
          setIsRulesModalOpen(false);
          setRuleToEdit(null);
        }}
        initialRuleToEdit={ruleToEdit}
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
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 12,
      marginTop: 10,
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
      paddingVertical: 8,
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
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
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
      paddingVertical: 8,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.headerBg,
    },
    masterOverrideBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
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
    masterOverrideText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    activeRulesBadge: {
      backgroundColor: colors.status.fresh,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    activeRulesText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    toolbarRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    toolbarBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toolbarBtnText: {
      color: colors.text,
      fontSize: 12,
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
      paddingVertical: 10,
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
      paddingVertical: 3,
      borderRadius: 4,
      minWidth: 46,
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
      fontSize: 11,
      fontWeight: '700',
    },
    statusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      minWidth: 32,
      alignItems: 'center',
    },
    statusText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    urlCol: {
      flex: 1,
      gap: 2,
    },
    pathRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pathText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      flexShrink: 1,
    },
    flaskBadge: {
      backgroundColor: colors.status.paused,
      borderRadius: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    flaskText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
    },
    domainText: {
      color: colors.textDim,
      fontSize: 11,
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
      fontSize: 44,
      marginBottom: 6,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    emptySub: {
      color: colors.textDim,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },
  });
