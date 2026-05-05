import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../app/theme/ThemeContext';

export type ModernHeaderProps = NativeStackHeaderProps & {
  /** Override title (otherwise uses route options.title or route.name). */
  title?: string;
  /** Optional right-side slot (icon button / actions). */
  rightSlot?: React.ReactNode;
  /** Hide the back button even if canGoBack. */
  hideBack?: boolean;
};

/**
 * Compact, theme-aware navigation header used by every native stack.
 *
 * - 44dp content height (compact, iOS-native feel) + safe-area top inset
 * - Chevron-only back button (no parent screen label)
 * - Single-line title with proper typography
 * - Optional right slot for screen-level actions
 * - Identical look on iOS and Android
 */
const ModernHeader: React.FC<ModernHeaderProps> = ({
  navigation,
  route,
  options,
  back,
  title,
  rightSlot,
  hideBack,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const screenTitle =
    title ??
    (typeof options.title === 'string' && options.title.length > 0
      ? options.title
      : route.name);

  const canShowBack = !hideBack && !!back;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.divider,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.side}>
          {canShowBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => navigation.goBack()}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.backBtn,
                { backgroundColor: colors.greyCard },
              ]}
            >
              <Ionicons
                name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.titleWrap}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.title, { color: colors.text }]}
            allowFontScaling={false}
          >
            {screenTitle}
          </Text>
        </View>

        <View style={[styles.side, styles.sideRight]}>
          {rightSlot ?? null}
        </View>
      </View>
    </View>
  );
};

const SIDE_W = 56;

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  side: {
    width: SIDE_W,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
    includeFontPadding: false,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ModernHeader;
