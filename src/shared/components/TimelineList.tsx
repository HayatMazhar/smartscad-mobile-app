import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';
import type { AppColors } from '../../app/theme/colors';
import type { ThemeSkin } from '../../app/theme/themeSkins';
import ProfileAvatar from './ProfileAvatar';

type VisualRow = { color: string; icon: string };

const BASE: Record<string, { colorKey: keyof AppColors | 'custom'; custom?: string; icon: string; line: string }> = {
  created:        { colorKey: 'primary',        icon: '🆕', line: '·' },
  approved:       { colorKey: 'success',        icon: '✓', line: '✓' },
  rejected:       { colorKey: 'danger',         icon: '✗', line: '✗' },
  returned:       { colorKey: 'warning',        icon: '↩', line: '↩' },
  pending:        { colorKey: 'warning',        icon: '⏳', line: '…' },
  assigned:       { colorKey: 'primary',        icon: '→', line: '→' },
  skipped:        { colorKey: 'textMuted',     icon: '⤼', line: '–' },
  closed_partial: { colorKey: 'success',        icon: '◐', line: '◐' },
  back:           { colorKey: 'textSecondary',  icon: '↶', line: '↶' },
  resolved:       { colorKey: 'success',        icon: '✓', line: '✓' },
  closed:         { colorKey: 'success',        icon: '🔒', line: '■' },
  cancelled:      { colorKey: 'textMuted',     icon: '⊘', line: '×' },
  action:         { colorKey: 'textMuted',     icon: '•', line: '•' },
};

function resolveColor(colors: AppColors, colorKey: keyof AppColors | 'custom', custom?: string): string {
  if (colorKey === 'custom' && custom) return custom;
  const v = colors[colorKey as keyof AppColors];
  return typeof v === 'string' ? v : colors.textMuted;
}

export function timelineVisualFor(
  key: string | undefined,
  colors: AppColors,
  skin: ThemeSkin,
): VisualRow {
  const k = (key ?? 'action').toLowerCase();
  const row = BASE[k] ?? BASE.action;
  const color = row.custom ?? resolveColor(colors, row.colorKey, row.custom);
  const icon = skin.iconPresentation === 'vector' ? row.line : row.icon;
  return { color, icon };
}

export interface TimelineEvent {
  id?: number | string;
  statusKey?: string;
  typeName?: string;
  stepName?: string;
  comments?: string | null;
  actionDate?: string | Date | null;
  actorId?: string | null;
  actorName?: string | null;
  delegatedByName?: string | null;
}

interface Props {
  events: TimelineEvent[];
  colors: any;
  shadows: any;
  emptyLabel?: string;
  formatDate?: (d?: string | Date | null) => string | undefined;
}

function defaultFormat(d?: string | Date | null) {
  if (!d) return undefined;
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return typeof d === 'string' ? d : undefined;
  }
}

const TimelineList: React.FC<Props> = ({
  events,
  colors,
  shadows,
  emptyLabel = 'No history yet',
  formatDate = defaultFormat,
}) => {
  const { skin } = useTheme();
  if (!events || events.length === 0) {
    return (
      <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>
        {emptyLabel}
      </Text>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
      {events.map((a, i) => {
        const v = timelineVisualFor(a.statusKey, colors, skin);
        const isLast = i === events.length - 1;
        return (
          <View key={a.id ?? i} style={styles.histRow}>
            <View style={styles.histRail}>
              <View style={styles.histAvatarWrap}>
                <ProfileAvatar
                  userId={a.actorId ?? undefined}
                  name={
                    (a.actorName && a.actorName.trim()) ||
                    (a.typeName && a.typeName.trim()) ||
                    (a.actorId ? String(a.actorId) : undefined)
                  }
                  size={40}
                  borderRadius={20}
                  backgroundColor={v.color}
                />
                <View
                  style={[
                    styles.histCornerBadge,
                    { backgroundColor: v.color, borderColor: colors.background },
                  ]}
                >
                  <Text style={styles.histCornerBadgeIcon}>{v.icon}</Text>
                </View>
              </View>
              {!isLast && <View style={[styles.histConnector, { backgroundColor: colors.divider }]} />}
            </View>

            <View style={[styles.histCard, shadows.card, { backgroundColor: colors.card, flex: 1 }]}>
              <View style={styles.histTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.histAction, { color: v.color }]} numberOfLines={3}>
                    {a.typeName}
                  </Text>
                  {a.stepName ? (
                    <Text style={[styles.histStep, { color: colors.textMuted }]} numberOfLines={4}>
                      {a.stepName}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.histDate, { color: colors.textMuted }]}>
                  {formatDate(a.actionDate ?? undefined)}
                </Text>
              </View>
              {a.actorName || a.actorId ? (
                <Text style={[styles.histActor, { color: colors.text }]}>
                  {a.actorName ?? a.actorId}
                </Text>
              ) : null}
              {a.delegatedByName ? (
                <Text style={[styles.histDelegated, { color: colors.textMuted }]}>
                  (Delegated by {a.delegatedByName})
                </Text>
              ) : null}
              {a.comments ? (
                <Text style={[styles.histComment, { color: colors.textSecondary }]}>{a.comments}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  histRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 10 },
  histRail: { width: 48, alignItems: 'center', marginRight: 10 },
  histAvatarWrap: { width: 40, height: 40, position: 'relative' },
  histCornerBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histCornerBadgeIcon: { color: '#fff', fontSize: 9, fontWeight: '900', lineHeight: 11 },
  histConnector: { flex: 1, width: 2, marginTop: 6, marginBottom: -10, borderRadius: 1 },
  histCard: { borderRadius: 10, padding: 12 },
  histTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  histAction: { fontSize: 13, fontWeight: '700' },
  histStep: { fontSize: 11, marginTop: 1 },
  histDate: { fontSize: 11 },
  histActor: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  histDelegated: { fontSize: 11, fontWeight: '600', marginTop: 2, fontStyle: 'italic' },
  histComment: { fontSize: 13, lineHeight: 18, marginTop: 4 },
});

export default TimelineList;
