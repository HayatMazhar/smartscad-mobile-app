import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, SectionList, TouchableOpacity, StyleSheet, StatusBar, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useSearchEmployeesQuery } from '../services/hrApi';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, sortRowsBy, SortOption } from '../../../shared/components/SortSheet';
import ProfileAvatar from '../../../shared/components/ProfileAvatar';
import ScreenHeroBackButton from '../../../shared/components/ScreenHeroBackButton';
import { accentChroma } from '../../../app/theme/accentChroma';

/* ─── sort options ──────────────────────────────────────────────────── */
type DirSort = 'nameAsc' | 'nameDesc' | 'department' | 'jobTitle';
const SORTS: SortOption<DirSort>[] = [
  { key: 'nameAsc',    label: 'Name — A to Z',      icon: '🔤' },
  { key: 'nameDesc',   label: 'Name — Z to A',      icon: '🔤' },
  { key: 'department', label: 'Department',         icon: '🏢' },
  { key: 'jobTitle',   label: 'Job title',          icon: '💼' },
];

const AVATAR_SIZE = 46;

function norm(s?: string) {
  return String(s ?? '').toLowerCase();
}

interface Employee {
  id: string;
  name: string;
  nameAr?: string;
  displayName?: string;
  displayNameAr?: string;
  jobTitle?: string;
  jobTitleAr?: string;
  department?: string;
  sector?: string;
  section?: string;
  email?: string;
  extension?: string;
  mobile?: string;
  phone?: string;
  employeeNo?: string;
}

interface Section {
  title: string;
  data: Employee[];
}

const DirectoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const insets = useSafeAreaInsets();
  const isArabic = (i18n.language || '').toLowerCase().startsWith('ar') || I18nManager.isRTL;

  const hashColor = useCallback((str?: string) => {
    if (!str) return accentChroma(colors, skin, 0);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return accentChroma(colors, skin, Math.abs(h));
  }, [colors, skin]);

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<DirSort>('nameAsc');
  const [sortOpen, setSortOpen] = useState(false);

  // Load the full roster once and filter locally — snappy UX and avoids
  // thrashing the API on every keystroke. The SP already scopes to enabled
  // users, so the list matches the web portal's "All employees" view.
  const { data, isLoading, isFetching, refetch } = useSearchEmployeesQuery(undefined);
  const employees = useMemo(() => asArray<Employee>(data), [data]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return employees;
    return employees.filter((e) =>
      norm(e.name).includes(q) ||
      norm(e.nameAr).includes(q) ||
      norm(e.displayName).includes(q) ||
      norm(e.displayNameAr).includes(q) ||
      norm(e.jobTitle).includes(q) ||
      norm(e.jobTitleAr).includes(q) ||
      norm(e.department).includes(q) ||
      norm(e.section).includes(q) ||
      norm(e.sector).includes(q) ||
      norm(e.email).includes(q) ||
      norm(e.employeeNo).includes(q),
    );
  }, [employees, query]);

  const sortedList = useMemo(() => {
    switch (sortKey) {
      case 'nameAsc':    return sortRowsBy(filtered, 'asc',  (r) => norm(r.name));
      case 'nameDesc':   return sortRowsBy(filtered, 'desc', (r) => norm(r.name));
      case 'department': return sortRowsBy(filtered, 'asc',  (r) => norm(r.department));
      case 'jobTitle':   return sortRowsBy(filtered, 'asc',  (r) => norm(r.jobTitle));
      default:           return filtered;
    }
  }, [filtered, sortKey]);

  // Alphabetical buckets for Name A→Z; a single bucket for other orderings
  // so the chosen sort isn't broken up by letter headers.
  const sections: Section[] = useMemo(() => {
    if (sortKey !== 'nameAsc') {
      const labelByKey: Record<DirSort, string> = {
        nameAsc: 'All', nameDesc: 'Z → A',
        department: 'By department', jobTitle: 'By job title',
      };
      return sortedList.length > 0
        ? [{ title: labelByKey[sortKey] ?? 'All', data: sortedList }]
        : [];
    }
    const grouped: Record<string, Employee[]> = {};
    for (const emp of sortedList) {
      const letter = (emp.name ?? '#').charAt(0).toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(emp);
    }
    return Object.keys(grouped)
      .sort()
      .map((letter) => ({ title: letter, data: grouped[letter] }));
  }, [sortedList, sortKey]);

  const openEmployee = useCallback((emp: Employee) => {
    navigation.navigate('EmployeeDetail', {
      userId: emp.id,
      name: isArabic ? (emp.displayNameAr || emp.nameAr || emp.name) : emp.name,
      jobTitle: isArabic ? (emp.jobTitleAr || emp.jobTitle) : emp.jobTitle,
      department: emp.department,
    });
  }, [navigation, isArabic]);

  const renderEmployee = useCallback(({ item }: { item: Employee }) => {
    const bg = hashColor(item.department || item.name);
    const nm = isArabic ? (item.displayNameAr || item.nameAr || item.name) : item.name;
    const jt = isArabic ? (item.jobTitleAr || item.jobTitle) : item.jobTitle;
    return (
      <TouchableOpacity
        style={[styles.empCard, shadows.card, { backgroundColor: colors.card }]}
        activeOpacity={0.7}
        onPress={() => openEmployee(item)}
      >
        <ProfileAvatar
          userId={item.id}
          name={item.name}
          size={AVATAR_SIZE}
          borderRadius={AVATAR_SIZE / 2}
          backgroundColor={bg}
          fontSize={17}
        />
        <View style={styles.empInfo}>
          <Text style={[styles.empName, { color: colors.text }]} numberOfLines={1}>
            {nm}
          </Text>
          {jt ? (
            <Text style={[styles.empTitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {jt}
            </Text>
          ) : null}
          {item.department ? (
            <View style={styles.deptRow}>
              <View style={[styles.deptDot, { backgroundColor: bg }]} />
              <Text style={[styles.deptText, { color: colors.textMuted }]} numberOfLines={1}>
                {item.department}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
      </TouchableOpacity>
    );
  }, [colors, shadows, openEmployee, isArabic, hashColor]);

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionLetter, { color: colors.primary }]}>
        {section.title}
      </Text>
      <View style={[styles.sectionCount, { backgroundColor: `${colors.primary}14` }]}>
        <Text style={[styles.sectionCountText, { color: colors.primary }]}>
          {section.data.length}
        </Text>
      </View>
    </View>
  ), [colors]);

  const totalShown = sortedList.length;
  const totalAll   = employees.length;

  const headerSubColor =
    colors.stackStatusBar === 'light-content' ? 'rgba(255,255,255,0.72)' : colors.textSecondary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.stackStatusBar} backgroundColor={colors.stackHeaderBackground} />

      {/* Header — custom hero (the native stack header is hidden for this
          screen). We render an explicit back chevron so the user can always
          return to the More menu / previous screen. */}
      <View style={[styles.header, { backgroundColor: colors.stackHeaderBackground, paddingTop: insets.top + 8 }]}>
        {navigation?.canGoBack?.() ? (
          <ScreenHeroBackButton layout="hero" onPress={() => navigation.goBack()} />
        ) : null}
        <Text style={[styles.headerTitle, { color: colors.stackHeaderText }]}>
          {skin.iconPresentation === 'vector' ? '' : '👥  '}
          {t('hr.directory', 'Employee Directory')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: headerSubColor }]}>
          {query
            ? t('directory.matching', '{{n}} of {{total}} employees', { n: totalShown, total: totalAll })
            : t('directory.totalCount', '{{n}} employees', { n: totalAll })}
        </Text>
      </View>

      {/* Search + Sort (sits on top of the hero via negative margin) */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBar,
              shadows.card,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('hr.searchPlaceholder', 'Search name, title, department, section…')}
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <View style={[styles.clearDot, { backgroundColor: colors.textMuted }]}>
                  <Text style={styles.clearDotText}>✕</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.sortBtn,
              shadows.card,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
            onPress={() => setSortOpen(true)}
            activeOpacity={0.7}
            accessibilityLabel={t('common.sort', 'Sort')}
          >
            <Text style={[styles.sortBtnIcon, { color: colors.text }]}>⇅</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SortSheet<DirSort>
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        options={SORTS}
        activeKey={sortKey}
        onPick={setSortKey}
        title={t('directory.sortTitle', 'Sort directory')}
        colors={colors}
        shadows={shadows}
      />

      {/* Content */}
      {isLoading && totalAll === 0 ? (
        <View style={styles.center}>
          <ThemedActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {query
              ? t('common.noResults', 'No employees match your search')
              : t('directory.empty', 'No employees found')}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderEmployee}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  /* Hero header (stackHeader* from theme — SCAD Gov = light) */
  header: {
    position: 'relative',
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4, marginLeft: 44 },
  headerSubtitle: { fontSize: 13, fontWeight: '500', marginLeft: 44 },

  /* Search + sort */
  searchWrap: { paddingHorizontal: 16, marginTop: -22 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 0 },
  clearDot: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  clearDotText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  sortBtn: {
    width: 52, height: 52, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sortBtnIcon: { fontSize: 20, fontWeight: '900' },

  /* List */
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionLetter: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  sectionCount: {
    minWidth: 28, height: 22, borderRadius: 11,
    paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionCountText: { fontSize: 11, fontWeight: '700' },

  /* Employee card */
  empCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
  },
  empInfo: { flex: 1, marginLeft: 12 },
  empName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  empTitle: { fontSize: 13, fontWeight: '500', marginBottom: 3 },
  deptRow: { flexDirection: 'row', alignItems: 'center' },
  deptDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  deptText: { fontSize: 12, fontWeight: '500' },
  chevron: { fontSize: 22, fontWeight: '300', marginLeft: 4 },

  /* Empty */
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 22 },
});

export default DirectoryScreen;
