import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📋',
  title,
  description,
  actionLabel,
  onAction,
  testID,
  style,
  titleStyle,
  descriptionStyle,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, style]} testID={testID}>
      <Text style={styles.icon} accessible={false}>
        {icon}
      </Text>
      <Text style={[styles.title, { color: colors.textMuted }, titleStyle]}>{title}</Text>
      {description ? (
        <Text style={[styles.desc, { color: colors.textSecondary }, descriptionStyle]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 15, marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  btn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default EmptyState;
