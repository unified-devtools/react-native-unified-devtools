import React, { useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type { HttpMethod, NetworkMockRule, NetworkOverrideMode } from '../../types';
import { networkManager } from './networkInterceptor';

interface MockRulesModalProps {
  visible: boolean;
  onClose: () => void;
  initialRuleToEdit?: Partial<NetworkMockRule> | null;
}

const METHODS: HttpMethod[] = ['ANY', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const STATUS_PRESETS: { status: number; label: string }[] = [
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

export const MockRulesModal: React.FC<MockRulesModalProps> = ({
  visible,
  onClose,
  initialRuleToEdit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [rules, setRules] = useState<NetworkMockRule[]>(networkManager.getRules());
  const [isCreating, setIsCreating] = useState(Boolean(initialRuleToEdit));

  // Form State
  const [editingId, setEditingId] = useState<string | null>(initialRuleToEdit?.id || null);
  const [pattern, setPattern] = useState(initialRuleToEdit?.urlPattern || '');
  const [method, setMethod] = useState<HttpMethod>(initialRuleToEdit?.method || 'ANY');
  const [mode, setMode] = useState<NetworkOverrideMode>(initialRuleToEdit?.mode || 'response');
  const [status, setStatus] = useState<number>(initialRuleToEdit?.status || 200);
  const [delayMs, setDelayMs] = useState<number>(initialRuleToEdit?.delayMs || 0);
  const [responseBody, setResponseBody] = useState<string>(
    initialRuleToEdit?.responseBody || JSON.stringify({ message: 'Mocked response' }, null, 2)
  );

  React.useEffect(() => {
    if (initialRuleToEdit) {
      setPattern(initialRuleToEdit.urlPattern || '');
      setMethod(initialRuleToEdit.method || 'ANY');
      setMode(initialRuleToEdit.mode || 'response');
      setStatus(initialRuleToEdit.status || 200);
      setDelayMs(initialRuleToEdit.delayMs || 0);
      setResponseBody(
        initialRuleToEdit.responseBody ||
          JSON.stringify({ message: 'Mocked response' }, null, 2)
      );
      setEditingId(initialRuleToEdit.id || null);
      setIsCreating(true);
    }
  }, [initialRuleToEdit]);

  React.useEffect(() => {
    const unsub = networkManager.subscribeRules((newRules) => {
      setRules(newRules);
    });
    return unsub;
  }, []);

  const handleToggleRule = (id: string) => {
    networkManager.toggleRule(id);
  };

  const handleDeleteRule = (id: string) => {
    networkManager.deleteRule(id);
  };

  const handleEditRule = (rule: NetworkMockRule) => {
    setEditingId(rule.id);
    setPattern(rule.urlPattern);
    setMethod(rule.method);
    setMode(rule.mode);
    setStatus(rule.status);
    setDelayMs(rule.delayMs || 0);
    setResponseBody(rule.responseBody);
    setIsCreating(true);
  };

  const handleBeautifyJson = () => {
    try {
      const parsed = JSON.parse(responseBody);
      setResponseBody(JSON.stringify(parsed, null, 2));
    } catch {
      // invalid JSON, ignore
    }
  };

  const handleSave = () => {
    if (!pattern.trim()) return;

    if (editingId) {
      networkManager.updateRule(editingId, {
        urlPattern: pattern.trim(),
        method,
        mode,
        status,
        delayMs,
        responseBody,
      });
    } else {
      networkManager.addRule({
        enabled: true,
        urlPattern: pattern.trim(),
        method,
        mode,
        status,
        delayMs,
        responseBody,
      });
    }

    resetForm();
    setIsCreating(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setPattern('');
    setMethod('ANY');
    setMode('response');
    setStatus(200);
    setDelayMs(0);
    setResponseBody(JSON.stringify({ message: 'Mocked response' }, null, 2));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>⚡ Network Mock</Text>
          <TouchableOpacity
            onPress={() => {
              if (isCreating) {
                resetForm();
                setIsCreating(false);
              } else {
                resetForm();
                setIsCreating(true);
              }
            }}
            style={styles.actionBtn}
          >
            <Text style={styles.actionBtnText}>{isCreating ? 'View List' : '+ New Rule'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {isCreating ? (
            /* CREATE / EDIT RULE FORM */
            <View style={styles.formContainer}>
              <Text style={styles.formSectionTitle}>
                {editingId ? 'Edit Mock Rule' : 'Create New Mock Rule'}
              </Text>
              <Text style={styles.formHelpText}>
                Intercepts matching fetch & axios requests and returns your mock payload.
              </Text>

              {/* URL Pattern */}
              <Text style={styles.inputLabel}>URL Pattern (wildcard * supported):</Text>
              <TextInput
                style={styles.textInput}
                value={pattern}
                onChangeText={setPattern}
                placeholder="e.g. */api/v1/users* or /users"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Method Selector */}
              <Text style={styles.inputLabel}>HTTP Method:</Text>
              <View style={styles.rowWrap}>
                {METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pill, method === m && styles.pillActive]}
                    onPress={() => setMethod(m)}
                  >
                    <Text style={[styles.pillText, method === m && styles.pillTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Mode Selector */}
              <Text style={styles.inputLabel}>Mock Behavior Mode:</Text>
              <View style={styles.rowWrap}>
                <TouchableOpacity
                  style={[styles.pill, mode === 'response' && styles.pillActive]}
                  onPress={() => setMode('response')}
                >
                  <Text style={[styles.pillText, mode === 'response' && styles.pillTextActive]}>
                    Custom Response
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, mode === 'offline' && styles.pillActive]}
                  onPress={() => setMode('offline')}
                >
                  <Text style={[styles.pillText, mode === 'offline' && styles.pillTextActive]}>
                    📵 Offline Network Error
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pill, mode === 'timeout' && styles.pillActive]}
                  onPress={() => setMode('timeout')}
                >
                  <Text style={[styles.pillText, mode === 'timeout' && styles.pillTextActive]}>
                    ⏳ Timeout Error
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status Code (Only for Custom Response) */}
              {mode === 'response' && (
                <>
                  <Text style={styles.inputLabel}>Response Status Code:</Text>
                  <View style={styles.rowWrap}>
                    {STATUS_PRESETS.map((p) => (
                      <TouchableOpacity
                        key={p.status}
                        style={[
                          styles.statusPill,
                          status === p.status && {
                            backgroundColor: p.status < 400 ? colors.status.fresh : colors.status.error,
                            borderColor: p.status < 400 ? colors.status.fresh : colors.status.error,
                          },
                        ]}
                        onPress={() => setStatus(p.status)}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            status === p.status && { color: '#fff', fontWeight: '700' },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Delay Latency */}
              <Text style={styles.inputLabel}>Artificial Latency Delay:</Text>
              <View style={styles.rowWrap}>
                {DELAY_PRESETS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.pill, delayMs === d && styles.pillActive]}
                    onPress={() => setDelayMs(d)}
                  >
                    <Text style={[styles.pillText, delayMs === d && styles.pillTextActive]}>
                      {d === 0 ? 'No Delay' : `+${d}ms`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Response Body Editor */}
              {mode === 'response' && (
                <>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Mock Response Body (JSON/Text):</Text>
                    <TouchableOpacity onPress={handleBeautifyJson} style={styles.beautifyBtn}>
                      <Text style={styles.beautifyBtnText}>Format JSON</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.codeArea]}
                    value={responseBody}
                    onChangeText={setResponseBody}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              )}

              {/* Save Button */}
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>
                  {editingId ? '✓ Update Mock Rule' : '✓ Save & Arm Mock Rule'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* RULES LIST */
            <View style={styles.listContainer}>
              {rules.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🧪</Text>
                  <Text style={styles.emptyTitle}>No Mock Override Rules</Text>
                  <Text style={styles.emptySub}>
                    Create rules to override API responses, test error states (401, 500), simulate offline modes, or test artificial delays.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsCreating(true)}
                    style={styles.emptyAddBtn}
                  >
                    <Text style={styles.emptyAddBtnText}>+ Create Your First Mock</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                rules.map((rule) => (
                  <View key={rule.id} style={styles.ruleCard}>
                    <View style={styles.ruleTopRow}>
                      <View style={styles.ruleBadgeRow}>
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
                          <View style={styles.delayBadge}>
                            <Text style={styles.delayText}>+{rule.delayMs}ms</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Enable / Disable Switch */}
                      <TouchableOpacity
                        onPress={() => handleToggleRule(rule.id)}
                        style={[
                          styles.toggleSwitch,
                          rule.enabled ? styles.toggleOn : styles.toggleOff,
                        ]}
                      >
                        <Text style={styles.toggleText}>{rule.enabled ? 'ON' : 'OFF'}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.rulePattern}>{rule.urlPattern}</Text>

                    <View style={styles.ruleBottomRow}>
                      <TouchableOpacity
                        onPress={() => handleEditRule(rule)}
                        style={styles.ruleActionBtn}
                      >
                        <Text style={styles.ruleActionText}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteRule(rule.id)}
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.headerBg,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    closeBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    closeText: {
      color: colors.sky,
      fontSize: 14,
      fontWeight: '600',
    },
    actionBtn: {
      backgroundColor: colors.sky,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    actionBtnText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    formContainer: {
      gap: 12,
      paddingBottom: 40,
    },
    formSectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    formHelpText: {
      color: colors.textDim,
      fontSize: 13,
      marginBottom: 6,
    },
    inputLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 6,
    },
    textInput: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    codeArea: {
      minHeight: 140,
      fontFamily: 'monospace',
      textAlignVertical: 'top',
      fontSize: 12,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    beautifyBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    beautifyBtnText: {
      color: colors.sky,
      fontSize: 12,
      fontWeight: '600',
    },
    rowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.sky,
      borderColor: colors.sky,
    },
    pillText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: '600',
    },
    pillTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusPillText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '500',
    },
    saveBtn: {
      backgroundColor: colors.sky,
      paddingVertical: 13,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 14,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    listContainer: {
      gap: 12,
      paddingBottom: 40,
    },
    ruleCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      gap: 8,
    },
    ruleTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ruleBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ruleMethodBadge: {
      backgroundColor: colors.headerBg,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    ruleMethodText: {
      color: colors.sky,
      fontSize: 11,
      fontWeight: '700',
    },
    ruleStatusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    ruleStatusText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    delayBadge: {
      backgroundColor: colors.border,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    delayText: {
      color: colors.textDim,
      fontSize: 11,
    },
    toggleSwitch: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    toggleOn: {
      backgroundColor: colors.status.fresh,
    },
    toggleOff: {
      backgroundColor: colors.status.inactive,
    },
    toggleText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    rulePattern: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      fontFamily: 'monospace',
    },
    ruleBottomRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      marginTop: 2,
    },
    ruleActionBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    ruleActionText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: '600',
    },
    ruleDeleteBtn: {
      marginLeft: 6,
    },
    ruleDeleteText: {
      color: colors.status.error,
    },
    emptyContainer: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    emptyIcon: {
      fontSize: 40,
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
    },
    emptyAddBtn: {
      backgroundColor: colors.sky,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      marginTop: 12,
    },
    emptyAddBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });
