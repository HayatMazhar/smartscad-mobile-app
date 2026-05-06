import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';

/**
 * Drop-in replacement for `Pressable` that animates a subtle scale-down on
 * press. Gives buttons and cards the iOS-native "feels alive" tactility
 * without needing reanimated worklets.
 *
 * Defaults are tuned per platform:
 *   - iOS:    scale to 0.96, 90 ms in / 140 ms out (slightly springy out).
 *   - Android: scale to 0.985 (very subtle so it doesn't fight with native ripple).
 *
 * Use as a one-line swap:
 *
 * ```tsx
 * <PressableScale onPress={...} style={styles.card}>
 *   <Card />
 * </PressableScale>
 * ```
 *
 * If `onLongPress` is set, the press-in animation still fires so the user
 * gets immediate feedback that their long press was registered.
 */
type Props = Omit<PressableProps, 'style'> & {
  /** Same as Pressable's style — supports static or function form. */
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Override the depressed scale value. Default: 0.96 iOS / 0.985 Android. */
  scaleTo?: number;
  /** Disable the animation entirely (still passes through Pressable behaviour). */
  disableScale?: boolean;
};

const isIOS = Platform.OS === 'ios';

const PressableScale: React.FC<Props> = ({
  style,
  scaleTo,
  disableScale = false,
  onPressIn,
  onPressOut,
  children,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const target = scaleTo ?? (isIOS ? 0.96 : 0.985);

  const handlePressIn = (e: any) => {
    if (!disableScale) {
      Animated.timing(scale, {
        toValue: target,
        duration: 90,
        useNativeDriver: true,
      }).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (!disableScale) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: isIOS ? 6 : 0,
      }).start();
    }
    onPressOut?.(e);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style as any}
      {...rest}
    >
      {(state) => (
        <Animated.View
          style={{ transform: [{ scale }] }}
          pointerEvents="box-none"
        >
          {typeof children === 'function' ? (children as any)(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
};

export default PressableScale;
