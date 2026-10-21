import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import type { LighthouseScoreGrade } from '../types';

interface ScoreGaugeProps {
  score: number;
  grade: LighthouseScoreGrade;
  gradeLabel: string;
  summary: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  grade,
  gradeLabel,
  summary,
}) => {
  const { colors } = useTheme();

  const getScoreColor = () => {
    switch (grade) {
      case 'fast':
        return colors.status.fresh; // Emerald / Green
      case 'average':
        return colors.status.stale; // Amber / Orange
      case 'slow':
        return colors.status.error; // Red
      default:
        return colors.status.fresh;
    }
  };

  const scoreColor = getScoreColor();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.circleBadge, { borderColor: scoreColor, backgroundColor: colors.bg }]}>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.gradeText, { color: scoreColor }]}>{gradeLabel} ({score}/100)</Text>
        <Text style={[styles.summaryText, { color: colors.textDim }]}>{summary}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  circleBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12.5,
    lineHeight: 17,
  },
});
