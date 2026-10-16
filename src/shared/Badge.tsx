import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { QueryStatusType } from '../types';

interface BadgeProps {
  status?: QueryStatusType | 'default' | 'error';
  label?: string | number;
  count?: number;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  status = 'default',
  label,
  count,
  size = 'md',
}) => {
  const { colors } = useTheme();
  const isSm = size === 'sm';
  const bg =
    status in colors.status
      ? colors.status[status as QueryStatusType]
      : status === 'error'
      ? colors.status.error
      : colors.card;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSm && styles.badgeSm]}>
      {count !== undefined ? (
        <Text style={[styles.countText, isSm && styles.countTextSm]}>{count}</Text>
      ) : (
        <Text style={[styles.text, isSm && styles.textSm]}>
          {label ?? status}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  text: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 8.5,
  },
  countText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  countTextSm: {
    fontSize: 8.5,
  },
});
