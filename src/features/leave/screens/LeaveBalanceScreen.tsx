import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useNavigation } from '@react-navigation/native';
import type { MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetLeaveBalanceQuery } from '../services/leaveApi';
import { asArray } from '../../../shared/utils/apiNormalize';
import { parseLeaveTypeId, parseLeaveTypeName } from '../leaveLegacyTypes';
import QueryStates from '../../../shared/components/QueryStates';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 16 * 2 - CARD_GAP) / 2;

const RING_SIZE = 72;
const RING_STROKE = 7;
const HERO_RING = 120;
const HERO_STROKE = 10;

const LEAVE_META: Record<string, { emoji: string; colorKey: string }> = {
  annual: { emoji: '🏖️', colorKey: 'primary' },
  sick: { emoji: '🤒', colorKey: 'danger' },
  personal: { emoji: '👤', colorKey: 'warning' },
  compassionate: { emoji: '💐', colorKey: 'success' },
  maternity: { emoji: '👶', colorKey: 'info' },
  paternity: { emoji: '👨‍👦', colorKey: 'info' },
  unpaid: { emoji: '📝', colorKey: 'textSecondary' },
  hajj: { emoji: '🕋', colorKey: 'success' },
};

const fallbackMeta = { emoji: '📋', colorKey: 'primary' };

function getMeta(typeName: string) {
  const key = typeName?.toLowerCase().replace(/\s+/g, '') ?? '';
  for (const [k, v] of Object.entries(LEAVE_META)) {
    if (key.includes(k)) return v;
  }
  return fallbackMeta;
}

/* ---------- Circular progress ring (two-half rotation) ---------- */
const ProgressRing: React.FC<{
  size: number; stroke: number; progress: number; color: string; trackColor: string;
}> = ({ size, stroke, progress, color, trackColor }) => {
  const p = Math.min(Math.max(progress, 0), 1);
  const half = size / 2;
  const rightDeg = Math.min(p * 360, 180);
  const leftDeg = Math.max((p * 360) - 180, 0);

  return (
    <View style={{ width: size, height: size }}>
      {/* Track */}
      <View style={{
        ...StyleSheet.absoluteFillObject,
        borderRadius: half, borderWidth: stroke, borderColor: trackColor,
      }} />
      {/* Right half (0-180°) */}
      <View style={{
        position: 'absolute', width: half, height: size,
        left: half, overflow: 'hidden',
      }}>
        <View style={{
          width: size, height: size, borderRadius: half,
          borderWidth: stroke, borderColor: 'transparent',
          borderTopColor: color, borderRightColor: color,
          position: 'absolute', left: -half,
          transform: [{ rotate: `${rightDeg}deg` }],
        }} />
      </View>
      {/* Left half (180-360°) */}
      {leftDeg > 0 && (
        <View style={{
          position: 'absolute', width: half, height: size,
          left: 0, overflow: 'hidden',
        }}>
          <View style={{
            width: size, height: size, borderRadius: half,
            borderWidth: stroke, borderColor: 'transparent',
            borderBottomColor: color, borderLeftColor: color,
            position: 'absolute', left: 0,
            transform: [{ rotate: `${leftDeg}deg` }],
          }} />
        </View>
      )}
    </View>
  );
};

const LeaveBalanceScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<MoreTabNavigation<'LeaveBalance'>>();
  const { colors, shadows, radii } = useTheme();
  const currentYear = new Date().getFullYear();
  const { data, isLoading, isFetching, isError, error, refetch } = useGetLeaveBalanceQuery({ year: currentYear });

  const raw = asArray<any>(data);
  const balances = raw
    .map((b: any) => {
      const quota = Number(b.quota ?? b.totalEntitlement ?? b.annualQuota ?? 0) || 0;
      const used = Number(b.used ?? b.availed ?? b.annualAvailed ?? 0) || 0;
      const remaining = Number(b.remaining ?? b.balance ?? b.annualBalance ?? 0) || 0;
      const pending = Number(b.pending ?? 0) || 0;
      const hasQuotaRaw = b.hasQuota;
      const hasQuota =
        hasQuotaRaw === true ||
        hasQuotaRaw === 1 ||
        hasQuotaRaw === '1' ||
        (hasQuotaRaw == null && quota > 0);
      return {
        id: parseLeaveTypeId(b) ?? 0,
        name: parseLeaveTypeName(b) || (b.leaveTypeName ?? b.name ?? ''),
        quota,
        used,
        remaining,
        pending,
        unit: b.unit ?? 'Days',
        adminLeave: Number(b.adminLeave ?? 0) || 0,
        hasQuota,
      };
    })
    .filter((b) => b.hasQuota || b.used > 0 || b.pending > 0);

  // Hero numbers reflect only types that actually have a configured quota,
  // so "days left" stays truthful for the user.
  const quotaOnly = balances.filter((b) => b.hasQuota);
  const totalRemaining = useMemo(
    () => quotaOnly.reduce((s, b) => s + (b.remaining ?? 0), 0),
    [quotaOnly],
  );
  const totalQuota = useMemo(
    () => quotaOnly.reduce((s, b) => s + (b.quota ?? 0), 0),
    [quotaOnly],
  );
  const totalUsed = useMemo(
    () => balances.reduce((s, b) => s + (b.used ?? 0), 0),
    [balances],
  );
  const heroProgress = totalQuota > 0 ? totalRemaining / totalQuota : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
      }
    >
      {/* Year badge */}
      <View style={styles.yearRow}>
        <Text style={[styles.yearLabel, { color: colors.textSecondary }]}>
          {t('leave.year', 'Year')}
        </Text>
        <View style={[styles.yearPill, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.yearPillText, { color: colors.primary }]}>{currentYear}</Text>
        </View>
      </View>

      {/* Hero section */}
      <View style={[styles.heroCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.xl }]}>
        <View style={styles.heroInner}>
          <View style={styles.heroRingWrap}>
            <ProgressRing
              size={HERO_RING}
              stroke={HERO_STROKE}
              progress={heroProgress}
              color={colors.primary}
              trackColor={colors.primaryLight}
            />
            <View style={styles.heroCenter}>
              <Text style={[styles.heroNumber, { color: colors.primary }]}>{totalRemaining}</Text>
              <Text style={[styles.heroUnit, { color: colors.textSecondary }]}>
                {t('leave.daysLeft', 'days left')}
              </Text>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaRow}>
              <View style={[styles.heroDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.heroMetaLabel, { color: colors.textSecondary }]}>
                {t('leave.remaining', 'Remaining')}
              </Text>
              <Text style={[styles.heroMetaValue, { color: colors.text }]}>{totalRemaining}</Text>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={[styles.heroDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.heroMetaLabel, { color: colors.textSecondary }]}>
                {t('leave.used', 'Used')}
              </Text>
              <Text style={[styles.heroMetaValue, { color: colors.text }]}>
                {totalUsed}
              </Text>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={[styles.heroDot, { backgroundColor: colors.borderLight }]} />
              <Text style={[styles.heroMetaLabel, { color: colors.textSecondary }]}>
                {t('leave.totalQuota', 'Total Quota')}
              </Text>
              <Text style={[styles.heroMetaValue, { color: colors.text }]}>{totalQuota}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Leave type cards grid */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('leave.byType', 'BY TYPE')}
      </Text>
      <View style={styles.grid}>
        {balances.map((item) => {
          const meta = getMeta(item.name);
          const accentColor = (colors as any)[meta.colorKey] ?? colors.primary;
          const progress = item.quota > 0 ? Math.min(item.used / item.quota, 1) : 0;

          return (
            <View
              key={item.id ?? item.name}
              style={[styles.typeCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}
            >
              {/* Top accent bar */}
              <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

              <View style={styles.typeCardBody}>
                <View style={styles.typeCardHeader}>
                  <Text style={styles.typeEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.typeName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                {item.hasQuota ? (
                  <>
                    {/* Ring (quota-based leave types) */}
                    <View style={styles.typeRingWrap}>
                      <ProgressRing
                        size={RING_SIZE}
                        stroke={RING_STROKE}
                        progress={progress}
                        color={accentColor}
                        trackColor={`${accentColor}20`}
                      />
                      <View style={styles.typeRingCenter}>
                        <Text style={[styles.typeRingNum, { color: accentColor }]}>{item.remaining}</Text>
                        <Text style={[styles.typeRingLabel, { color: colors.textMuted }]}>
                          {t('leave.left', 'left')}
                        </Text>
                      </View>
                    </View>

                    {/* Stats row */}
                    <View style={styles.typeStatsRow}>
                      <View style={styles.typeStat}>
                        <Text style={[styles.typeStatNum, { color: colors.text }]}>{item.quota}</Text>
                        <Text style={[styles.typeStatLabel, { color: colors.textMuted }]}>
                          {t('leave.quota', 'Quota')}
                        </Text>
                      </View>
                      <View style={[styles.typeStatDivider, { backgroundColor: colors.divider }]} />
                      <View style={styles.typeStat}>
                        <Text style={[styles.typeStatNum, { color: colors.danger }]}>{item.used}</Text>
                        <Text style={[styles.typeStatLabel, { color: colors.textMuted }]}>
                          {t('leave.used', 'Used')}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    {/* No-quota leave types: just show usage for the year */}
                    <View style={styles.noQuotaNumWrap}>
                      <Text style={[styles.noQuotaNum, { color: accentColor }]}>{item.used}</Text>
                      <Text style={[styles.noQuotaUnit, { color: colors.textMuted }]}>
                        {item.unit === 'Hours'
                          ? t('leave.hoursUsed', 'hrs used')
                          : t('leave.daysUsed', 'days used')}
                      </Text>
                    </View>
                    {item.pending > 0 && (
                      <View style={[styles.pendingPill, { backgroundColor: `${colors.warning}20` }]}>
                        <Text style={[styles.pendingPillText, { color: colors.warning }]}>
                          {t('leave.pendingCount', '{{n}} pending', { n: item.pending })}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.noQuotaCaption, { color: colors.textMuted }]}>
                      {t('leave.noQuota', 'No annual quota')}
                    </Text>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Error state */}
      <QueryStates
        errorGateOnly
        loading={false}
        apiError={!!(isError && balances.length === 0)}
        error={error}
        onRetry={refetch}
        isRefreshing={isFetching}
        style={isError && balances.length === 0 ? { alignSelf: 'stretch', minHeight: 220 } : undefined}
      >
        {null}
      </QueryStates>

      {/* Empty state */}
      {!isLoading && !isError && balances.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('leave.noBalance', 'No leave balance data available')}
          </Text>
        </View>
      )}
    </ScrollView>

    {/* Floating "Request leave" button — primary action for this screen */}
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('LeaveRequest')}
      style={[
        styles.fab,
        shadows.button,
        { backgroundColor: colors.primary },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('leave.request', 'Request leave')}
    >
      <Text style={styles.fabPlus}>＋</Text>
      <Text style={styles.fabLabel}>
        {t('leave.request', 'Request leave')}
      </Text>
    </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  /* Hero */
  heroCard: { padding: 20, marginBottom: 24 },
  heroInner: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  heroRingWrap: { justifyContent: 'center', alignItems: 'center' },
  heroCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNumber: { fontSize: 32, fontWeight: '800' },
  heroUnit: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  heroMeta: { flex: 1, gap: 12 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDot: { width: 8, height: 8, borderRadius: 4 },
  heroMetaLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  heroMetaValue: { fontSize: 15, fontWeight: '700' },

  /* Year badge row */
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  yearLabel: { fontSize: 13, fontWeight: '600' },
  yearPill: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1,
  },
  yearPillText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  /* Section */
  sectionTitle: {
    fontSize: 13, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 12, marginLeft: 4,
  },

  /* Grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },

  /* Type card */
  typeCard: { width: CARD_W, overflow: 'hidden', marginBottom: 4 },
  cardAccent: { height: 3, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  typeCardBody: { padding: 14, alignItems: 'center', gap: 10 },
  typeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  typeEmoji: { fontSize: 18 },
  typeName: { fontSize: 13, fontWeight: '700', flexShrink: 1 },

  typeRingWrap: { justifyContent: 'center', alignItems: 'center' },
  typeRingCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeRingNum: { fontSize: 20, fontWeight: '800' },
  typeRingLabel: { fontSize: 10, fontWeight: '600' },

  typeStatsRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    justifyContent: 'space-around',
  },
  typeStat: { alignItems: 'center' },
  typeStatNum: { fontSize: 15, fontWeight: '700' },
  typeStatLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  typeStatDivider: { width: 1, height: 24 },

  /* No-quota card variant */
  noQuotaNumWrap: { alignItems: 'center', marginTop: 4, marginBottom: 2 },
  noQuotaNum: { fontSize: 34, fontWeight: '800', lineHeight: 38 },
  noQuotaUnit: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  pendingPill: {
    alignSelf: 'center',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 999,
  },
  pendingPillText: { fontSize: 10, fontWeight: '700' },
  noQuotaCaption: { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  /* Empty */
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '500' },

  /* Floating action button */
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
  },
  fabPlus:  { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 22 },
  fabLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default LeaveBalanceScreen;
