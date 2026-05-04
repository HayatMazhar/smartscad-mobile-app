import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ThemedIcon from '../../../shared/components/ThemedIcon';
import type { SemanticIconName } from '../../../app/theme/semanticIcons';
import { useTheme } from '../../../app/theme/ThemeContext';

interface Props {
  icon?: SemanticIconName;
  title: string;
  message?: string;
  variant?: 'success' | 'info' | 'neutral';
  cardBg: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
}

/**
 * Friendly empty state for "all caught up" / "nothing here yet" cases.
 * Used inside the cockpit cards when the metric is at zero.
 */
const EmptyState: React.FC<Props> = ({
  icon = 'sparkles',
  title,
  message,
  variant = 'success',
  cardBg,
  borderRadius,
  borderWidth,
  borderColor,
}) => {
  const { colors, fontFamily } = useTheme();
  const accent = variant === 'success' ? colors.success : variant === 'info' ? colors.info : colors.textMuted;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderRadius,
          borderWidth,
          borderColor,
        },
      ]}
    >
      <View style={[styles.iconBubble, { backgroundColor: accent + '20' }]}>
        <ThemedIcon name={icon} size={28} color={accent} />
      </View>
      <Text style={[styles.title, { color: colors.text, fontFamily }]}>{title}</Text>
      {message && <Text style={[styles.message, { color: colors.textSecondary, fontFamily }]}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  message: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
});

export default EmptyState;
