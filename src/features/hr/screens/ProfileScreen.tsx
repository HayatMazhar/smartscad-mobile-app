import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, TouchableOpacity, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetProfileQuery } from '../services/hrApi';
import {
  useV2GetProfileCardQuery,
  useV2GetProfileDetailsQuery,
  type ProfileCard,
  type ProfileCardAchievement,
  type ProfileCardDiscipline,
  type ProfileCardHeader,
  type ProfileDetails,
} from '../services/hrSvcApi';
import ProfileAvatar from '../../../shared/components/ProfileAvatar';
import QueryStates from '../../../shared/components/QueryStates';
import ThemedIcon from '../../../shared/components/ThemedIcon';
import { accentChroma } from '../../../app/theme/accentChroma';

const AVATAR_SIZE = 88;

type TabKey = 'details' | 'performance';

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function fmtNumber(n?: number | null, digits = 1): string {
  if (n == null || isNaN(Number(n))) return '0';
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(digits);
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────────
const Row: React.FC<{
  icon: string;
  label: string;
  value?: string | null;
  colors: any;
  last?: boolean;
}> = ({ icon, label, value, colors, last }) => (
  <View
    style={[
      s.row,
      !last && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth },
    ]}
  >
    <View style={[s.rowIcon, { backgroundColor: colors.primaryLight }]}>
      <Text style={{ fontSize: 15 }}>{icon}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[s.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.rowValue, { color: colors.text }]} numberOfLines={3}>
        {value && String(value).trim().length > 0 ? value : '—'}
      </Text>
    </View>
  </View>
);

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  colors: any;
  rightSlot?: React.ReactNode;
}> = ({ icon, title, colors, rightSlot }) => (
  <View style={s.sectionHeaderRow}>
    <View style={s.sectionHeaderLeft}>
      <Text style={{ fontSize: 16, marginRight: 8 }}>{icon}</Text>
      <Text style={[s.sectionHeaderText, { color: colors.text }]}>{title}</Text>
    </View>
    {rightSlot}
  </View>
);

// Compact metric card (Strategic / Appraisal) — used in 2-col grid
const MetricCard: React.FC<{
  title: string;
  value: string;
  suffix?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
  footer?: string;
  colors: any;
  shadows: any;
}> = ({ title, value, suffix, tone = 'primary', icon = '📊', footer, colors, shadows }) => {
  const toneColors: Record<string, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
  };
  const accent = toneColors[tone];

  return (
    <View style={[s.metricCard, shadows.card, { backgroundColor: colors.card }]}>
      <View style={[s.metricStripe, { backgroundColor: accent }]} />
      <View style={s.metricHeader}>
        <Text style={[s.metricTitle, { color: colors.textSecondary }]} numberOfLines={2}>
          {title}
        </Text>
        <View style={[s.metricIconBubble, { backgroundColor: accent + '22' }]}>
          <Text style={{ fontSize: 14 }}>{icon}</Text>
        </View>
      </View>
      <Text style={[s.metricValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {suffix ? <Text style={[s.metricSuffix, { color: colors.textMuted }]}>{suffix}</Text> : null}
      </Text>
      {footer ? (
        <Text style={[s.metricFooter, { color: colors.textMuted }]} numberOfLines={2}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
};

// Hero metric card — operational performance with gauge bar (full-width)
const HeroMetricCard: React.FC<{
  title: string;
  value: number;
  suffix?: string;
  tone?: 'success' | 'warning' | 'danger';
  icon?: string;
  colors: any;
  shadows: any;
}> = ({ title, value, suffix = '%', tone = 'success', icon = '🚀', colors, shadows }) => {
  const toneColors: Record<string, string> = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };
  const accent = toneColors[tone];
  const pct = Math.min(100, Math.max(0, value));

  return (
    <View style={[s.heroMetric, shadows.card, { backgroundColor: colors.card }]}>
      <View style={[s.metricStripe, { backgroundColor: accent }]} />
      <View style={s.heroMetricTop}>
        <View style={{ flex: 1 }}>
          <Text style={[s.metricTitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {title}
          </Text>
          <View style={s.heroMetricValueRow}>
            <Text style={[s.heroMetricValue, { color: colors.text }]}>
              {fmtNumber(value, 0)}
              <Text style={[s.heroMetricSuffix, { color: colors.textMuted }]}>{suffix}</Text>
            </Text>
          </View>
        </View>
        <View style={[s.heroIconBubble, { backgroundColor: accent + '22' }]}>
          <Text style={{ fontSize: 26 }}>{icon}</Text>
        </View>
      </View>
      {/* Gauge bar */}
      <View style={[s.gaugeTrack, { backgroundColor: colors.divider }]}>
        <View style={[s.gaugeFill, { width: `${pct}%`, backgroundColor: accent }]} />
      </View>
      <View style={s.gaugeScale}>
        <Text style={[s.gaugeScaleText, { color: colors.textMuted }]}>0</Text>
        <Text style={[s.gaugeScaleText, { color: colors.textMuted }]}>50</Text>
        <Text style={[s.gaugeScaleText, { color: colors.textMuted }]}>100</Text>
      </View>
    </View>
  );
};

// Operational breakdown (completed / in-progress / overdue / delayed / rejected)
// Mirrors the web "Operational Performance 2026" card: one labelled row per
// bucket with a colored horizontal bar proportional to the largest bucket.
const OperationalBreakdown: React.FC<{
  header: ProfileCardHeader | undefined;
  year: number;
  colors: any;
  shadows: any;
  t: (k: string, o?: { defaultValue?: string }) => string;
}> = ({ header, year, colors, shadows, t }) => {
  const rows = [
    { key: 'completed',  label: t('profile.completedTasks',   { defaultValue: 'Completed Tasks' }),   count: header?.tpCompleted  ?? 0, tone: colors.success },
    { key: 'inProgress', label: t('profile.inProgressTasks',  { defaultValue: 'In-Progress Tasks' }), count: header?.tpInprogress ?? 0, tone: colors.info ?? '#06B6D4' },
    { key: 'overdue',    label: t('profile.overdueTasks',     { defaultValue: 'Overdue Tasks' }),     count: header?.tpOverdue    ?? 0, tone: colors.danger },
    { key: 'delayed',    label: t('profile.delayedTasks',     { defaultValue: 'Delayed Tasks' }),     count: header?.tpDelayed    ?? 0, tone: colors.warning },
    { key: 'rejected',   label: t('profile.rejectedTasks',    { defaultValue: 'Rejected Tasks' }),    count: header?.tpRejected   ?? 0, tone: colors.textMuted },
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <View style={[s.opBreakdown, shadows.card, { backgroundColor: colors.card }]}>
      <View style={[s.opHeader, { backgroundColor: colors.primary }]}>
        <Text style={s.opHeaderText} numberOfLines={1}>
          {t('profile.operationalPerf', { defaultValue: 'Operational Performance' })} {year}
        </Text>
      </View>
      <View style={s.opBody}>
        {rows.map((r) => (
          <View key={r.key} style={s.opRow}>
            <Text style={[s.opLabel, { color: colors.text }]} numberOfLines={1}>{r.label}</Text>
            <View style={[s.opTrack, { backgroundColor: colors.divider }]}>
              <View style={[s.opFill, { width: `${(r.count / max) * 100}%`, backgroundColor: r.tone }]} />
            </View>
            <Text style={[s.opCount, { color: colors.text }]}>{r.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Horizontal bars for Attendance breakdown
const AttendanceRow: React.FC<{
  label: string;
  count: number;
  pct: number;
  tone: string;
  colors: any;
}> = ({ label, count, pct, tone, colors }) => (
  <View style={s.attRow}>
    <Text style={[s.attLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[s.attTrack, { backgroundColor: colors.divider }]}>
      <View style={[s.attFill, { width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: tone }]} />
    </View>
    <Text style={[s.attCount, { color: colors.text }]}>{count}</Text>
    <Text style={[s.attPct, { color: colors.textMuted }]}>{Math.round(pct)}%</Text>
  </View>
);

// Vertical bar-chart for the Discipline card
const DisciplineChart: React.FC<{ data: ProfileCardDiscipline[]; colors: any }> = ({ data, colors }) => {
  if (!data || data.length === 0) {
    return (
      <View style={[s.chartEmpty, { backgroundColor: colors.stripe }]}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>—</Text>
      </View>
    );
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <View style={s.chartBox}>
      <View style={s.chartBars}>
        {data.map((d, idx) => {
          const h = Math.max(4, (d.performance / 100) * 80);
          const tone = d.performance >= 70 ? colors.success : d.performance >= 40 ? colors.warning : colors.danger;
          return (
            <View key={`${d.Year}-${d.Month}-${idx}`} style={s.chartBarCol}>
              <View style={[s.chartBar, { height: h, backgroundColor: tone }]} />
              <Text style={[s.chartBarLbl, { color: colors.textMuted }]}>
                {months[(d.Month ?? 1) - 1]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Achievement tile (8 tiles below the top row)
const AchievementTile: React.FC<{
  achievement: ProfileCardAchievement;
  labelMap: Record<string, { label: string; icon: string; tone: 'primary' | 'success' | 'warning' | 'info' }>;
  footerMap: Record<string, string>;
  colors: any;
  shadows: any;
}> = ({ achievement, labelMap, footerMap, colors, shadows }) => {
  const meta = labelMap[achievement.kind] ?? { label: achievement.kind, icon: '⭐', tone: 'primary' };
  const toneColors: Record<string, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
  };
  const accent = toneColors[meta.tone];

  let footerText = '';
  if (achievement.footer && achievement.footer.includes('|')) {
    const [num, key] = achievement.footer.split('|');
    footerText = `${footerMap[key] ?? key}: ${num}`;
  } else if (achievement.footer && footerMap[achievement.footer]) {
    footerText = `${footerMap[achievement.footer]}: ${achievement.lastDate ? fmtDate(achievement.lastDate) : '—'}`;
  } else if (achievement.footer) {
    footerText = achievement.footer;
  }

  return (
    <View style={[s.tile, shadows.card, { backgroundColor: colors.card }]}>
      <View style={[s.tileIconWrap, { backgroundColor: accent + '22' }]}>
        <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
      </View>
      <Text style={[s.tileLabel, { color: colors.textSecondary }]} numberOfLines={2}>
        {meta.label}
      </Text>
      <Text style={[s.tileValue, { color: colors.text }]}>
        {fmtNumber(achievement.value, achievement.value < 10 ? 1 : 0)}
      </Text>
      {footerText ? (
        <Text style={[s.tileFooter, { color: colors.textMuted }]} numberOfLines={1}>
          {footerText}
        </Text>
      ) : null}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tabs content
// ─────────────────────────────────────────────────────────────────────────────
const DetailsContent: React.FC<{
  details?: ProfileDetails;
  v1Profile: any;
  colors: any;
  shadows: any;
  t: (k: string, opts?: any) => string;
  isArabic: boolean;
}> = ({ details, v1Profile, colors, shadows, t, isArabic }) => {
  const pick = (en?: string | null, ar?: string | null) => (isArabic ? ar || en : en || ar);
  const d = details;

  const email = pick(d?.email) ?? v1Profile?.email;
  const mobile = pick(d?.mobile) ?? v1Profile?.mobile;
  const extension = pick(d?.extension) ?? v1Profile?.extension;
  const phone = pick(d?.phone);
  const workLoc = pick(d?.workLocation, d?.workLocation);

  const jobDesc = pick(d?.jobDescription, d?.jobDescriptionAr);
  const jobName = pick(d?.jobName, d?.jobNameAr) ?? v1Profile?.jobTitle;

  const sector = pick(d?.sector, d?.sectorAr) ?? v1Profile?.sector;
  const department = pick(d?.department, d?.departmentAr) ?? v1Profile?.department;
  const section = pick(d?.section, d?.sectionAr) ?? v1Profile?.section;
  const grade = pick(d?.gradeName, d?.gradeNameAr) ?? v1Profile?.gradeName;
  const manager = pick(d?.managerName, d?.managerNameAr) ?? v1Profile?.managerName;
  const employeeType = pick(d?.employeeType, d?.employeeTypeAr);
  const recruitment = pick(d?.recruitmentAgency, d?.recruitmentAgencyAr);

  const gender = pick(d?.gender, d?.genderAr);
  const nationality = pick(d?.nationality, d?.nationalityAr);
  const marital = pick(d?.maritalStatus, d?.maritalStatusAr);
  const religion = pick(d?.religion, d?.religionAr);

  return (
    <View>
      {/* ── Job Description ─────────────────────────────────────────── */}
      <SectionHeader icon="💼" title={t('profile.jobDescription', { defaultValue: 'Job Description' })} colors={colors} />
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <Row icon="🎯" label={t('profile.jobTitle', { defaultValue: 'Job Title' })} value={jobName} colors={colors} />
        <Row icon="🏢" label={t('profile.sector', { defaultValue: 'Sector' })} value={sector} colors={colors} />
        <Row icon="🏛️" label={t('profile.department', { defaultValue: 'Department' })} value={department} colors={colors} />
        <Row icon="📂" label={t('profile.section', { defaultValue: 'Section' })} value={section} colors={colors} />
        <Row icon="📊" label={t('profile.grade', { defaultValue: 'Grade' })} value={grade} colors={colors} />
        <Row icon="👤" label={t('profile.manager', { defaultValue: 'Manager' })} value={manager} colors={colors} />
        <Row
          icon="📅"
          label={t('profile.joiningDate', { defaultValue: 'Date of Joining' })}
          value={fmtDate(d?.joinDate) !== '—' ? fmtDate(d?.joinDate) : v1Profile?.joiningDate}
          colors={colors}
        />
        <Row
          icon="✅"
          label={t('profile.confirmationDate', { defaultValue: 'Confirmation Date' })}
          value={fmtDate(d?.confirmationDate)}
          colors={colors}
        />
        <Row icon="👔" label={t('profile.employeeType', { defaultValue: 'Employee Type' })} value={employeeType} colors={colors} last={!jobDesc} />
        {jobDesc ? (
          <Row icon="📝" label={t('profile.jobDescription', { defaultValue: 'Description' })} value={jobDesc} colors={colors} last />
        ) : null}
      </View>

      {/* ── Contact ─────────────────────────────────────────────────── */}
      <SectionHeader icon="📒" title={t('profile.contact', { defaultValue: 'Contact Information' })} colors={colors} />
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <Row icon="📧" label="Email" value={email} colors={colors} />
        <Row icon="📱" label={t('profile.mobile', { defaultValue: 'Mobile' })} value={mobile} colors={colors} />
        <Row icon="☎️" label={t('profile.extension', { defaultValue: 'Extension' })} value={extension} colors={colors} />
        <Row icon="📞" label={t('profile.phone', { defaultValue: 'Phone' })} value={phone} colors={colors} />
        <Row icon="📍" label={t('profile.workLocation', { defaultValue: 'Work Location' })} value={workLoc} colors={colors} last />
      </View>

      {/* ── Personal ────────────────────────────────────────────────── */}
      <SectionHeader icon="🧑" title={t('profile.personal', { defaultValue: 'Personal Information' })} colors={colors} />
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <Row icon="🚻" label={t('profile.gender', { defaultValue: 'Gender' })} value={gender} colors={colors} />
        <Row icon="🎂" label={t('profile.dob', { defaultValue: 'Date of Birth' })} value={fmtDate(d?.dateOfBirth)} colors={colors} />
        <Row icon="📍" label={t('profile.placeOfBirth', { defaultValue: 'Place of Birth' })} value={d?.placeOfBirth} colors={colors} />
        <Row icon="🌍" label={t('profile.nationality', { defaultValue: 'Nationality' })} value={nationality} colors={colors} />
        <Row icon="💍" label={t('profile.maritalStatus', { defaultValue: 'Marital Status' })} value={marital} colors={colors} />
        <Row icon="🕊️" label={t('profile.religion', { defaultValue: 'Religion' })} value={religion} colors={colors} />
        <Row icon="🏠" label={t('profile.address', { defaultValue: 'Address' })} value={d?.address} colors={colors} />
        <Row icon="🆔" label={t('profile.unifiedNumber', { defaultValue: 'Unified Number' })} value={d?.unifiedNumber} colors={colors} last />
      </View>

      {/* ── Recruitment ─────────────────────────────────────────────── */}
      {recruitment ? (
        <>
          <SectionHeader icon="🗂️" title={t('profile.recruitment', { defaultValue: 'Recruitment' })} colors={colors} />
          <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
            <Row
              icon="🏢"
              label={t('profile.recruitmentAgency', { defaultValue: 'Recruitment Agency' })}
              value={recruitment}
              colors={colors}
              last
            />
          </View>
        </>
      ) : null}
    </View>
  );
};

const PerformanceContent: React.FC<{
  card?: ProfileCard;
  year: number;
  colors: any;
  shadows: any;
  t: (k: string, opts?: any) => string;
}> = ({ card, year, colors, shadows, t }) => {
  const header: ProfileCardHeader | undefined = (card?.header ?? [])[0];

  const attendanceRows = useMemo(() => {
    if (!header) return [] as Array<{ label: string; count: number; pct: number; tone: string }>;
    const wd = header.workingDays || 1;
    return [
      { label: t('profile.absent', { defaultValue: 'Absent' }), count: header.absent ?? 0, pct: ((header.absent ?? 0) / wd) * 100, tone: colors.danger },
      { label: t('profile.late', { defaultValue: 'Late' }), count: header.late ?? 0, pct: ((header.late ?? 0) / wd) * 100, tone: colors.warning },
      { label: t('profile.earlyOut', { defaultValue: 'Early Out' }), count: header.earlyOut ?? 0, pct: ((header.earlyOut ?? 0) / wd) * 100, tone: colors.info },
      { label: t('profile.sickLeave', { defaultValue: 'Sick Leave' }), count: header.sickLeave ?? 0, pct: ((header.sickLeave ?? 0) / wd) * 100, tone: colors.primary },
    ];
  }, [header, colors, t]);

  const lastTwoAppraisals = (card?.appraisals ?? []).slice(1, 3);
  const latestAppraisal = (card?.appraisals ?? [])[0];

  const strategic = header?.strategicPerformance ?? 0;
  const appraisalScore = latestAppraisal?.score ?? header?.lastEvaluation ?? 0;
  const taskPerf = header?.taskPerformance ?? 0;

  const operationalTone: 'success' | 'warning' | 'danger' =
    taskPerf >= 70 ? 'success' : taskPerf >= 40 ? 'warning' : 'danger';

  // Achievements label map
  const labelMap = {
    employeeOfMonth: { label: t('profile.starAward', { defaultValue: 'SCAD Star' }), icon: '⭐', tone: 'primary' as const },
    appreciations: { label: t('profile.appreciations', { defaultValue: 'Appreciations' }), icon: '🙌', tone: 'success' as const },
    ideas: { label: t('profile.ideas', { defaultValue: 'Ibdaa Ideas' }), icon: '💡', tone: 'warning' as const },
    assets: { label: t('profile.assets', { defaultValue: 'Assets' }), icon: '💻', tone: 'info' as const },
    trainingHours: { label: t('profile.trainingHours', { defaultValue: 'Training Hours' }), icon: '📚', tone: 'primary' as const },
    employeesManaged: { label: t('profile.employeesManaged', { defaultValue: 'Employees Managed' }), icon: '👥', tone: 'success' as const },
    awards: { label: t('profile.awards', { defaultValue: 'Awards' }), icon: '🥇', tone: 'warning' as const },
    volunteerHours: { label: t('profile.volunteerHours', { defaultValue: 'Volunteer Hours' }), icon: '🤝', tone: 'info' as const },
  };

  const footerMap: Record<string, string> = {
    lastAcquired: t('profile.lastAcquired', { defaultValue: 'Last acquired' }),
    lastIdeaDate: t('profile.lastIdeaDate', { defaultValue: 'Last idea' }),
    lastVolunteered: t('profile.lastVolunteered', { defaultValue: 'Last volunteered' }),
    owned: t('profile.owned', { defaultValue: 'Owned' }),
    direct: t('profile.direct', { defaultValue: 'Direct reports' }),
  };

  return (
    <View>
      {/* ── Year chip ─────────────────────────────────────────────── */}
      <View style={s.yearRow}>
        <View style={[s.yearChip, { backgroundColor: colors.success }]}>
          <Text style={s.yearChipText}>{year}</Text>
        </View>
      </View>

      {/* ── Hero: Operational Performance (full width with gauge) ── */}
      <HeroMetricCard
        title={`${t('profile.operationalPerf', { defaultValue: 'Operational Performance' })} ${year}`}
        value={taskPerf}
        tone={operationalTone}
        icon="🚀"
        colors={colors}
        shadows={shadows}
      />

      {/* ── Operational breakdown (Completed / In-Progress / Overdue / Delayed / Rejected) ── */}
      <OperationalBreakdown header={header} year={year} colors={colors} shadows={shadows} t={t} />

      {/* ── Strategic + Appraisal in 2-col grid ──────────────────── */}
      <View style={s.metricRow}>
        <MetricCard
          title={t('profile.strategicPerf', { defaultValue: 'Strategic Performance' })}
          value={strategic > 0 ? fmtNumber(strategic, 0) : 'N/A'}
          suffix={strategic > 0 ? '%' : ''}
          tone="success"
          icon="⚙️"
          footer={`📅 ${year}`}
          colors={colors}
          shadows={shadows}
        />
        <MetricCard
          title={t('profile.appraisalPerf', { defaultValue: 'Appraisal Performance' })}
          value={fmtNumber(appraisalScore, 1)}
          suffix={latestAppraisal?.year ? ` /${latestAppraisal.year}` : ''}
          tone="success"
          icon="📝"
          footer={
            lastTwoAppraisals.length > 0
              ? lastTwoAppraisals.map((a) => `${fmtNumber(a.score, 1)} (${a.year})`).join('  •  ')
              : undefined
          }
          colors={colors}
          shadows={shadows}
        />
      </View>

      {/* ── Row 2: Leave | Discipline | Attendance ───────────────── */}
      <View style={s.row2}>
        {/* Leave Balance */}
        <View style={[s.panel, s.panelThird, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[s.panelTitle, { color: colors.textSecondary }]}>
            {t('profile.leaveBalance', { defaultValue: 'Leave Balance' })}
          </Text>
          <View style={s.panelBody}>
            <View>
              <Text style={[s.leaveLine, { color: colors.text }]}>
                <Text style={s.leaveLabel}>{t('profile.availed', { defaultValue: 'Availed' })}: </Text>
                <Text style={{ color: colors.danger }}>{header?.leaveAvailed ?? 0}</Text>
              </Text>
              <Text style={[s.leaveLine, { color: colors.text }]}>
                <Text style={s.leaveLabel}>{t('profile.remaining', { defaultValue: 'Remaining' })}: </Text>
                <Text style={{ color: colors.success }}>{header?.leaveRemaining ?? 0}</Text>
              </Text>
              <View style={[s.leaveTrack, { backgroundColor: colors.divider }]}>
                <View
                  style={[
                    s.leaveFill,
                    {
                      backgroundColor: colors.success,
                      width: `${Math.min(100, header && header.leaveTotal > 0 ? (header.leaveAvailed / header.leaveTotal) * 100 : 0)}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={[s.leaveIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ fontSize: 20 }}>📅</Text>
            </View>
          </View>
        </View>

        {/* Discipline */}
        <View style={[s.panel, s.panelThird, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[s.panelTitle, { color: colors.textSecondary }]}>
            {t('profile.discipline', { defaultValue: 'Discipline' })}
          </Text>
          <DisciplineChart data={card?.discipline ?? []} colors={colors} />
        </View>

        {/* Attendance */}
        <View style={[s.panel, s.panelThird, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[s.panelTitle, { color: colors.textSecondary }]}>
            {t('profile.attendance', { defaultValue: 'Attendance' })}
          </Text>
          {attendanceRows.map((r) => (
            <AttendanceRow key={r.label} {...r} colors={colors} />
          ))}
        </View>
      </View>

      {/* ── Achievement Tiles ─────────────────────────────────────── */}
      <SectionHeader icon="🏅" title={t('profile.achievements', { defaultValue: 'Achievements' })} colors={colors} />
      <View style={s.tileGrid}>
        {(card?.achievements ?? []).map((a) => (
          <AchievementTile
            key={a.kind}
            achievement={a}
            labelMap={labelMap}
            footerMap={footerMap}
            colors={colors}
            shadows={shadows}
          />
        ))}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
const ProfileScreen: React.FC<{ navigation: any }> = () => {
  const { t, i18n } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const insets = useSafeAreaInsets();

  const hashColor = useCallback(
    (str?: string) => {
      if (!str) return accentChroma(colors, skin, 0);
      let h = 0;
      for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
      return accentChroma(colors, skin, Math.abs(h));
    },
    [colors, skin],
  );
  const isArabic = (i18n.language || '').toLowerCase().startsWith('ar') || I18nManager.isRTL;

  const [tab, setTab] = useState<TabKey>('details');
  const [year] = useState<number>(new Date().getFullYear());

  const {
    data: v1Profile,
    isLoading: v1Loading,
    isFetching: v1Fetching,
    isError: v1Error,
    error: v1Err,
    refetch: refetchV1,
  } = useGetProfileQuery();
  const {
    data: details,
    isFetching: detailsFetching,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = useV2GetProfileDetailsQuery(isArabic ? 'ar-ae' : 'en-us');
  const {
    data: card,
    isFetching: cardFetching,
    isLoading: cardLoading,
    refetch: refetchCard,
  } = useV2GetProfileCardQuery({ year, lang: isArabic ? 'ar-ae' : 'en-us' });

  const loading = v1Loading && !v1Profile && !details;
  const refreshing =
    (v1Fetching || detailsFetching || cardFetching) && !(v1Loading || detailsLoading || cardLoading);

  const onRefresh = () => {
    refetchV1();
    refetchDetails();
    refetchCard();
  };

  const pName = (isArabic ? details?.displayNameAr : details?.displayName) ?? v1Profile?.displayName ?? v1Profile?.name ?? '---';
  const pJobTitle = (isArabic ? details?.jobTitleAr : details?.jobTitle) ?? v1Profile?.jobTitle ?? '';
  const pEmpNo = details?.employeeNo ?? v1Profile?.employeeNo ?? '';
  const pDept = (isArabic ? details?.departmentAr : details?.department) ?? v1Profile?.department ?? '';
  const avatarBg = useMemo(
    () => hashColor(pDept || pName),
    [hashColor, pDept, pName],
  );
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const headerSub =
    colors.stackStatusBar === 'light-content' ? 'rgba(255,255,255,0.75)' : colors.textSecondary;

  return (
    <QueryStates
      loading={loading}
      apiError={!!(v1Error && !v1Profile && !details)}
      error={v1Err}
      isRefreshing={v1Fetching}
      onRetry={() => void refetchV1()}
      style={[s.root, { backgroundColor: colors.background }]}
    >
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.stackStatusBar} backgroundColor={colors.stackHeaderBackground} />

      {/* Hero Header */}
      <View style={[s.hero, { backgroundColor: colors.stackHeaderBackground, paddingTop: insets.top + 8 }]}>
        <View
          style={[
            s.avatarOuter,
            { borderColor: onStackLight ? colors.homeHeroBorder : 'rgba(255,255,255,0.25)' },
          ]}
        >
          <ProfileAvatar
            userId={details?.userId ?? v1Profile?.userId}
            name={pName}
            size={AVATAR_SIZE}
            borderRadius={AVATAR_SIZE / 2}
            backgroundColor={avatarBg}
            fontSize={32}
          />
        </View>
        <Text style={[s.heroName, { color: colors.stackHeaderText }]} numberOfLines={1}>
          {pName}
        </Text>
        {pJobTitle ? (
          <Text style={[s.heroTitle, { color: headerSub }]} numberOfLines={1}>
            {pJobTitle}
          </Text>
        ) : null}
        {pEmpNo ? (
          <View style={s.badgeRow}>
            {/* Hero is on a light surface in most themes; white-on-white made the
                badge invisible. Use a soft primary tint with primary text instead. */}
            <View
              style={[
                s.heroBadge,
                { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[s.heroBadgeText, { color: colors.primary }]}>#{pEmpNo}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Tab Bar */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        {(['details', 'performance'] as TabKey[]).map((key) => {
          const active = tab === key;
          const label =
            key === 'details'
              ? t('profile.tabDetails', { defaultValue: 'Profile Details' })
              : t('profile.tabPerformance', { defaultValue: 'Performance' });
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => setTab(key)}
              style={[
                s.tabBtn,
                active && { backgroundColor: colors.primaryLight },
              ]}
            >
              {skin.iconPresentation === 'vector' ? (
                <ThemedIcon
                  name={key === 'details' ? 'document' : 'chart'}
                  size={16}
                  color={active ? colors.primary : colors.textSecondary}
                />
              ) : (
                <Text style={[s.tabEmoji, { opacity: active ? 1 : 0.65 }]}>
                  {key === 'details' ? '📋' : '📊'}
                </Text>
              )}
              <Text
                style={[
                  s.tabText,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        refreshControl={<ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'details' ? (
          <DetailsContent
            details={details}
            v1Profile={v1Profile}
                  colors={colors}
            shadows={shadows}
            t={t}
            isArabic={isArabic}
                />
        ) : (
          <PerformanceContent card={card} year={year} colors={colors} shadows={shadows} t={t} />
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
    </QueryStates>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero
  hero: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatarOuter: {
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroName: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  heroTitle: { fontSize: 14, fontWeight: '500', paddingHorizontal: 24, textAlign: 'center' },
  badgeRow: { marginTop: 10 },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  heroBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

  // Tab bar (sits under the hero)
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabEmoji: { fontSize: 15 },
  tabText: { fontSize: 13, fontWeight: '700' },

  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 40 },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionHeaderText: { fontSize: 15, fontWeight: '700' },

  // Card primitives
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 6 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2, letterSpacing: 0.3 },
  rowValue: { fontSize: 14.5, fontWeight: '600' },

  // Hero metric card (Operational Performance — full width with gauge)
  heroMetric: {
    borderRadius: 16,
    padding: 16,
    paddingTop: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroMetricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroMetricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  heroMetricValue: { fontSize: 38, fontWeight: '800' },
  heroMetricSuffix: { fontSize: 18, fontWeight: '700' },
  heroIconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  gaugeTrack: { height: 10, borderRadius: 6, overflow: 'hidden' },
  gaugeFill: { height: 10, borderRadius: 6 },
  gaugeScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  gaugeScaleText: { fontSize: 10, fontWeight: '600' },

  // Compact metric cards (2-col grid: Strategic + Appraisal)
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    paddingTop: 16,
    overflow: 'hidden',
    minHeight: 130,
  },
  metricStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  metricTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 8,
    lineHeight: 14,
  },
  metricValue: { fontSize: 24, fontWeight: '800' },
  metricSuffix: { fontSize: 12, fontWeight: '600' },
  metricIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricFooter: { fontSize: 10.5, marginTop: 6, fontWeight: '500', lineHeight: 14 },

  yearRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  yearChipText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Row 2 panels (Leave / Discipline / Attendance)
  row2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  panel: {
    borderRadius: 14,
    padding: 12,
    minHeight: 140,
  },
  panelThird: {
    width: '100%',
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  panelBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  leaveLabel: { fontWeight: '700' },
  leaveLine: { fontSize: 13, marginBottom: 4 },
  leaveTrack: { width: 140, height: 6, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  leaveFill: { height: 6, borderRadius: 3 },
  leaveIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Discipline chart
  chartBox: { height: 100, justifyContent: 'flex-end' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 92, gap: 4 },
  chartBarCol: { flex: 1, alignItems: 'center' },
  chartBar: { width: '80%', borderRadius: 3 },
  chartBarLbl: { fontSize: 9, marginTop: 4 },
  chartEmpty: {
    height: 90,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Operational Performance breakdown (Completed / In-Progress / Overdue / Delayed / Rejected)
  opBreakdown: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  opHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  opHeaderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  opBody: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  opLabel: {
    fontSize: 13,
    fontWeight: '500',
    width: 120,
  },
  opTrack: {
    flex: 1,
    height: 8,
    borderRadius: 5,
    overflow: 'hidden',
  },
  opFill: {
    height: 8,
    borderRadius: 5,
  },
  opCount: {
    fontSize: 13,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },

  // Attendance rows
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  attLabel: { fontSize: 12, fontWeight: '600', width: 64 },
  attTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  attFill: { height: 5, borderRadius: 3 },
  attCount: { fontSize: 12, fontWeight: '700', width: 20, textAlign: 'right' },
  attPct: { fontSize: 10, width: 30, textAlign: 'right' },

  // Achievement tiles
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  tile: {
    width: '47%',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  tileIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: { fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginBottom: 6, letterSpacing: 0.2 },
  tileValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  tileFooter: { fontSize: 10.5, textAlign: 'center' },
});

export default ProfileScreen;
