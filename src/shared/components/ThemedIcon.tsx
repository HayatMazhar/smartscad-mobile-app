import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../app/theme/ThemeContext';
import { SEMANTIC_ICONS, type SemanticIconName } from '../../app/theme/semanticIcons';
import type { IconPresentation } from '../../app/theme/themeSkins';

export type ThemedIconProps = {
  name: SemanticIconName;
  size?: number;
  color?: string;
  /** When true, use filled variant if available (active tab, selected row). */
  filled?: boolean;
  style?: StyleProp<TextStyle>;
  /** For rare cases (e.g. tests) without provider edge cases. */
  forcePresentation?: IconPresentation;
};

const ThemedIcon: React.FC<ThemedIconProps> = ({
  name,
  size = 22,
  color,
  filled = false,
  style,
  forcePresentation,
}) => {
  const { skin, colors } = useTheme();
  const mode = forcePresentation ?? skin.iconPresentation;
  const spec = SEMANTIC_ICONS[name];
  if (!spec) {
    return <Text style={[{ fontSize: size }, style]}>?</Text>;
  }
  const c = color ?? colors.text;
  if (mode === 'emoji') {
    return <Text style={[{ fontSize: size, lineHeight: Math.round(size * 1.12) }, style]}>{spec.emoji}</Text>;
  }
  const ion = filled && spec.ion.filled ? spec.ion.filled : spec.ion.outline;
  return <Ionicons name={ion} size={size} color={c} style={style} />;
};

export default ThemedIcon;
