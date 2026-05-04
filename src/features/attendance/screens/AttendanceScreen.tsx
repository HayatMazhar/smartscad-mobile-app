import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useToast } from '../../../shared/components/Toast';
import { useGetAttendanceSummaryQuery } from '../services/attendanceApi';
import {
  useV2GetTodayAttendanceQuery,
  useV2CanCheckInQuery,
  useV2GetAttendanceSetupQuery,
  useV2MarkCheckInMutation,
} from '../services/attendanceSvcApi';
import QueryStates from '../../../shared/components/QueryStates';

function formatTime(dateStr: string | undefined | null) {
  if (!dateStr) return null;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
    const [h, m] = dateStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return dateStr;
  }
}

function workedHours(inTime: string | undefined | null, outTime: string | undefined | null) {
  if (!inTime) return 0;
  const parseMin = (t: string) => {
    if (/^\d{2}:\d{2}$/.test(t)) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
    const d = new Date(t); return isNaN(d.getTime()) ? -1 : d.getHours() * 60 + d.getMinutes();
  };
  const startMin = parseMin(inTime);
  const endMin = outTime ? parseMin(outTime) : new Date().getHours() * 60 + new Date().getMinutes();
  if (startMin < 0 || endMin < 0) return 0;
  const diff = endMin - startMin;
  return Math.max(0, Math.min(diff / 60, 24));
}

function statusTheme(label: string | undefined, colors: any) {
  const s = (label ?? '').toLowerCase();
  if (s.includes('on time') || s === 'present') return { bg: `${colors.success}18`, text: colors.success, label: label ?? 'Present' };
  if (s.includes('early out'))                  return { bg: `${colors.success}18`, text: colors.success, label: label ?? 'Early Out' };
  if (s.includes('late'))                       return { bg: `${colors.warning}18`, text: colors.warning, label: label ?? 'Late' };
  if (s.includes('absent'))                     return { bg: `${colors.danger}18`,  text: colors.danger,  label: label ?? 'Absent' };
  if (s.includes('leave'))                      return { bg: `${colors.primary}18`, text: colors.primary, label: label ?? 'On Leave' };
  if (s.includes('weekend'))                    return { bg: `${colors.textMuted}18`, text: colors.textMuted, label: label ?? 'Weekend' };
  if (s.includes('holiday'))                    return { bg: `${colors.info}18`, text: colors.info, label: label ?? 'Holiday' };
  if (s.includes('not checked'))                return { bg: `${colors.textMuted}18`, text: colors.textMuted, label: label ?? 'Not Checked In' };
  return { bg: `${colors.textMuted}18`, text: colors.textMuted, label: label ?? 'Not Checked In' };
}

function unwrap(x: any) {
  if (!x) return null;
  if (Array.isArray(x)) return x[0] ?? null;
  if (x.data) return Array.isArray(x.data) ? x.data[0] : x.data;
  return x;
}

function unwrapData(x: any) {
  if (!x) return null;
  if (x.data !== undefined) return x.data;
  return x;
}

const AttendanceScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows, radii } = useTheme();
  const toast = useToast();
  const lang = (i18n.language || 'en-us').toLowerCase().startsWith('ar') ? 'ar-ae' : 'en-us';
  const now = new Date();

  // ── v2 endpoints ─────────────────────────────────────────────────────
  const { data: rawToday, isFetching: fToday, refetch: refetchToday } =
    useV2GetTodayAttendanceQuery(lang);
  const { data: rawCan, isFetching: fCan, isLoading: lCan, refetch: refetchCan } =
    useV2CanCheckInQuery(lang);
  const { data: rawSetup, isFetching: fSetup, refetch: refetchSetup } =
    useV2GetAttendanceSetupQuery(lang);
  const [markCheckIn, { isLoading: marking }] = useV2MarkCheckInMutation();

  // ── Keep v1 summary until Sprint 1.3 ────────────────────────────────
  const { data: rawSummary, isFetching: fSum, isError: isSumError, error: sumError, refetch: refetchSummary } =
    useGetAttendanceSummaryQuery({ month: now.getMonth() + 1, year: now.getFullYear() });

  const attendance = unwrap(rawToday) ?? {};
  const canRow     = unwrap(rawCan) ?? {};
  const setup      = unwrap(rawSetup) ?? unwrapData(rawSetup) ?? {};
  const summary    = unwrap(rawSummary) ?? {};

  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Derived values ──────────────────────────────────────────────────
  const inRaw  = attendance.inTime  ?? attendance.checkInTime  ?? null;
  const outRaw = attendance.outTime ?? attendance.checkOutTime ?? null;
  const inTime  = formatTime(inRaw);
  const outTime = formatTime(outRaw);
  const hours   = workedHours(inRaw, outRaw);
  const hoursProgress = Math.min(hours / 8, 1);
  const statusLabelRaw = attendance.status2 ?? attendance.status ?? attendance.statusLabel ?? null;
  const sTheme  = statusTheme(statusLabelRaw, colors);
  const isCheckedIn = !!inRaw || attendance.isCheckedIn === true;

  // ── can-check-in (Sprint 0.3) ────────────────────────────────────────
  // SP returns: { canMarkAttendance: bit, reason: nvarchar, message: nvarchar, ... }
  const canMark = canRow?.canMarkAttendance === true || canRow?.canMarkAttendance === 1;
  const canReason: string | null =
    (canRow?.reason && String(canRow.reason).trim()) ||
    (canRow?.message && String(canRow.message).trim()) ||
    null;
  const canLoaded = !lCan && rawCan !== undefined;
  const buttonEnabled = canMark && !marking;

  // ── Setup banner (Sprint 0.5) ────────────────────────────────────────
  // GetAttendanceSetup returns: { minInTime, maxInTime, graceTime, mobileAttendanceGrace, ... }
  const setupMinIn  = setup?.minInTime ?? null;
  const setupMaxIn  = setup?.maxInTime ?? null;
  const setupGrace  = setup?.graceTime ?? null;
  const showSetupBanner = !!(setupMinIn || setupMaxIn);

  const monthLabel = clock.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Toggle handler (Sprint 0.2 + 0.4) ────────────────────────────────
  const mode: 'in' | 'out' = isCheckedIn ? 'out' : 'in';

  const handleMark = async () => {
    try {
      const result: any = await markCheckIn({ lang, latitude: undefined, longitude: undefined }).unwrap();
      // SP returns { isSuccess: bit, message: nvarchar } wrapped as { success, data: {...} }
      const payload = result?.data ?? result;
      const isSuccess = payload?.isSuccess === true || payload?.isSuccess === 1;
      const message: string =
        payload?.message ??
        (mode === 'in'
          ? t('attendance.checkInSuccess', 'Check-in recorded')
          : t('attendance.checkOutSuccess', 'Check-out recorded'));

      if (isSuccess) {
        toast.success(
          mode === 'in'
            ? t('attendance.checkedIn', 'Checked In')
            : t('attendance.checkedOut', 'Checked Out'),
          message,
        );
        refetchToday();
        refetchCan();
      } else {
        Alert.alert(t('common.error', 'Error'), message);
      }
    } catch (err: any) {
      const apiMsg =
        err?.data?.data?.message ??
        err?.data?.message ??
        err?.error ??
        err?.message ??
        t('attendance.checkInFailed', 'Action failed');
      Alert.alert(t('common.error', 'Error'), String(apiMsg));
    }
  };

  const onRefresh = () => {
    refetchToday();
    refetchCan();
    refetchSetup();
    refetchSummary();
  };

  const summaryCards = useMemo(() => ([
    { emoji: '✅', label: t('attendance.present', 'Present'), value: summary?.present ?? 0, color: colors.success },
    { emoji: '⏰', label: t('attendance.late', 'Late'),       value: summary?.late    ?? 0, color: colors.warning },
    { emoji: '❌', label: t('attendance.absent', 'Absent'),   value: summary?.absent  ?? 0, color: colors.danger  },
    { emoji: '📅', label: t('attendance.leaves', 'Leave'),    value: summary?.leaves ?? summary?.leave ?? 0, color: colors.primary },
  ]), [summary, t, colors]);
  const monthlyWorkedHours = Math.max(0, Math.round(((summary?.totalWorkingMinutes ?? 0) / 60) * 10) / 10);

  // ── Button cosmetics driven by mode ─────────────────────────────────
  const btnBg = !buttonEnabled
    ? colors.textMuted
    : mode === 'in'
      ? colors.success
      : colors.warning;
  const btnLabel = mode === 'in'
    ? t('attendance.checkInNow', 'Check In Now')
    : t('attendance.checkOutNow', 'Check Out Now');
  const btnEmoji = mode === 'in' ? '🟢' : '🔴';

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <ThemedRefreshControl
          refreshing={fToday || fSum || fCan || fSetup}
          onRefresh={onRefresh}
        />
      }
    >
      {/* API error banner (primary monthly summary failed) */}
      <QueryStates
        errorGateOnly
        loading={false}
        apiError={!!(isSumError && !rawSummary)}
        error={sumError}
        onRetry={refetchSummary}
        isRefreshing={fSum}
        style={isSumError && !rawSummary ? { alignSelf: 'stretch', minHeight: 200 } : undefined}
      >
        {null}
      </QueryStates>

      {/* Live clock */}
      <View style={[styles.clockCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.xl }]}>
        <Text style={[styles.clockTime, { color: colors.text }]}>
          {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </Text>
        <Text style={[styles.clockDate, { color: colors.textSecondary }]}>
          {clock.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Setup / shift banner (Sprint 0.5) */}
      {showSetupBanner && (
        <View
          style={[
            styles.setupBanner,
            shadows.card,
            { backgroundColor: colors.card, borderRadius: radii.lg, borderLeftColor: colors.primary },
          ]}
        >
          <Text style={styles.setupEmoji}>🕘</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.setupTitle, { color: colors.text }]}>
              {t('attendance.todaySchedule', "Today's Schedule")}
            </Text>
            <Text style={[styles.setupBody, { color: colors.textSecondary }]}>
              {setupMinIn && setupMaxIn
                ? `${formatTime(setupMinIn)} – ${formatTime(setupMaxIn)}`
                : setupMinIn
                  ? `${t('attendance.from', 'From')} ${formatTime(setupMinIn)}`
                  : `${t('attendance.until', 'Until')} ${formatTime(setupMaxIn)}`}
              {setupGrace ? ` · ${setupGrace} ${t('attendance.minGrace', 'min grace')}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Check-in / Check-out card */}
      <View style={[styles.mainCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.xl }]}>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: sTheme.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: sTheme.text }]} />
          <Text style={[styles.statusText, { color: sTheme.text }]}>{sTheme.label}</Text>
        </View>

        {/* Times row */}
        <View style={styles.timesRow}>
          <View style={styles.timeBlock}>
            <View style={[styles.timeIconWrap, { backgroundColor: `${colors.success}18` }]}>
              <Text style={styles.timeIconEmoji}>🟢</Text>
            </View>
            <View>
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                {t('attendance.checkIn', 'Check In')}
              </Text>
              <Text style={[styles.timeValue, { color: inTime ? colors.text : colors.textMuted }]}>
                {inTime ?? '--:--'}
              </Text>
            </View>
          </View>

          <View style={[styles.timeDivider, { backgroundColor: colors.divider }]} />

          <View style={styles.timeBlock}>
            <View style={[styles.timeIconWrap, { backgroundColor: `${colors.danger}18` }]}>
              <Text style={styles.timeIconEmoji}>🔴</Text>
            </View>
            <View>
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                {t('attendance.checkOut', 'Check Out')}
              </Text>
              <Text style={[styles.timeValue, { color: outTime ? colors.text : colors.textMuted }]}>
                {outTime ?? t('attendance.notYet', 'Not yet')}
              </Text>
            </View>
          </View>
        </View>

        {/* Worked hours progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              {t('attendance.workedHours', 'Worked Hours')}
            </Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {hours.toFixed(1)}h / 8h
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.primaryLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: hoursProgress >= 1 ? colors.success : colors.primary,
                  width: `${hoursProgress * 100}%` as any,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Pre-flight reason banner (Sprint 0.3) */}
      {canLoaded && !canMark && canReason ? (
        <View
          style={[
            styles.reasonBanner,
            { backgroundColor: `${colors.warning}18`, borderColor: colors.warning, borderRadius: radii.lg },
          ]}
        >
          <Text style={styles.reasonEmoji}>⚠️</Text>
          <Text style={[styles.reasonText, { color: colors.warning }]}>
            {canReason}
          </Text>
        </View>
      ) : null}

      {/* Toggle button: hidden until can-check-in resolves (Sprint 0.3) */}
      {!canLoaded ? (
        <View
          style={[
            styles.checkInBtn,
            shadows.button,
            { backgroundColor: colors.primaryLight, borderRadius: radii.xl },
          ]}
        >
          <ThemedActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.checkInBtn,
            shadows.button,
            { backgroundColor: btnBg, borderRadius: radii.xl, opacity: buttonEnabled ? 1 : 0.7 },
          ]}
          onPress={handleMark}
          disabled={!buttonEnabled}
          activeOpacity={0.8}
        >
          {marking ? (
            <ThemedActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.checkInEmoji}>{btnEmoji}</Text>
              <Text style={styles.checkInText}>{btnLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Monthly stats */}
      <View style={styles.monthHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
          {t('attendance.thisMonth', 'THIS MONTH')}
        </Text>
        <View style={[styles.monthPill, { backgroundColor: `${colors.primary}18` }]}>
          <Text style={[styles.monthPillText, { color: colors.primary }]}>{monthLabel}</Text>
        </View>
      </View>
      {summary?.totalDays != null && (
        <Text style={[styles.monthSubline, { color: colors.textMuted }]}>
          {(summary.totalDays ?? 0)} {t('attendance.daysTracked', 'days tracked')}
          {monthlyWorkedHours > 0 ? ` · ${monthlyWorkedHours}h ${t('attendance.worked', 'worked')}` : ''}
          {summary?.averageInTime ? ` · ${t('attendance.avgIn', 'avg in')} ${formatTime(summary.averageInTime)}` : ''}
        </Text>
      )}
      <View style={styles.statsGrid}>
        {summaryCards.map((card) => (
          <View
            key={card.label}
            style={[styles.statCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: `${card.color}18` }]}>
              <Text style={styles.statEmoji}>{card.emoji}</Text>
            </View>
            <Text style={[styles.statNum, { color: card.color }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Monthly card link */}
      <TouchableOpacity
        style={[styles.monthlyLink, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}
        onPress={() => navigation?.navigate?.('MonthlyCard')}
        activeOpacity={0.7}
      >
        <View style={styles.monthlyLinkInner}>
          <Text style={styles.monthlyLinkEmoji}>📊</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.monthlyLinkTitle, { color: colors.text }]}>
              {t('attendance.viewMonthly', 'View Monthly Card')}
            </Text>
            <Text style={[styles.monthlyLinkSub, { color: colors.textSecondary }]}>
              {t('attendance.viewMonthlyDesc', 'Full calendar view with daily details')}
            </Text>
          </View>
          <Text style={[styles.monthlyLinkArrow, { color: colors.primary }]}>→</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  /* Clock */
  clockCard: { padding: 24, alignItems: 'center', marginBottom: 16 },
  clockTime: { fontSize: 36, fontWeight: '800', letterSpacing: 1 },
  clockDate: { fontSize: 14, fontWeight: '500', marginTop: 6 },

  /* Setup banner */
  setupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, marginBottom: 16, borderLeftWidth: 4,
  },
  setupEmoji: { fontSize: 22 },
  setupTitle: { fontSize: 13, fontWeight: '700' },
  setupBody: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  /* Main card */
  mainCard: { padding: 20, marginBottom: 16 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 16, marginBottom: 16,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },

  timesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  timeBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  timeIconEmoji: { fontSize: 16 },
  timeLabel: { fontSize: 11, fontWeight: '500' },
  timeValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  timeDivider: { width: 1, height: 40, marginHorizontal: 8 },

  progressSection: {},
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '600' },
  progressValue: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },

  /* Reason banner */
  reasonBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, marginBottom: 12, borderWidth: 1,
  },
  reasonEmoji: { fontSize: 18 },
  reasonText: { flex: 1, fontSize: 12, fontWeight: '600' },

  /* Toggle button */
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 18, marginBottom: 24, minHeight: 60,
  },
  checkInEmoji: { fontSize: 22 },
  checkInText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  /* Section */
  sectionTitle: {
    fontSize: 13, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 12, marginLeft: 4,
  },
  monthHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4, marginLeft: 4,
  },
  monthPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  monthPillText: { fontSize: 11, fontWeight: '700' },
  monthSubline: { fontSize: 11, fontWeight: '500', marginBottom: 10, marginLeft: 4 },

  /* Stats */
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, padding: 14, alignItems: 'center', gap: 6 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statEmoji: { fontSize: 16 },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },

  /* Monthly link */
  monthlyLink: { padding: 16, marginBottom: 16 },
  monthlyLinkInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthlyLinkEmoji: { fontSize: 28 },
  monthlyLinkTitle: { fontSize: 15, fontWeight: '700' },
  monthlyLinkSub: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  monthlyLinkArrow: { fontSize: 22, fontWeight: '700' },
});

export default AttendanceScreen;
