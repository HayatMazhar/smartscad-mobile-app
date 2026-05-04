import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, TouchableOpacity, Linking, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetEmployeeQuery } from '../services/hrApi';
import { asObject } from '../../../shared/utils/apiNormalize';
import ProfileAvatar from '../../../shared/components/ProfileAvatar';
import ScreenHeroBackButton from '../../../shared/components/ScreenHeroBackButton';
import { accentChroma } from '../../../app/theme/accentChroma';

const AVATAR_SIZE = 96;

/** A row inside an info card. Tapping opens the appropriate handler (mailto, tel, etc). */
const InfoRow: React.FC<{
  icon: string;
  label: string;
  value?: string | null;
  onPress?: () => void;
  colors: any;
  last?: boolean;
}> = ({ icon, label, value, onPress, colors, last }) => {
  const shown = value && String(value).trim().length > 0 ? String(value).trim() : '—';
  const tappable = !!onPress && shown !== '—';
  const Body = (
    <View
      style={[
        styles.row,
        !last && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primaryLight }]}>
        <Text style={{ fontSize: 15 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text
          style={[
            styles.rowValue,
            { color: tappable ? colors.primary : colors.text },
          ]}
          numberOfLines={2}
        >
          {shown}
        </Text>
      </View>
      {tappable ? <Text style={[styles.chevron, { color: colors.primary }]}>›</Text> : null}
    </View>
  );

  return tappable ? (
    <TouchableOpacity activeOpacity={0.6} onPress={onPress}>{Body}</TouchableOpacity>
  ) : Body;
};

const SectionHeader: React.FC<{ icon: string; title: string; colors: any }> = ({ icon, title, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={{ fontSize: 16, marginRight: 8 }}>{icon}</Text>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
  </View>
);

interface RouteParams {
  userId: string;
  /** Optional pre-seed so the header renders instantly before the fetch resolves. */
  name?: string;
  jobTitle?: string;
  department?: string;
}

const EmployeeDetailScreen: React.FC<{ navigation: any; route: { params: RouteParams } }> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const insets = useSafeAreaInsets();
  const isArabic = (i18n.language || '').toLowerCase().startsWith('ar') || I18nManager.isRTL;

  const hashColor = useCallback(
    (str?: string) => {
      if (!str) return accentChroma(colors, skin, 0);
      let h = 0;
      for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
      return accentChroma(colors, skin, Math.abs(h));
    },
    [colors, skin],
  );

  const userId = route.params?.userId;
  const seedName = route.params?.name;
  const seedTitle = route.params?.jobTitle;
  const seedDept = route.params?.department;

  const { data, isLoading, isFetching, refetch, isError } = useGetEmployeeQuery(userId, {
    skip: !userId,
  });

  const emp = useMemo(() => {
    const envelope = asObject<any>(data) ?? {};
    return asObject<any>(envelope.data) ?? envelope;
  }, [data]);

  // Pick an EN / AR localized value with graceful fallback.
  const pick = (en?: string | null, ar?: string | null) =>
    (isArabic ? (ar || en) : (en || ar)) ?? '';

  const name = pick(emp?.displayName, emp?.displayNameAr) || seedName || '—';
  const jobTitle = pick(emp?.jobTitle, emp?.jobTitleAr) || seedTitle || '';
  const department = pick(emp?.department, emp?.departmentAr) || seedDept || '';
  const sector = pick(emp?.sector, emp?.sectorAr);
  const section = pick(emp?.section, emp?.sectionAr);
  const entity = pick(emp?.entity, emp?.entityAr);
  const manager = pick(emp?.managerName, emp?.managerNameAr);
  const grade = pick(emp?.gradeName, emp?.gradeNameAr);
  const employeeNo = emp?.employeeNo ?? '';

  const email = emp?.email ?? '';
  const mobile = emp?.mobile ?? '';
  const phone = emp?.phone ?? '';
  const extension = emp?.extension ?? '';

  const avatarBg = useMemo(
    () => hashColor(department || name),
    [hashColor, department, name],
  );

  const headerSub =
    colors.stackStatusBar === 'light-content' ? 'rgba(255,255,255,0.78)' : colors.textSecondary;
  const onStackLight = colors.stackStatusBar === 'dark-content';

  const dialTel = (v: string) => {
    const trimmed = String(v || '').replace(/\s+/g, '');
    if (trimmed) Linking.openURL(`tel:${trimmed}`).catch(() => {});
  };
  const sendMail = (v: string) => {
    const trimmed = String(v || '').trim();
    if (trimmed) Linking.openURL(`mailto:${trimmed}`).catch(() => {});
  };

  if (isLoading && !emp?.userId) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.stackStatusBar} backgroundColor={colors.stackHeaderBackground} />
        <ScreenHeroBackButton layout="fullscreen" onPress={() => navigation.goBack()} style={{ zIndex: 10 }} />
        <ThemedActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.stackStatusBar} backgroundColor={colors.stackHeaderBackground} />

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.stackHeaderBackground, paddingTop: insets.top + 8 }]}>
        <ScreenHeroBackButton layout="hero" onPress={() => navigation.goBack()} />
        <View
          style={[
            styles.avatarOuter,
            { borderColor: onStackLight ? colors.homeHeroBorder : 'rgba(255,255,255,0.25)' },
          ]}
        >
          <ProfileAvatar
            userId={userId}
            name={name}
            size={AVATAR_SIZE}
            borderRadius={AVATAR_SIZE / 2}
            backgroundColor={avatarBg}
            fontSize={34}
          />
        </View>
        <Text style={[styles.heroName, { color: colors.stackHeaderText }]} numberOfLines={1}>
          {name}
        </Text>
        {jobTitle ? (
          <Text style={[styles.heroTitle, { color: headerSub }]} numberOfLines={2}>
            {jobTitle}
          </Text>
        ) : null}
        {department ? (
          <View
            style={[
              styles.heroBadge,
              { backgroundColor: onStackLight ? colors.primaryLight : 'rgba(255,255,255,0.14)' },
            ]}
          >
            <Text
              style={[
                styles.heroBadgeText,
                { color: onStackLight ? colors.text : '#fff' },
              ]}
              numberOfLines={1}
            >
              {skin.iconPresentation === 'vector' ? department : `🏛️  ${department}`}
            </Text>
          </View>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
        }
      >
        {isError ? (
          <View style={[styles.errorPill, { backgroundColor: `${colors.danger}14` }]}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>
              {t('common.loadError', 'Could not load employee details')}
            </Text>
          </View>
        ) : null}

        {/* Contact */}
        <SectionHeader icon="📒" title={t('directory.contact', 'Contact')} colors={colors} />
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <InfoRow
            icon="📧"
            label={t('directory.email', 'Email')}
            value={email}
            onPress={() => sendMail(email)}
            colors={colors}
          />
          <InfoRow
            icon="📱"
            label={t('directory.mobile', 'Mobile')}
            value={mobile}
            onPress={() => dialTel(mobile)}
            colors={colors}
          />
          <InfoRow
            icon="☎️"
            label={t('directory.extension', 'Extension')}
            value={extension}
            onPress={() => dialTel(extension)}
            colors={colors}
          />
          <InfoRow
            icon="📞"
            label={t('directory.phone', 'Phone')}
            value={phone}
            onPress={() => dialTel(phone)}
            colors={colors}
            last
          />
        </View>

        {/* Work */}
        <SectionHeader icon="💼" title={t('directory.workInfo', 'Work')} colors={colors} />
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <InfoRow icon="🎯" label={t('directory.jobTitle', 'Job Title')} value={jobTitle} colors={colors} />
          <InfoRow icon="🏢" label={t('directory.sector', 'Sector')} value={sector} colors={colors} />
          <InfoRow icon="🏛️" label={t('directory.department', 'Department')} value={department} colors={colors} />
          <InfoRow icon="📂" label={t('directory.section', 'Section')} value={section} colors={colors} />
          {manager ? (
            <InfoRow icon="👤" label={t('directory.manager', 'Manager')} value={manager} colors={colors} />
          ) : null}
          {grade ? (
            <InfoRow icon="📊" label={t('directory.grade', 'Grade')} value={grade} colors={colors} />
          ) : null}
          {employeeNo ? (
            <InfoRow icon="🆔" label={t('directory.employeeNo', 'Employee No.')} value={employeeNo} colors={colors} last={!entity} />
          ) : null}
          {entity ? (
            <InfoRow icon="🏤" label={t('directory.entity', 'Entity')} value={entity} colors={colors} last />
          ) : null}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  /* Hero */
  hero: {
    position: 'relative',
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  heroTitle: {
    color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: '500',
    textAlign: 'center', paddingHorizontal: 16, marginBottom: 10,
  },
  heroBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '600' },

  /* Body */
  body: { padding: 16, paddingTop: 18, paddingBottom: 32 },

  /* Sections / cards */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 4, marginBottom: 10, marginLeft: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 14 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2, letterSpacing: 0.3 },
  rowValue: { fontSize: 14.5, fontWeight: '600' },
  chevron: { fontSize: 22, fontWeight: '300', marginLeft: 6 },

  errorPill: {
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
});

export default EmployeeDetailScreen;
