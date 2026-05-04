import React from 'react';
import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../app/theme/ThemeContext';
import SkeletonBlock from '../../../shared/components/skeleton/SkeletonBlock';
import { styles as dashStyles } from '../screens/myDashboardScreen.styles';
import { Card } from '../screens/MyDashboardPrimitives';

export type MyDashboardSkeletonProps = {
  isManager: boolean;
};

const DonutSkeleton: React.FC<{ size: number }> = ({ size }) => (
  <SkeletonBlock width={size} height={size} borderRadius={size / 2} />
);

const YearBadgeSkeletons: React.FC = () => (
  <View style={dashStyles.yearBadgeRow}>
    <SkeletonBlock width={64} height={32} borderRadius={999} />
    <SkeletonBlock width={64} height={32} borderRadius={999} />
  </View>
);

const PillStripSkeleton: React.FC<{ borderColor: string }> = ({ borderColor }) => (
  <View style={[dashStyles.pillStrip, { borderTopColor: borderColor }]}>
    <SkeletonBlock width="48%" height={62} borderRadius={12} />
    <SkeletonBlock width="48%" height={62} borderRadius={12} />
    <SkeletonBlock width="48%" height={62} borderRadius={12} />
    <SkeletonBlock width="48%" height={62} borderRadius={12} />
  </View>
);

const SectionHeaderSkeleton: React.FC = () => (
  <View style={dashStyles.sectionHeader}>
    <SkeletonBlock width={4} height={24} borderRadius={4} />
    <SkeletonBlock width={32} height={32} borderRadius={10} style={{ marginStart: 10 }} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <SkeletonBlock width="72%" height={16} borderRadius={6} />
      <SkeletonBlock width="90%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  </View>
);

const ChartCardSkeleton: React.FC = () => (
  <Card>
    <SectionHeaderSkeleton />
    <SkeletonBlock width="100%" height={140} borderRadius={12} />
    <SkeletonBlock width={88} height={12} borderRadius={4} style={{ marginTop: 18, marginBottom: 8 }} />
    <SkeletonBlock width="100%" height={96} borderRadius={12} />
    <View style={[dashStyles.legendRow, { marginTop: 10 }]}>
      <SkeletonBlock width={72} height={14} borderRadius={4} />
      <SkeletonBlock width={72} height={14} borderRadius={4} />
    </View>
  </Card>
);

/** Mirrors My Dashboard layout (worker vs manager hero + first cards). */
const MyDashboardSkeleton: React.FC<MyDashboardSkeletonProps> = ({ isManager }) => {
  const { colors, shadows } = useTheme();
  const heroGradient: [string, string, ...string[]] = [colors.secondary, colors.primary];
  const donutSize = isManager ? 108 : 120;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={isManager ? dashStyles.heroTeam : dashStyles.heroWorker}
      >
        {isManager ? (
          <View>
            <SkeletonBlock width="55%" height={18} borderRadius={6} />
            <SkeletonBlock width="85%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        ) : (
          <View style={dashStyles.heroRow}>
            <View style={{ flex: 1 }}>
              <SkeletonBlock width={96} height={10} borderRadius={4} />
              <SkeletonBlock width="78%" height={22} borderRadius={8} style={{ marginTop: 8 }} />
              <SkeletonBlock width="92%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          </View>
        )}
      </LinearGradient>

      <YearBadgeSkeletons />

      {isManager ? (
        <>
          <Card style={{ marginTop: 10 }}>
            <SectionHeaderSkeleton />
            <View style={dashStyles.heroCardRow}>
              <DonutSkeleton size={donutSize} />
              <View style={dashStyles.heroCardSide}>
                <SkeletonBlock width="62%" height={12} borderRadius={4} />
                <SkeletonBlock width={88} height={36} borderRadius={8} style={{ marginTop: 8 }} />
                <View style={[dashStyles.heroCardSplit, { marginTop: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <SkeletonBlock width={40} height={18} borderRadius={4} />
                    <SkeletonBlock width="70%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                  </View>
                  <View style={[dashStyles.heroCardSplitDivider, { backgroundColor: colors.divider }]} />
                  <View style={{ flex: 1 }}>
                    <SkeletonBlock width={40} height={18} borderRadius={4} />
                    <SkeletonBlock width="70%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                  </View>
                </View>
              </View>
            </View>
            <PillStripSkeleton borderColor={colors.divider} />
          </Card>
          <ChartCardSkeleton />
        </>
      ) : (
        <>
          <View
            style={[
              dashStyles.heroCard,
              { marginTop: 12 },
              shadows.card,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <View style={dashStyles.heroCardRow}>
              <DonutSkeleton size={donutSize} />
              <View style={dashStyles.heroCardSide}>
                <SkeletonBlock width="58%" height={12} borderRadius={4} />
                <SkeletonBlock width={96} height={36} borderRadius={8} style={{ marginTop: 8 }} />
                <View style={[dashStyles.heroCardSplit, { marginTop: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <SkeletonBlock width={44} height={18} borderRadius={4} />
                    <SkeletonBlock width="75%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                  </View>
                  <View style={[dashStyles.heroCardSplitDivider, { backgroundColor: colors.divider }]} />
                  <View style={{ flex: 1 }}>
                    <SkeletonBlock width={44} height={18} borderRadius={4} />
                    <SkeletonBlock width="75%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
                  </View>
                </View>
              </View>
            </View>
            <PillStripSkeleton borderColor={colors.divider} />
          </View>
          <ChartCardSkeleton />
        </>
      )}
    </ScrollView>
  );
};

export default MyDashboardSkeleton;
