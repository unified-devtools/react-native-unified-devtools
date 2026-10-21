import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import type { AuditDiagnostic } from '../types';

interface DiagnosticsListProps {
  diagnostics: AuditDiagnostic[];
}

export const DiagnosticsList: React.FC<DiagnosticsListProps> = ({ diagnostics }) => {
  const { colors } = useTheme();

  const getBulletIcon = (severity: AuditDiagnostic['severity']) => {
    switch (severity) {
      case 'pass':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'critical':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textDim }]}>
        💡 DIAGNOSTICS & RECOMMENDATIONS
      </Text>
      <View style={[styles.listWrapper, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        {diagnostics.map((item) => (
          <View
            key={item.id}
            style={[styles.itemRow, { borderBottomColor: colors.borderSubtle }]}
          >
            <Text style={styles.bullet}>{getBulletIcon(item.severity)}</Text>
            <View style={styles.content}>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.description, { color: colors.textMuted }]}>
                {item.description}
              </Text>
              {item.suggestion && (
                <Text style={[styles.suggestion, { color: colors.accent }]}>
                  👉 {item.suggestion}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  listWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 12,
    marginRight: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  suggestion: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
