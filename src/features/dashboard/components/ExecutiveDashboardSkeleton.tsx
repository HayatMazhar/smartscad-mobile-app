import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../app/theme/ThemeContext';
import SkeletonBlock from '../../../shared/components/skeleton/SkeletonBlock';

const execStyles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 64,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start' },
  card: {
    marginHorizontal: 14,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
  },
  sectionTitle: { marginBottom: 12 },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  donutCell: { alignItems: 'center', flex: 1 },
  finRow: { marginTop: 10 },
});

const GAUGE = 76;

/** Mirrors Executive Dashboard hero, overlapping strategic card, and financial block. */
const ExecutiveDashboardSkeleton: React.FC = () => {
  const { colors, shadows } = useTheme();
  const heroGradient: [string, string, ...string[]] = [colors.secondary, colors.primary];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={execStyles.hero}
      >
        <View style={execStyles.heroRow}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width={140} height={12} borderRadius={4} />
            <SkeletonBlock width="88%" height={26} borderRadius={8} style={{ marginTop: 10 }} />
            <SkeletonBlock width="100%" height={14} borderRadius={4} style={{ marginTop: 10 }} />
            <SkeletonBlock width="72%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
            <SkeletonBlock width="64%" height={28} borderRadius={999} style={{ marginTop: 12 }} />
          </View>
          <SkeletonBlock width={72} height={56} borderRadius={14} style={{ marginStart: 10 }} />
        </View>
      </LinearGradient>

      <View style={[execStyles.card, shadows.card, { backgroundColor: colors.card, marginTop: -28 }]}>
        <View style={execStyles.sectionTitle}>
          <SkeletonBlock width="58%" height={18} borderRadius={6} />
        </View>
        <View style={execStyles.gaugeRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={execStyles.donutCell}>
              <SkeletonBlock width={GAUGE} height={GAUGE} borderRadius={GAUGE / 2} />
              <SkeletonBlock width="80%" height={11} borderRadius={4} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>
      </View>

      <View style={[execStyles.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={execStyles.sectionTitle}>
          <SkeletonBlock width="52%" height={18} borderRadius={6} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <SkeletonBlock width="30%" height={36} borderRadius={12} />
          <SkeletonBlock width="30%" height={36} borderRadius={12} />
          <SkeletonBlock width="30%" height={36} borderRadius={12} />
        </View>
        {[0, 1, 2].map((i) => (
          <View key={i} style={execStyles.finRow}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <SkeletonBlock width="62%" height={14} borderRadius={4} />
              <SkeletonBlock width={48} height={14} borderRadius={4} />
            </View>
            <SkeletonBlock width="100%" height={8} borderRadius={4} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <SkeletonBlock width="38%" height={11} borderRadius={4} />
              <SkeletonBlock width="38%" height={11} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default ExecutiveDashboardSkeleton;
