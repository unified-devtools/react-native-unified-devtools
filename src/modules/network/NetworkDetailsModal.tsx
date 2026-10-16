import React, { useMemo, useState } from 'react';
import {
  Clipboard,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type { NetworkMockRule, NetworkRequestItem } from '../../types';
import { JsonTree } from '../../shared/JsonTree';

interface NetworkDetailsModalProps {
  request: NetworkRequestItem | null;
  visible: boolean;
  onClose: () => void;
  onOverrideRequest: (prefill: Partial<NetworkMockRule>) => void;
}

export const NetworkDetailsModal: React.FC<NetworkDetailsModalProps> = ({
  request,
  visible,
  onClose,
  onOverrideRequest,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<'response' | 'request' | 'headers' | 'curl'>('response');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!request) return null;

  const copyToClipboard = (text: string, key: string) => {
    Clipboard.setString(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generateCurl = (): string => {
    let curl = `curl -X ${request.method} "${request.url}"`;
    if (request.requestHeaders) {
      Object.entries(request.requestHeaders).forEach(([k, v]) => {
        curl += ` \\\n  -H "${k}: ${v}"`;
      });
    }
    if (request.requestBody) {
      const bodyStr =
        typeof request.requestBody === 'string'
          ? request.requestBody
          : JSON.stringify(request.requestBody);
      curl += ` \\\n  -d '${bodyStr.replace(/'/g, `'\\''`)}'`;
    }
    return curl;
  };

  const handleCreateOverride = () => {
    let urlPattern = request.url;
    try {
      const urlObj = new URL(request.url);
      urlPattern = `*${urlObj.pathname}*`;
    } catch {
      urlPattern = `*${request.url}*`;
    }

    const prefill: Partial<NetworkMockRule> = {
      urlPattern,
      method: (request.method as any) || 'ANY',
      mode: 'response',
      status: request.status && request.status > 0 ? request.status : 200,
      responseBody:
        typeof request.responseBody === 'string'
          ? request.responseBody
          : request.responseBody !== undefined
          ? JSON.stringify(request.responseBody, null, 2)
          : JSON.stringify({ message: 'Overridden payload' }, null, 2),
      delayMs: 0,
    };

    onClose();
    onOverrideRequest(prefill);
  };

  // Parse query params
  const queryParams: [string, string][] = [];
  try {
    const urlObj = new URL(request.url);
    urlObj.searchParams.forEach((val, key) => {
      queryParams.push([key, val]);
    });
  } catch {
    // ignore
  }

  const isSuccess = request.status && request.status >= 200 && request.status < 400;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.topActions}>
            <TouchableOpacity
              onPress={handleCreateOverride}
              style={styles.overrideBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.overrideBtnText}>⚡ Mock this Request</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overview Header */}
        <View style={styles.overviewHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.methodBadge}>
              <Text style={styles.methodText}>{request.method}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: request.isPending
                    ? colors.status.fetching
                    : isSuccess
                    ? colors.status.fresh
                    : colors.status.error,
                },
              ]}
            >
              <Text style={styles.statusText}>
                {request.isPending ? 'Pending...' : `${request.status || 0} ${request.statusText || ''}`}
              </Text>
            </View>
            <View style={styles.clientBadge}>
              <Text style={styles.clientText}>{request.client}</Text>
            </View>
            {request.isOverridden ? (
              <View style={styles.mockBadge}>
                <Text style={styles.mockText}>⚡ Mocked</Text>
              </View>
            ) : null}
            <Text style={styles.durationText}>
              {request.duration !== undefined ? `${request.duration}ms` : ''}
            </Text>
          </View>

          {/* Full URL */}
          <View style={styles.urlRow}>
            <Text style={styles.urlText} selectable>
              {request.url}
            </Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(request.url, 'url')}
              style={styles.miniCopyBtn}
            >
              <Text style={styles.miniCopyText}>
                {copiedKey === 'url' ? '✓ Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'response' && styles.tabItemActive]}
            onPress={() => setActiveTab('response')}
          >
            <Text style={[styles.tabLabel, activeTab === 'response' && styles.tabLabelActive]}>
              Response
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'request' && styles.tabItemActive]}
            onPress={() => setActiveTab('request')}
          >
            <Text style={[styles.tabLabel, activeTab === 'request' && styles.tabLabelActive]}>
              Request Body
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'headers' && styles.tabItemActive]}
            onPress={() => setActiveTab('headers')}
          >
            <Text style={[styles.tabLabel, activeTab === 'headers' && styles.tabLabelActive]}>
              Headers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'curl' && styles.tabItemActive]}
            onPress={() => setActiveTab('curl')}
          >
            <Text style={[styles.tabLabel, activeTab === 'curl' && styles.tabLabelActive]}>
              cURL
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.contentScroll}>
          {activeTab === 'response' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Response Payload</Text>
                {request.responseBody !== undefined ? (
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(
                        typeof request.responseBody === 'string'
                          ? request.responseBody
                          : JSON.stringify(request.responseBody, null, 2),
                        'resp'
                      )
                    }
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionBtnText}>
                      {copiedKey === 'resp' ? '✓ Copied' : 'Copy JSON'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {request.error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>Error:</Text>
                  <Text style={styles.errorDesc}>{request.error}</Text>
                </View>
              ) : null}

              {request.responseBody !== undefined ? (
                typeof request.responseBody === 'object' && request.responseBody !== null ? (
                  <View style={styles.treeBox}>
                    <JsonTree data={request.responseBody} initiallyExpanded={true} />
                  </View>
                ) : (
                  <Text style={styles.rawText} selectable>
                    {String(request.responseBody)}
                  </Text>
                )
              ) : request.isPending ? (
                <Text style={styles.emptyNote}>Request in progress...</Text>
              ) : (
                <Text style={styles.emptyNote}>(Empty Response Body)</Text>
              )}
            </View>
          )}

          {activeTab === 'request' && (
            <View style={styles.tabContent}>
              {queryParams.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Query Parameters</Text>
                  <View style={styles.tableBox}>
                    {queryParams.map(([k, v], idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <Text style={styles.tableKey}>{k}</Text>
                        <Text style={styles.tableVal} selectable>
                          {v}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Request Payload</Text>
                  {request.requestBody !== undefined ? (
                    <TouchableOpacity
                      onPress={() =>
                        copyToClipboard(
                          typeof request.requestBody === 'string'
                            ? request.requestBody
                            : JSON.stringify(request.requestBody, null, 2),
                          'req'
                        )
                      }
                      style={styles.actionBtn}
                    >
                      <Text style={styles.actionBtnText}>
                        {copiedKey === 'req' ? '✓ Copied' : 'Copy JSON'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {request.requestBody !== undefined ? (
                  typeof request.requestBody === 'object' && request.requestBody !== null ? (
                    <View style={styles.treeBox}>
                      <JsonTree data={request.requestBody} initiallyExpanded={true} />
                    </View>
                  ) : (
                    <Text style={styles.rawText} selectable>
                      {String(request.requestBody)}
                    </Text>
                  )
                ) : (
                  <Text style={styles.emptyNote}>(No request body provided)</Text>
                )}
              </View>
            </View>
          )}

          {activeTab === 'headers' && (
            <View style={styles.tabContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Request Headers</Text>
                <View style={styles.tableBox}>
                  {Object.entries(request.requestHeaders || {}).length > 0 ? (
                    Object.entries(request.requestHeaders).map(([k, v], idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <Text style={styles.tableKey}>{k}</Text>
                        <Text style={styles.tableVal} selectable>
                          {v}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyNote}>(No custom request headers)</Text>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Response Headers</Text>
                <View style={styles.tableBox}>
                  {Object.entries(request.responseHeaders || {}).length > 0 ? (
                    Object.entries(request.responseHeaders || {}).map(([k, v], idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <Text style={styles.tableKey}>{k}</Text>
                        <Text style={styles.tableVal} selectable>
                          {v}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyNote}>(No response headers recorded)</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {activeTab === 'curl' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>cURL Command</Text>
                <TouchableOpacity
                  onPress={() => copyToClipboard(generateCurl(), 'curl')}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>
                    {copiedKey === 'curl' ? '✓ Copied' : 'Copy cURL'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.curlBox}>
                <Text style={styles.curlText} selectable>
                  {generateCurl()}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.headerBg,
    },
    closeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    closeBtnText: {
      color: colors.sky,
      fontSize: 14,
      fontWeight: '600',
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    overrideBtn: {
      backgroundColor: colors.status.paused,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 6,
    },
    overrideBtnText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    overviewHeader: {
      padding: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    methodBadge: {
      backgroundColor: colors.headerBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    methodText: {
      color: colors.sky,
      fontSize: 12,
      fontWeight: '700',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    statusText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    clientBadge: {
      backgroundColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 4,
    },
    clientText: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: '600',
    },
    mockBadge: {
      backgroundColor: colors.status.paused,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 4,
    },
    mockText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    durationText: {
      color: colors.textDim,
      fontSize: 12,
      marginLeft: 'auto',
    },
    urlRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    urlText: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontFamily: 'monospace',
      lineHeight: 18,
    },
    miniCopyBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: colors.border,
      borderRadius: 4,
    },
    miniCopyText: {
      color: colors.textDim,
      fontSize: 11,
      fontWeight: '600',
    },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.headerBg,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: {
      borderBottomColor: colors.sky,
    },
    tabLabel: {
      color: colors.textDim,
      fontSize: 13,
      fontWeight: '600',
    },
    tabLabelActive: {
      color: colors.sky,
      fontWeight: '700',
    },
    contentScroll: {
      flex: 1,
      padding: 16,
    },
    tabContent: {
      gap: 16,
      paddingBottom: 40,
    },
    section: {
      gap: 8,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    actionBtn: {
      backgroundColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    actionBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    tableBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: 'hidden',
    },
    tableRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableKey: {
      width: 140,
      color: colors.sky,
      fontSize: 12,
      fontWeight: '600',
      fontFamily: 'monospace',
    },
    tableVal: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      fontFamily: 'monospace',
    },
    treeBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
    },
    rawText: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      color: colors.text,
      fontSize: 12,
      fontFamily: 'monospace',
    },
    curlBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
    },
    curlText: {
      color: colors.sky,
      fontSize: 12,
      fontFamily: 'monospace',
      lineHeight: 18,
    },
    errorBox: {
      backgroundColor: colors.status.error + '22',
      borderWidth: 1,
      borderColor: colors.status.error,
      borderRadius: 8,
      padding: 12,
      gap: 4,
    },
    errorTitle: {
      color: colors.status.error,
      fontSize: 13,
      fontWeight: '700',
    },
    errorDesc: {
      color: colors.text,
      fontSize: 12,
      fontFamily: 'monospace',
    },
    emptyNote: {
      color: colors.textDim,
      fontSize: 13,
      fontStyle: 'italic',
      padding: 8,
    },
  });
