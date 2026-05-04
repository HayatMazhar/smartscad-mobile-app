import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, StatusBar, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface WelcomeSplashProps {
  onDone: () => void;
  durationMs?: number;
}

const MODULES: { ion: string; name: string }[] = [
  { ion: 'list-outline',           name: 'Tasks' },
  { ion: 'file-tray-full-outline', name: 'Sanadkom' },
  { ion: 'calendar-outline',       name: 'Leave' },
  { ion: 'time-outline',           name: 'Attendance' },
  { ion: 'stats-chart-outline',    name: 'KPIs' },
  { ion: 'construct-outline',      name: 'Projects' },
  { ion: 'bulb-outline',           name: 'IBDAA' },
  { ion: 'sparkles-outline',       name: 'AI Chat' },
];

// Government — Abu Dhabi blue brand surface. Navy primary, white text/marks,
// soft white-tinted glow accents.
const SCREEN_BG = '#023C69';
const NAVY = '#023C69';
const ACCENT_GLOW_OUTER = 'rgba(255,255,255,0.06)';
const ACCENT_GLOW_INNER = 'rgba(255,255,255,0.04)';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.78)';
const TEXT_MUTED = 'rgba(255,255,255,0.55)';
const CHIP_BG = 'rgba(255,255,255,0.08)';
const CHIP_BORDER = 'rgba(255,255,255,0.18)';
const CHIP_ICON = '#FFFFFF';

const WelcomeSplash: React.FC<WelcomeSplashProps> = ({ onDone, durationMs = 3500 }) => {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(14)).current;
  const modulesOpacity = useRef(new Animated.Value(0)).current;
  const modulesSlide = useRef(new Animated.Value(18)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(450),
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(titleSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(900),
        Animated.parallel([
          Animated.timing(modulesOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(modulesSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    ]);

    enter.start();

    const exitTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onDone());
    }, durationMs);

    return () => clearTimeout(exitTimer);
  }, [durationMs, logoOpacity, logoScale, modulesOpacity, modulesSlide, onDone, screenOpacity, titleOpacity, titleSlide]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]} pointerEvents="none">
      <StatusBar
        barStyle="light-content"
        backgroundColor={SCREEN_BG}
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />

      <Animated.View
        style={[
          styles.logoFrame,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Image
          source={require('../assets/sanadkom_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.copyWrap,
          { opacity: titleOpacity, transform: [{ translateY: titleSlide }] },
        ]}
      >
        <Text style={styles.subtitle}>by Statistics Centre — Abu Dhabi</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.modulesWrap,
          { opacity: modulesOpacity, transform: [{ translateY: modulesSlide }] },
        ]}
      >
        {MODULES.map((m) => (
          <View key={m.name} style={styles.modChip}>
            <Ionicons name={m.ion} size={13} color={CHIP_ICON} style={{ marginRight: 6 }} />
            <Text style={styles.modChipLabel}>{m.name}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Bottom Statistics Centre logo — same official mark, same position
          as the login screen footer. */}
      <Animated.View
        style={[
          styles.bottomBrand,
          { opacity: modulesOpacity },
        ]}
      >
        <Image
          // 800×320 high-res white mark — designed for dark backgrounds.
          // Stays crisp at any DPI thanks to the 2x source resolution.
          source={require('../assets/scad-logo-white.png')}
          style={styles.bottomLogo}
          resizeMode="contain"
        />
        <Text style={styles.versionTag}>v1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SCREEN_BG,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  glowOuter: {
    position: 'absolute',
    width: 540,
    height: 540,
    borderRadius: 270,
    backgroundColor: ACCENT_GLOW_OUTER,
    top: '8%',
  },
  glowInner: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: ACCENT_GLOW_INNER,
    top: '24%',
  },
  logoFrame: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 22,
  },
  logo: {
    width: 220,
    height: 84,
  },
  copyWrap: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  modulesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 320,
  },
  modChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CHIP_BG,
    borderWidth: 1,
    borderColor: CHIP_BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  bottomBrand: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomLogo: {
    width: 150,
    height: 60,
  },
  versionTag: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_MUTED,
    letterSpacing: 0.4,
  },
});

export default WelcomeSplash;
