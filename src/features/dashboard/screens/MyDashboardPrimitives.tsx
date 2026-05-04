import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import type { PersonalLeaveType } from '../services/dashboardApi';
import { styles } from './myDashboardScreen.styles';

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => {
  const { colors, shadows } = useTheme();
  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card, borderColor: colors.borderLight }, style]}>
      {children}
    </View>
  );
};

export const SectionHeader: React.FC<{
  icon?: string;
  accent: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, accent, title, subtitle, actionLabel, onAction }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccentBar, { backgroundColor: accent }]} />
      {icon ? (
        <View style={[styles.sectionIconWrap, { backgroundColor: `${accent}1A` }]}>
          <Text style={styles.sectionIcon}>{icon}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={[styles.sectionAction, { backgroundColor: `${accent}15` }]}>
          <Text style={[styles.sectionActionText, { color: accent }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const HeroSplitStat: React.FC<{ label: string; value: number; tint: string }> = ({ label, value, tint }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.heroSplitCell}>
      <Text style={[styles.heroSplitValue, { color: tint }]}>{value}</Text>
      <Text style={[styles.heroSplitLabel, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export const Pill: React.FC<{ icon?: string; label: string; value: number; tint: string }> = ({
  icon: _icon,
  label,
  value,
  tint,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[styles.pillBar, { backgroundColor: tint }]} />
      <View style={styles.pillBody}>
        <Text style={[styles.pillLabel, { color: colors.textMuted }]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={[styles.pillValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
};

export const MetricCard: React.FC<{
  icon?: string;
  label: string;
  value: number | string;
  tint: string;
  onPress?: () => void;
}> = ({ icon, label, value, tint, onPress }) => {
  const { colors } = useTheme();
  const inner = (
    <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: `${tint}30` }]}>
      <View style={[styles.metricAccent, { backgroundColor: tint }]} />
      <View style={styles.metricBody}>
        {icon ? <Text style={[styles.metricIcon, { color: tint }]}>{icon}</Text> : null}
        <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
  if (!onPress) return inner;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.metricTouch}>
      {inner}
    </TouchableOpacity>
  );
};

export const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

export const LeaveRow: React.FC<{ leave: PersonalLeaveType }> = ({ leave }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const used = leave.quota === 0 ? 0 : Math.min(100, (leave.availed / leave.quota) * 100);
  const remainingPct = 100 - used;
  const tint = remainingPct < 20 ? colors.danger : remainingPct < 50 ? colors.warning : colors.success;
  return (
    <View style={styles.leaveRow}>
      <View style={styles.leaveHeader}>
        <Text style={[styles.leaveName, { color: colors.text }]} numberOfLines={1}>
          {leave.name}
        </Text>
        <View style={[styles.leaveBadge, { backgroundColor: `${tint}15`, borderColor: `${tint}40` }]}>
          <Text style={[styles.leaveBadgeText, { color: tint }]}>
            {leave.remaining}/{leave.quota}
          </Text>
        </View>
      </View>
      <View style={[styles.leaveTrack, { backgroundColor: colors.greyCard }]}>
        <View style={[styles.leaveFill, { width: `${used}%`, backgroundColor: tint }]} />
      </View>
      <Text style={[styles.leaveFoot, { color: colors.textMuted }]}>
        {t('myDashboard.leave.foot', '{{availed}} availed', { availed: leave.availed })}
      </Text>
    </View>
  );
};
