import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../app/theme/ThemeContext';
import ProfileAvatar from '../../../../shared/components/ProfileAvatar';
import ThemedIcon from '../../../../shared/components/ThemedIcon';
import { accentChroma } from '../../../../app/theme/accentChroma';

function pickName(row: any, isAr: boolean): string {
  if (!row) return '';
  if (isAr) {
    const ar = row.arabicName ?? row.ArabicName ?? row.nameAr;
    if (ar != null && String(ar).trim() !== '') return String(ar);
  }
  return String(row.englishName ?? row.EnglishName ?? row.name ?? '—');
}

function pickContrib(row: any): string {
  const v = row?.totalContributions ?? row?.TotalContributions ?? row?.contributions;
  if (v == null) return '—';
  return String(v);
}

function pickUserId(row: any): string | undefined {
  const u = row?.employeeUsername ?? row?.EmployeeUsername ?? row?.userId ?? row?.UserId;
  if (u == null || u === '') return undefined;
  return String(u);
}

function pickPlace(row: any, index: number): string {
  const p = row?.place ?? row?.Place ?? row?.srNo ?? row?.SrNo;
  if (p != null && String(p).trim() !== '') return String(p);
  return String(index + 1);
}

/** Home Saahem block — same visual language as SCAD Star: themed cards, horizontal list, no filters (period from API). */
const SaahemHomePodium: React.FC<{
  saahemC: boolean;
  rows: any[];
  loading: boolean;
  /** E.g. "Q1 2026" — resolved quarter label from API (empty-state copy). */
  periodLabel: string;
  /** Line under the section title (period + single vs multi-quarter). */
  subtitle: string;
  secTitleStyle: any[];
}> = ({ saahemC, rows, loading, periodLabel, subtitle, secTitleStyle }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows, skin, fontFamily, fontScale } = useTheme();
  const isAr = (i18n.language ?? 'en').toLowerCase().startsWith('ar');

  const leaders = useMemo(() => (Array.isArray(rows) ? rows.slice(0, 5) : []), [rows]);

  const width = saahemC ? 120 : 132;
  const avatarS = saahemC ? 48 : 52;
  const sub = 11 * fontScale;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={secTitleStyle}>{t('home.saahemSectionTitle', 'Saahem leaders')}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary, fontFamily, fontSize: sub }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <ThemedIcon name="qaStar" size={saahemC ? 20 : 22} color={colors.primary} />
      </View>

      {loading && leaders.length === 0 ? (
        <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth }, shadows.card]}>
          <ThemedActivityIndicator color={colors.primary} />
        </View>
      ) : leaders.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: skin.cardRadius, borderWidth: skin.cardBorderWidth }, shadows.card]}>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
            {t('home.saahemNoDataForPeriod', 'No leaders for {{period}} yet.', { period: periodLabel })}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: saahemC ? 8 : 10, paddingBottom: 4 }}
        >
          {leaders.map((row, wi) => {
            const name = pickName(row, isAr);
            const contrib = pickContrib(row);
            const uid = pickUserId(row);
            const place = pickPlace(row, wi);
            const strip = accentChroma(colors, skin, wi);
            return (
              <View
                key={`${place}-${name}-${String(uid ?? wi)}`}
                style={[
                  {
                    width,
                    borderRadius: skin.cardRadius,
                    padding: saahemC ? 10 : 12,
                    backgroundColor: colors.card,
                    borderWidth: skin.cardBorderWidth,
                    borderColor: colors.border,
                    alignItems: 'center',
                  },
                  shadows.card,
                ]}
              >
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: colors.primaryLight, borderColor: strip, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.rankText, { color: colors.primary }]}>{place}</Text>
                </View>
                <View style={{ marginTop: 8, marginBottom: 8 }}>
                  <ProfileAvatar
                    userId={uid}
                    name={name}
                    size={avatarS}
                    borderRadius={14}
                    backgroundColor={colors.primaryLight}
                    fontSize={Math.round(avatarS * 0.36)}
                  />
                </View>
                <Text
                  style={{ fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' }}
                  numberOfLines={2}
                >
                  {name}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: colors.primary,
                    textAlign: 'center',
                    marginTop: 6,
                  }}
                  numberOfLines={1}
                >
                  {contrib} {t('home.saahemContributionsShort', 'contributions')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  hint: { marginTop: 2, lineHeight: 16 },
  loadingBox: { minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyBox: { padding: 20 },
  rankBadge: { alignSelf: 'center', minWidth: 32, height: 24, paddingHorizontal: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 10, fontWeight: '800' },
});

export default SaahemHomePodium;
