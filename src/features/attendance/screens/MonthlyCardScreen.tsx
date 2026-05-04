import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetMonthlyCardQuery } from '../services/attendanceApi';
import {
  useV2GetMonthlyAttendanceQuery,
  useV2GetDisciplineQuery,
} from '../services/attendanceSvcApi';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import QueryStates from '../../../shared/components/QueryStates';

const { width: SCREEN_W } = Dimensions.get('window');
const SCROLL_PAD = 16;          // outer ScrollView padding
const CARD_PAD = 12;            // calendarCard internal padding
const CELL_GAP = 4;
// 7 cells + 6 gaps must fit in (SCREEN_W - SCROLL_PAD*2 - CARD_PAD*2).
// The previous calc forgot CARD_PAD, so cells overflowed the row and wrapped
// after only 6 — which is why dates ended up under the wrong day-of-week.
const CELL_SIZE = Math.floor(
  (SCREEN_W - SCROLL_PAD * 2 - CARD_PAD * 2 - CELL_GAP * 6) / 7,
);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayStatus = 'present' | 'late' | 'absent' | 'leave' | 'weekend' | 'holiday' | 'none';

const STATUS_CONFIG: Record<DayStatus, { emoji: string; label: string; colorKey: string }> = {
  present: { emoji: '✅', label: 'Present', colorKey: 'success' },
  late: { emoji: '⏰', label: 'Late', colorKey: 'warning' },
  absent: { emoji: '❌', label: 'Absent', colorKey: 'danger' },
  leave: { emoji: '📅', label: 'Leave', colorKey: 'primary' },
  weekend: { emoji: '🏠', label: 'Weekend', colorKey: 'textMuted' },
  holiday: { emoji: '🎉', label: 'Holiday', colorKey: 'info' },
  none: { emoji: '', label: '', colorKey: 'textMuted' },
};

function getStatusForDay(day: number, monthData: any[]): DayStatus {
  if (!monthData || monthData.length === 0) return 'none';
  const record = monthData.find((r: any) => {
    const d = r.dated ?? r.day ?? r.date;
    if (typeof d === 'number') return d === day;
    if (typeof d === 'string') {
      try { return new Date(d).getDate() === day; } catch { return false; }
    }
    if (d instanceof Date) return d.getDate() === day;
    return false;
  });
  if (!record) return 'none';
  const cat = (record.statusCategory ?? '').toLowerCase();
  if (cat === 'present' || cat === 'late' || cat === 'absent' ||
      cat === 'leave' || cat === 'weekend' || cat === 'holiday') {
    return cat as DayStatus;
  }
  const code = String(record.status ?? '').toUpperCase();
  if (code === 'T' || code === 'E' || code === 'M') return 'present';
  if (code === 'D') return 'late';
  if (code === 'A') return 'absent';
  if (code === 'L') return 'leave';
  if (code === 'R') return 'weekend';
  if (code === 'H') return 'holiday';
  const s = String(record.statusLabel ?? record.status ?? '').toLowerCase();
  if (s.includes('late'))     return 'late';
  if (s.includes('absent'))   return 'absent';
  if (s.includes('leave'))    return 'leave';
  if (s.includes('weekend'))  return 'weekend';
  if (s.includes('holiday'))  return 'holiday';
  if (s.includes('on time') || s.includes('present') || s.includes('early')) return 'present';
  return 'none';
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay();
}

const MonthlyCardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows, radii } = useTheme();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const { data, isFetching, isLoading: monthlyCardLoading, isError, error, refetch } = useGetMonthlyCardQuery({
    month: month + 1,
    year,
  });

  // v2 — hours summary (one row per resource for the picked month).
  // SP returns: Expected_Working_Hours, Counted_Working_Hours, Excess_Hours,
  // Shortage_Hours, UnAuthorized_Absent_days, Last_Day_of_compansation,
  // Compansation_Hours, Compansation_Minutes (verbatim PascalCase keys).
  const v2Monthly = useV2GetMonthlyAttendanceQuery({ month: month + 1, year });

  // v2 — discipline summary, mirrors the web "Attendance Discipline" report.
  // Calls SP GetEmpDiscipline; one row per resource for the picked month.
  const startStr = useMemo(() => {
    const d = new Date(year, month, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, [month, year]);
  const endStr = useMemo(() => {
    const d = new Date(year, month + 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [month, year]);
  const v2Disc = useV2GetDisciplineQuery({ startDate: startStr, endDate: endStr });

  const monthData = useMemo(() => {
    if (data == null) return [];
    if (Array.isArray(data)) return data;
    const o = asObject<Record<string, unknown>>(data);
    if (o && Array.isArray(o.days)) return o.days as any[];
    return asArray<any>(data);
  }, [data]);

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const today = now.getDate();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number; status: DayStatus }> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: 0, status: 'none' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = (firstDay + d - 1) % 7;
      const isFri = dayOfWeek === 5;
      const isSat = dayOfWeek === 6;
      let status = getStatusForDay(d, monthData);
      if (status === 'none' && (isFri || isSat)) status = 'weekend';
      cells.push({ day: d, status });
    }
    return cells;
  }, [firstDay, daysInMonth, monthData]);

  const summaryStats = useMemo(() => {
    let present = 0, late = 0, absent = 0, leave = 0;
    calendarCells.forEach((c) => {
      if (c.status === 'present') present++;
      else if (c.status === 'late') late++;
      else if (c.status === 'absent') absent++;
      else if (c.status === 'leave') leave++;
    });
    return { present, late, absent, leave };
  }, [calendarCells]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // First (and usually only) row of the v2 monthly hours summary.
  const hoursRow = useMemo(() => {
    const rows = asArray<any>(v2Monthly.data);
    return rows[0] ?? null;
  }, [v2Monthly.data]);

  // First row of v2 discipline summary.
  const discRow = useMemo(() => {
    const rows = asArray<any>(v2Disc.data);
    return rows[0] ?? null;
  }, [v2Disc.data]);

  // The web report stores hours pre-formatted (e.g. "95h 00m"); for raw
  // minute values fall back to a minute → "Xh Ym" formatter that mirrors the
  // GetAttendanceMonthSummary output so the UI is consistent across cells.
  function formatMinutes(mins: number | null | undefined): string {
    if (mins == null || isNaN(Number(mins))) return '—';
    const m = Math.max(0, Math.round(Number(mins)));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return `${String(h).padStart(2, '0')}h ${String(r).padStart(2, '0')}m`;
  }

  function pick<T = any>(o: any, ...keys: string[]): T | undefined {
    if (o == null) return undefined;
    for (const k of keys) {
      if (o[k] !== undefined && o[k] !== null) return o[k] as T;
    }
    return undefined;
  }

  function cellBg(status: DayStatus) {
    const key = STATUS_CONFIG[status].colorKey;
    const color = (colors as any)[key] ?? colors.textMuted;
    if (status === 'none') return 'transparent';
    return `${color}20`;
  }
  function cellTextColor(status: DayStatus) {
    if (status === 'none') return colors.textMuted;
    const key = STATUS_CONFIG[status].colorKey;
    return (colors as any)[key] ?? colors.textMuted;
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <ThemedRefreshControl
          isFetching={isFetching || v2Monthly.isFetching || v2Disc.isFetching}
          isLoading={monthlyCardLoading || v2Monthly.isLoading || v2Disc.isLoading}
          onRefresh={() => {
            refetch();
            v2Monthly.refetch();
            v2Disc.refetch();
          }}
        />
      }
    >
      {/* API error banner (primary monthly card failed) */}
      <QueryStates
        errorGateOnly
        loading={false}
        apiError={!!(isError && !data)}
        error={error}
        onRetry={refetch}
        isRefreshing={isFetching}
        style={isError && !data ? { alignSelf: 'stretch', minHeight: 200 } : undefined}
      >
        {null}
      </QueryStates>

      {/* Month selector */}
      <View style={[styles.monthSelector, shadows.card, { backgroundColor: colors.card, borderRadius: radii.xl }]}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow} activeOpacity={0.6}>
          <Text style={[styles.monthArrowText, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={[styles.monthName, { color: colors.text }]}>
            {t(`months.${MONTH_NAMES[month].toLowerCase()}`, MONTH_NAMES[month])}
          </Text>
          <Text style={[styles.monthYear, { color: colors.textSecondary }]}>{year}</Text>
        </View>
        <TouchableOpacity onPress={nextMonth} style={styles.monthArrow} activeOpacity={0.6}>
          <Text style={[styles.monthArrowText, { color: colors.primary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar grid.
          `monthlyCard` SP is slow — when we have no data yet, show a spinner
          overlay over the grid so users understand data is loading instead of
          assuming the month is empty. Once data arrives the overlay disappears
          while still allowing pull-to-refresh via the top RefreshControl. */}
      <View style={[styles.calendarCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.xl }]}>
        <View style={styles.dayHeaderRow}>
          {DAY_HEADERS.map((d) => (
            <View key={d} style={[styles.dayHeaderCell, { width: CELL_SIZE }]}>
              <Text style={[styles.dayHeaderText, { color: colors.textMuted }]}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={styles.gridWrap}>
          <View style={[styles.daysGrid, isFetching && monthData.length === 0 && styles.gridDim]}>
            {calendarCells.map((cell, idx) => {
              const isToday = isCurrentMonth && cell.day === today;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dayCell,
                    { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: cellBg(cell.status) },
                    isToday && [styles.todayCell, { borderColor: colors.primary }],
                  ]}
                >
                  {cell.day > 0 && (
                    <Text
                      style={[
                        styles.dayNum,
                        { color: cellTextColor(cell.status) },
                        isToday && styles.todayNum,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {isFetching && monthData.length === 0 ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <View style={[styles.loadingPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ThemedActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  {t('attendance.loadingCalendar', 'Loading calendar…')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* Legend */}
      <View style={[styles.legendCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
        <View style={styles.legendGrid}>
          {(['present', 'late', 'absent', 'leave', 'weekend', 'holiday'] as DayStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const color = (colors as any)[cfg.colorKey] ?? colors.textMuted;
            return (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: `${color}30` }]}>
                  <View style={[styles.legendDotInner, { backgroundColor: color }]} />
                </View>
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                  {t(`attendance.${status}`, cfg.label)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Summary stats */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('attendance.monthlySummary', 'MONTHLY SUMMARY')}
      </Text>
      <View style={styles.summaryRow}>
        {[
          { label: t('attendance.present', 'Present'), value: summaryStats.present, color: colors.success },
          { label: t('attendance.late', 'Late'), value: summaryStats.late, color: colors.warning },
          { label: t('attendance.absent', 'Absent'), value: summaryStats.absent, color: colors.danger },
          { label: t('attendance.leaves', 'Leave'), value: summaryStats.leave, color: colors.primary },
        ].map((item) => (
          <View
            key={item.label}
            style={[styles.summaryCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}
          >
            <Text style={[styles.summaryNum, { color: item.color }]}>{item.value}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Working hours summary (v2 GetAttendanceMonthSummary).
          Shows Expected vs Counted hours plus Excess / Shortage and any
          un-authorised absent days for the selected month — same numbers the
          legacy web "Attendance Month Summary" page renders. */}
      {hoursRow ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
            {t('attendance.workingHours', 'WORKING HOURS')}
          </Text>
          <View style={[styles.kvCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}>
            <View style={styles.kvRow}>
              <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>
                {t('attendance.expected', 'Expected')}
              </Text>
              <Text style={[styles.kvValue, { color: colors.text }]}>
                {pick<string>(hoursRow, 'Expected_Working_Hours', 'expected_Working_Hours') ?? '—'}
              </Text>
            </View>
            <View style={[styles.kvRow, styles.kvRowDiv, { borderTopColor: colors.border }]}>
              <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>
                {t('attendance.counted', 'Counted')}
              </Text>
              <Text style={[styles.kvValue, { color: colors.text }]}>
                {pick<string>(hoursRow, 'Counted_Working_Hours', 'counted_Working_Hours') ?? '—'}
              </Text>
            </View>
            <View style={[styles.kvRow, styles.kvRowDiv, { borderTopColor: colors.border }]}>
              <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>
                {t('attendance.excess', 'Excess')}
              </Text>
              <Text style={[styles.kvValue, { color: colors.success }]}>
                {pick<string>(hoursRow, 'Excess_Hours', 'excess_Hours') ?? '—'}
              </Text>
            </View>
            <View style={[styles.kvRow, styles.kvRowDiv, { borderTopColor: colors.border }]}>
              <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>
                {t('attendance.shortage', 'Shortage')}
              </Text>
              <Text style={[styles.kvValue, { color: colors.danger }]}>
                {pick<string>(hoursRow, 'Shortage_Hours', 'shortage_Hours') ?? '—'}
              </Text>
            </View>
            <View style={[styles.kvRow, styles.kvRowDiv, { borderTopColor: colors.border }]}>
              <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>
                {t('attendance.unauthorisedAbsent', 'Unauthorised absent (days)')}
              </Text>
              <Text style={[styles.kvValue, { color: colors.text }]}>
                {String(pick<number>(hoursRow, 'UnAuthorized_Absent_days', 'unAuthorized_Absent_days') ?? 0)}
              </Text>
            </View>
          </View>
        </>
      ) : null}

      {/* Discipline summary (v2 GetEmpDiscipline).
          Mirrors the web "Discipline Report" — Discipline %, Late, Early,
          Short-leave deductible/non-deductible, Absent days and sick leave. */}
      {discRow ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
            {t('attendance.disciplineSummary', 'DISCIPLINE')}
          </Text>

          {/* Headline: discipline % as a big card */}
          <View
            style={[
              styles.disciplineHero,
              shadows.card,
              { backgroundColor: colors.card, borderRadius: radii.lg },
            ]}
          >
            <Text style={[styles.disciplinePctLabel, { color: colors.textSecondary }]}>
              {t('attendance.disciplinePct', 'Discipline %')}
            </Text>
            <Text style={[styles.disciplinePct, { color: colors.primary }]}>
              {(() => {
                const v = pick<number>(discRow, 'Descipline', 'descipline');
                return v == null ? '—' : `${Number(v).toFixed(2)}%`;
              })()}
            </Text>
            <Text style={[styles.disciplineSub, { color: colors.textMuted }]}>
              {t('attendance.workingDays', 'Working days')}: {String(pick<number>(discRow, 'WorkingDays', 'workingDays') ?? 0)}
            </Text>
          </View>

          {/* 2x3 grid of discipline metrics (each value formatted as Xh Ym
              for minute fields, or raw count for day/count fields). */}
          <View style={styles.discGrid}>
            {[
              {
                label: t('attendance.late', 'Late'),
                value: formatMinutes(pick<number>(discRow, 'LateMinutes', 'lateMinutes')),
                color: colors.warning,
              },
              {
                label: t('attendance.early', 'Early'),
                value: formatMinutes(pick<number>(discRow, 'EarlyMinutes', 'earlyMinutes')),
                color: colors.info,
              },
              {
                label: t('attendance.shortLeaveDeductible', 'Short leave (deductible)'),
                value: formatMinutes(pick<number>(discRow, 'ShortLeaveMinutesDeductable', 'shortLeaveMinutesDeductable')),
                color: colors.danger,
              },
              {
                label: t('attendance.shortLeaveNonDeductible', 'Short leave (non-ded.)'),
                value: formatMinutes(pick<number>(discRow, 'ShortLeaveMinutesNonDeductable', 'shortLeaveMinutesNonDeductable')),
                color: colors.textSecondary,
              },
              {
                label: t('attendance.absentDays', 'Absent (days)'),
                value: String(pick<number>(discRow, 'AbsentCount', 'absentCount') ?? 0),
                color: colors.danger,
              },
              {
                label: t('attendance.sickLeave', 'Sick leave (days)'),
                value: String(pick<number>(discRow, 'SickLeave', 'sickLeave') ?? 0),
                color: colors.primary,
              },
            ].map((m) => (
              <View
                key={m.label}
                style={[styles.discCard, shadows.card, { backgroundColor: colors.card, borderRadius: radii.lg }]}
              >
                <Text style={[styles.discValue, { color: m.color }]}>{m.value}</Text>
                <Text style={[styles.discLabel, { color: colors.textSecondary }]}>{m.label}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { padding: SCROLL_PAD, paddingBottom: 40 },

  /* Month selector */
  monthSelector: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, marginBottom: 16,
  },
  monthArrow: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  monthArrowText: { fontSize: 32, fontWeight: '300', marginTop: -4 },
  monthCenter: { flex: 1, alignItems: 'center' },
  monthName: { fontSize: 20, fontWeight: '700' },
  monthYear: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  /* Calendar */
  calendarCard: { padding: CARD_PAD, marginBottom: 16 },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: CELL_GAP,
    marginBottom: 8,
  },
  dayHeaderCell: { alignItems: 'center', paddingVertical: 4 },
  dayHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  gridWrap: { position: 'relative' },
  daysGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: CELL_GAP, justifyContent: 'flex-start',
  },
  gridDim: { opacity: 0.35 },
  dayCell: {
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  todayCell: { borderWidth: 2 },
  dayNum: { fontSize: 14, fontWeight: '600' },
  todayNum: { fontWeight: '800' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  loadingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 22, borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  loadingText: { fontSize: 13, fontWeight: '600' },

  /* Legend */
  legendCard: { padding: 14, marginBottom: 20 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '30%' },
  legendDot: {
    width: 18, height: 18, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  legendDotInner: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: '600' },

  /* Section title */
  sectionTitle: {
    fontSize: 13, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 12, marginLeft: 4,
  },

  /* Summary */
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, padding: 14, alignItems: 'center', gap: 4 },
  summaryNum: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600' },

  /* Working hours / key-value card */
  kvCard: { paddingHorizontal: 14, paddingVertical: 4 },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  kvRowDiv: { borderTopWidth: StyleSheet.hairlineWidth },
  kvLabel: { fontSize: 13, fontWeight: '600', flexShrink: 1, paddingRight: 12 },
  kvValue: { fontSize: 15, fontWeight: '700' },

  /* Discipline */
  disciplineHero: { padding: 18, alignItems: 'center', marginBottom: 12 },
  disciplinePctLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  disciplinePct: { fontSize: 36, fontWeight: '800', marginTop: 6 },
  disciplineSub: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  discGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  discCard: {
    width: '48%', padding: 14,
    alignItems: 'flex-start', gap: 4,
  },
  discValue: { fontSize: 18, fontWeight: '800' },
  discLabel: { fontSize: 11, fontWeight: '600' },
});

export default MonthlyCardScreen;
