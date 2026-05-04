import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { useGetStrategiesQuery, useGetObjectivesQuery } from '../services/pmsApi';
import QueryStates from '../../../shared/components/QueryStates';
import type { PmsObjective, PmsStrategy } from '../types';

const PmsStrategyDetailScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows } = useTheme();
  const strategyId: number | undefined = route?.params?.strategyId;

  const stratQ = useGetStrategiesQuery();
  const objQ = useGetObjectivesQuery(strategyId);

  const strategy = useMemo(() => {
    const all = asArray<PmsStrategy>(stratQ.data);
    return strategyId ? all.find((s) => s.id === strategyId || s.strategyId === strategyId) : all[0];
  }, [stratQ.data, strategyId]);

  const objectives = useMemo(() => asArray<PmsObjective>(objQ.data), [objQ.data]);

  const refreshAll = () => {
    stratQ.refetch();
    objQ.refetch();
  };

  const name = strategy
    ? (isAr ? (strategy.strategyNameAr || strategy.strategyName) : (strategy.strategyName || strategy.strategyNameAr))
    : '';
  const vision = strategy ? (isAr ? (strategy.visionAr || strategy.vision) : (strategy.vision || strategy.visionAr)) : undefined;
  const mission = strategy ? (isAr ? (strategy.missionAr || strategy.mission) : (strategy.mission || strategy.missionAr)) : undefined;
  const values = strategy ? (isAr ? (strategy.valuesAr || strategy.values) : (strategy.values || strategy.valuesAr)) : undefined;
  const ownerName = strategy ? (isAr ? (strategy.ownerNameAr || strategy.ownerName) : (strategy.ownerName || strategy.ownerNameAr)) : undefined;

  return (
    <QueryStates
      loading={stratQ.isLoading && !strategy}
      apiError={!!(stratQ.isError && !strategy)}
      error={stratQ.error}
      isRefreshing={stratQ.isFetching || objQ.isFetching}
      onRetry={() => void refreshAll()}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {!strategy ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('pms.noStrategy', 'Strategy not found')}
          </Text>
        </View>
      ) : (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <ThemedRefreshControl
          isFetching={stratQ.isFetching || objQ.isFetching}
          isLoading={stratQ.isLoading || objQ.isLoading}
          onRefresh={refreshAll}
        />
      }
    >
      {/* Hero */}
      <View style={[styles.hero, shadows.card, { backgroundColor: colors.secondary }]}>
        <Text style={styles.heroLabel}>{t('pms.strategy', 'Strategy')}</Text>
        <Text style={styles.heroName}>{name}</Text>
        <Text style={styles.heroPeriod}>{strategy.period}</Text>
      </View>

      {/* Counts */}
      <View style={styles.statsRow}>
        <StatTile label={t('pms.objectives', 'Objectives')} value={strategy.objectiveCount} icon="🎯" colors={colors} shadows={shadows} />
        <StatTile label={t('pms.services', 'Services')} value={strategy.serviceCount} icon="🛠️" colors={colors} shadows={shadows} />
        <StatTile label={t('pms.programs', 'Programs')} value={strategy.programCount} icon="📦" colors={colors} shadows={shadows} />
        <StatTile label={t('pms.kpis', 'KPIs')} value={strategy.kpiCount} icon="📈" colors={colors} shadows={shadows} />
      </View>

      {/* Mission / vision / values */}
      {!!vision && (
        <Section title={t('pms.vision', 'Vision')} body={vision} colors={colors} shadows={shadows} icon="🌟" />
      )}
      {!!mission && (
        <Section title={t('pms.mission', 'Mission')} body={mission} colors={colors} shadows={shadows} icon="🚀" />
      )}
      {!!values && (
        <Section title={t('pms.values', 'Values')} body={values} colors={colors} shadows={shadows} icon="💎" />
      )}

      {/* Owner */}
      {!!ownerName && (
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.owner', 'Owner')}</Text>
          <Text style={[styles.ownerName, { color: colors.text }]}>👤 {ownerName}</Text>
        </View>
      )}

      {/* Objectives header + list */}
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('pms.objectives', 'Objectives')}
        </Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{objectives.length}</Text>
      </View>

      {objQ.isLoading ? (
        <View style={styles.center}><ThemedActivityIndicator color={colors.primary} /></View>
      ) : objectives.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('pms.noObjectives', 'No objectives match this filter')}
          </Text>
        </View>
      ) : (
        objectives.map((obj) => {
          const objName = isAr ? (obj.objectiveNameAr || obj.objectiveName) : (obj.objectiveName || obj.objectiveNameAr);
          const priority = isAr ? (obj.priorityNameAr || obj.priorityName) : (obj.priorityName || obj.priorityNameAr);
          return (
            <TouchableOpacity
              key={obj.id}
              activeOpacity={0.85}
              style={[styles.objCard, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('PmsObjectiveDetail', { objectiveId: obj.id, name: objName })}
            >
              <View style={styles.objTopRow}>
                <Text style={[styles.objCode, { color: colors.textMuted }]} numberOfLines={1}>{obj.code}</Text>
                {!!priority && (
                  <View style={[styles.priorityChip, { backgroundColor: `${colors.primary}18` }]}>
                    <Text style={[styles.priorityText, { color: colors.primary }]} numberOfLines={1}>
                      {priority}
                    </Text>
                  </View>
                )}
                {obj.isMine === 1 && (
                  <View style={[styles.mineChip, { backgroundColor: `${colors.success}18` }]}>
                    <Text style={[styles.mineText, { color: colors.success }]}>{t('pms.mine', 'Mine')}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.objName, { color: colors.text }]} numberOfLines={2}>{objName}</Text>
              <View style={styles.objMetaRow}>
                <MiniMeta value={obj.serviceCount} label={t('pms.services', 'Services')} colors={colors} />
                <MiniMeta value={obj.programCount} label={t('pms.programs', 'Programs')} colors={colors} />
                <MiniMeta value={obj.kpiCount} label={t('pms.kpis', 'KPIs')} colors={colors} />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
      )}
    </QueryStates>
  );
};

const StatTile: React.FC<{ icon: string; label: string; value: number; colors: any; shadows: any }> = ({
  icon, label, value, colors, shadows,
}) => (
  <View style={[styles.statTile, shadows.card, { backgroundColor: colors.card }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
  </View>
);

const Section: React.FC<{ title: string; body: string; icon: string; colors: any; shadows: any }> = ({
  title, body, icon, colors, shadows,
}) => (
  <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEmoji}>{icon}</Text>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
    </View>
    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{body}</Text>
  </View>
);

const MiniMeta: React.FC<{ value: number; label: string; colors: any }> = ({ value, label, colors }) => (
  <View style={styles.miniMeta}>
    <Text style={[styles.miniMetaValue, { color: colors.primary }]}>{value}</Text>
    <Text style={[styles.miniMetaLabel, { color: colors.textMuted }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  hero: { borderRadius: 14, padding: 18 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroName: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginTop: 4, lineHeight: 24 },
  heroPeriod: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: { flexBasis: '23%', flexGrow: 1, borderRadius: 10, padding: 10, alignItems: 'center', minHeight: 80, justifyContent: 'center' },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  card: { borderRadius: 12, padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionEmoji: { fontSize: 16 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  bodyText: { fontSize: 13, lineHeight: 19 },
  miniLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  ownerName: { fontSize: 14, fontWeight: '700', marginTop: 4 },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '700' },

  objCard: { borderRadius: 12, padding: 14 },
  objTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  objCode: { fontSize: 11, fontWeight: '700', flex: 1 },
  priorityChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  mineChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  mineText: { fontSize: 10, fontWeight: '700' },
  objName: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  objMetaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  miniMeta: { alignItems: 'flex-start' },
  miniMetaValue: { fontSize: 14, fontWeight: '800' },
  miniMetaLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

  emptyCard: {
    borderRadius: 12, padding: 24, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyEmoji: { fontSize: 38, marginBottom: 8 },
  emptyText: { fontSize: 13 },
});

export default PmsStrategyDetailScreen;
