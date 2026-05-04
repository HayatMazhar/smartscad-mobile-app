import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetMyKPIsQuery, useGetKpiAttachmentsQuery, useUploadKpiAttachmentMutation } from '../services/pmsApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray, safeAvg } from '../../../shared/utils/apiNormalize';
import { useToast } from '../../../shared/components/Toast';
import { pickOneDocumentForUpload } from '../../../shared/utils/pickDocument';
import { SortSheet, SortTriggerButton, sortRowsBy, SortOption } from '../../../shared/components/SortSheet';

type KpiSort = 'nameAsc' | 'nameDesc' | 'pctDesc' | 'pctAsc' | 'ownerAsc';
const SORTS: SortOption<KpiSort>[] = [
  { key: 'nameAsc',  label: 'Name — A to Z', icon: '🔤' },
  { key: 'nameDesc', label: 'Name — Z to A', icon: '🔤' },
  { key: 'pctDesc',  label: 'Attainment — high to low', icon: '📈' },
  { key: 'pctAsc',   label: 'Attainment — low to high', icon: '📉' },
  { key: 'ownerAsc', label: 'Owner',         icon: '👤' },
];

const attainmentPct = (k: any) => {
  const pct = k.percentage ?? k.attainment ?? k.score;
  if (pct != null && !Number.isNaN(Number(pct))) return Number(pct);
  const actual = Number(k.actual ?? k.actualValue ?? 0);
  const target = Number(k.target ?? k.targetValue ?? 0);
  return target > 0 ? Math.min(100, (actual / target) * 100) : 0;
};

const KpiEvidenceBlock: React.FC<{ item: any; colors: any }> = ({ item, colors }) => {
  const entityKey = String(item.kpiUid ?? item.kpiId ?? item.id ?? '');
  const { data: ev, refetch } = useGetKpiAttachmentsQuery(entityKey, { skip: !entityKey });
  const [upload, { isLoading }] = useUploadKpiAttachmentMutation();
  const toast = useToast();
  const rows = useMemo(() => asArray(ev), [ev]);
  if (!entityKey) return null;
  const onUp = async () => {
    try {
      const file = await pickOneDocumentForUpload();
      if (!file) return;
      await upload({ entityKey, file }).unwrap();
      void refetch();
      toast.success('Saved', 'Evidence uploaded for this KPI.');
    } catch {
      toast.error('Upload failed', 'Could not save file.');
    }
  };
  return (
    <View style={{ marginTop: 10, gap: 6 }}>
      <TouchableOpacity
        onPress={onUp}
        disabled={isLoading}
        style={{
          borderWidth: 1,
          borderColor: colors.primary,
          backgroundColor: `${colors.primary}0A`,
          borderRadius: 10,
          paddingVertical: 8,
          alignItems: 'center',
        }}
        activeOpacity={0.75}
      >
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
          {isLoading ? '…' : '+ Upload KPI evidence'}
        </Text>
      </TouchableOpacity>
      {rows.length > 0 ? (
        <View>
          {rows.map((r: any, j: number) => (
            <Text key={r.id ?? j} style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
              {r.fileName ?? r.name}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const performanceLevel = (actual: number, target: number) => {
  if (target <= 0) return 'on';
  const ratio = actual / target;
  if (ratio >= 1) return 'above';
  if (ratio >= 0.8) return 'on';
  return 'below';
};

const KPIScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const { data, isFetching, isLoading: kpisLoading, isError, refetch } = useGetMyKPIsQuery();
  const [sortKey, setSortKey] = useState<KpiSort>('nameAsc');
  const [sortOpen, setSortOpen] = useState(false);

  const kpis = useMemo(() => {
    const list = asArray<any>(data);
    switch (sortKey) {
      case 'nameAsc':  return sortRowsBy(list, 'asc',  (r) => String(r.kpiName ?? r.name ?? ''));
      case 'nameDesc': return sortRowsBy(list, 'desc', (r) => String(r.kpiName ?? r.name ?? ''));
      case 'pctDesc':  return sortRowsBy(list, 'desc', (r) => attainmentPct(r));
      case 'pctAsc':   return sortRowsBy(list, 'asc',  (r) => attainmentPct(r));
      case 'ownerAsc': return sortRowsBy(list, 'asc',  (r) => String(r.ownerName ?? ''));
      default:         return list;
    }
  }, [data, sortKey]);

  const overallScore = safeAvg(kpis.map(attainmentPct));

  const performanceColors: Record<string, { fg: string; bg: string; label: string }> = {
    above: { fg: colors.success, bg: `${colors.success}18`, label: 'Above Target' },
    on: { fg: colors.primary, bg: `${colors.primary}18`, label: 'On Target' },
    below: { fg: colors.danger, bg: `${colors.danger}18`, label: 'Below Target' },
  };

  const renderKPI = ({ item }: { item: any }) => {
    const actual = item.actual ?? item.actualValue ?? 0;
    const target = item.target ?? item.targetValue ?? 1;
    const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
    const level = performanceLevel(actual, target);
    const perf = performanceColors[level];
    const trend = actual >= target ? '📈' : '📉';

    return (
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kpiName, { color: colors.text }]} numberOfLines={2}>
              {item.kpiName ?? item.name}
            </Text>
            <Text style={[styles.kpiOwner, { color: colors.textSecondary }]}>
              {item.ownerName ?? '—'}
            </Text>
          </View>
          <Text style={styles.trend}>{trend}</Text>
        </View>

        {/* Gauge */}
        <View style={styles.gaugeSection}>
          <View style={[styles.gaugeTrack, { backgroundColor: colors.greyCard }]}>
            <View
              style={[styles.gaugeFill, { width: `${pct}%`, backgroundColor: perf.fg }]}
            />
            {/* Target marker */}
            <View style={[styles.targetMarker, { left: '100%', borderLeftColor: colors.textMuted }]} />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={[styles.gaugeValue, { color: colors.text }]}>
              {actual.toLocaleString()}
            </Text>
            <Text style={[styles.gaugeSep, { color: colors.textMuted }]}>/</Text>
            <Text style={[styles.gaugeTarget, { color: colors.textMuted }]}>
              {target.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Performance badge */}
        <View style={[styles.perfBadge, { backgroundColor: perf.bg }]}>
          <Text style={[styles.perfText, { color: perf.fg }]}>{perf.label}</Text>
        </View>
        <KpiEvidenceBlock item={item} colors={colors} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>{kpis.length}</Text>
          <Text> KPIs · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {(SORTS.find((s) => s.key === sortKey) ?? SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      <SortSheet<KpiSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title="Sort KPIs"
        colors={colors}
        shadows={shadows}
      />
      <FlatList
        data={kpis}
        keyExtractor={(item, index) => String(item.id ?? item.kpiName ?? item.name ?? index)}
        renderItem={renderKPI}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={kpisLoading} onRefresh={refetch} />
        }
        ListHeaderComponent={
          <>
            {isError && (
              <TouchableOpacity
                onPress={() => refetch()}
                activeOpacity={0.75}
                style={{
                  marginBottom: 10,
                  backgroundColor: `${colors.danger}14`,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 13 }}>
                  {t('common.loadError', 'Could not load data. Tap to retry.')}
                </Text>
              </TouchableOpacity>
            )}
            <View style={[styles.scoreCard, shadows.card, { backgroundColor: colors.secondary }]}>
              <Text style={styles.scoreEmoji}>📊</Text>
              <View>
                <Text style={styles.scoreLabel}>
                  {t('pms.overallScore', 'Overall Score')}
                </Text>
                <Text style={styles.scoreValue}>{overallScore}%</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isError ? t('common.loadError', 'Could not load data') : t('common.noData', 'No KPIs found')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  sortBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBarText: { fontSize: 12 },
  list: { padding: 16, paddingBottom: 32, gap: 12 },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 20,
    marginBottom: 4,
  },
  scoreEmoji: { fontSize: 32, marginRight: 16 },
  scoreLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  scoreValue: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },

  card: { borderRadius: 12, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  kpiName: { fontSize: 15, fontWeight: '700', lineHeight: 21 },
  kpiOwner: { fontSize: 12, marginTop: 3 },
  trend: { fontSize: 20, marginLeft: 10 },

  gaugeSection: { marginBottom: 12 },
  gaugeTrack: { height: 8, borderRadius: 4, position: 'relative' },
  gaugeFill: { height: 8, borderRadius: 4 },
  targetMarker: {
    position: 'absolute',
    top: -2,
    width: 0,
    height: 12,
    borderLeftWidth: 2,
    marginLeft: -2,
  },
  gaugeLabels: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  gaugeValue: { fontSize: 16, fontWeight: '700' },
  gaugeSep: { fontSize: 14, marginHorizontal: 4 },
  gaugeTarget: { fontSize: 14, fontWeight: '500' },

  perfBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  perfText: { fontSize: 11, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
});

export default KPIScreen;
