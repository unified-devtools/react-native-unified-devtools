import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

interface MetricTileProps {
  icon: string;
  label: string;
  value: string;
  subtext: string;
  status?: 'pass' | 'warning' | 'critical';
}

export const MetricTile: React.FC<MetricTileProps> = ({
  icon,
  label,
  value,
  subtext,
  status = 'pass',
}) => {
  const { colors } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'pass':
        return colors.status.fresh;
      case 'warning':
        return colors.status.stale;
      case 'critical':
        return colors.status.error;
      default:
        return colors.text;
    }
  };

  const statusColor = getStatusColor();

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.value, { color: statusColor }]}>{value}</Text>
      <Text style={[styles.subtext, { color: colors.textMuted }]} numberOfLines={1}>
        {subtext}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '46%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    margin: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  subtext: {
    fontSize: 11,
  },
});
