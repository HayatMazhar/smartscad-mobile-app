import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
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

const isIOS = Platform.OS === 'ios';

/**
 * Theme-aware navigation header used by every native stack.
 *
 * Android — flat compact bar (48pt content, hairline divider, 17pt centered
 * title, circular surface chevron back). Material-friendly, untouched.
 *
 * iOS — modern compact custom variant:
 *   - 52pt content height
 *   - Translucent BlurView background (chrome material) instead of an
 *     opaque surface; gives the header an iOS-native frosted feel without
 *     introducing scroll-collapse animations.
 *   - 19pt bold title with a tight letter-spacing (SF Pro looks crisp
 *     when slightly tracked tight).
 *   - 38pt rounded-square back button with a soft shadow + brand-tinted
 *     chevron — feels like a custom control, not the system default.
 *   - No bottom hairline; the blur + shadow create depth instead.
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
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const screenTitle =
    title ??
    (typeof options.title === 'string' && options.title.length > 0
      ? options.title
      : route.name);

  const canShowBack = !hideBack && !!back;

  if (isIOS) {
    return (
      <View
        style={[
          stylesIOS.wrap,
          {
            paddingTop: insets.top,
            shadowColor: isDark ? '#000' : '#0A1F35',
          },
        ]}
      >
        <BlurView
          intensity={70}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(20,22,26,0.55)'
                : 'rgba(255,255,255,0.55)',
            },
          ]}
        />
        <View style={stylesIOS.row}>
          <View style={stylesIOS.side}>
            {canShowBack ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  stylesIOS.backBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(10,31,53,0.06)',
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(10,31,53,0.06)',
                  },
                ]}
              >
                <Ionicons
                  name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={stylesIOS.titleWrap}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[stylesIOS.title, { color: colors.text }]}
              allowFontScaling={false}
            >
              {screenTitle}
            </Text>
          </View>

          <View style={[stylesIOS.side, stylesIOS.sideRight]}>
            {rightSlot ?? null}
          </View>
        </View>
      </View>
    );
  }

  // Android — original compact flat header.
  return (
    <View
      style={[
        stylesAndroid.wrap,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.divider,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={stylesAndroid.row}>
        <View style={stylesAndroid.side}>
          {canShowBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => navigation.goBack()}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[stylesAndroid.backBtn, { backgroundColor: colors.greyCard }]}
            >
              <Ionicons
                name={I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'}
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={stylesAndroid.titleWrap}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[stylesAndroid.title, { color: colors.text }]}
            allowFontScaling={false}
          >
            {screenTitle}
          </Text>
        </View>

        <View style={[stylesAndroid.side, stylesAndroid.sideRight]}>
          {rightSlot ?? null}
        </View>
      </View>
    </View>
  );
};

const SIDE_W_IOS = 56;
const SIDE_W_ANDROID = 56;

const stylesIOS = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  row: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  side: {
    width: SIDE_W_IOS,
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
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
    includeFontPadding: false,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const stylesAndroid = StyleSheet.create({
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
    width: SIDE_W_ANDROID,
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
