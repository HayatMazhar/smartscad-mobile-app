import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetTrainingCoursesQuery, useGetMyTrainingRequestsQuery } from '../services/appraisalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { accentChroma } from '../../../app/theme/accentChroma';
import { asArray } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, toDate, SortOption } from '../../../shared/components/SortSheet';
import QueryStates from '../../../shared/components/QueryStates';

type TabKey = 'courses' | 'requests';

type CourseSort = 'nameAsc' | 'nameDesc' | 'code' | 'hoursDesc' | 'type';
type ReqSort    = 'dateDesc' | 'dateAsc' | 'status' | 'nameAsc';
const COURSE_SORTS: SortOption<CourseSort>[] = [
  { key: 'nameAsc',   label: 'Name — A to Z', icon: '🔤' },
  { key: 'nameDesc',  label: 'Name — Z to A', icon: '🔤' },
  { key: 'code',      label: 'Course code',   icon: '🔢' },
  { key: 'hoursDesc', label: 'Longest first', icon: '⏱️' },
  { key: 'type',      label: 'Type',          icon: '🏷️' },
];
const REQ_SORTS: SortOption<ReqSort>[] = [
  { key: 'dateDesc', label: 'Newest first',    icon: '📅' },
  { key: 'dateAsc',  label: 'Oldest first',    icon: '📅' },
  { key: 'status',   label: 'Status',          icon: '🏷️' },
  { key: 'nameAsc',  label: 'Course — A to Z', icon: '🔤' },
];

const TrainingScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, shadows, skin } = useTheme();
  const [tab, setTab] = useState<TabKey>('courses');
  const [courseSort, setCourseSort] = useState<CourseSort>('nameAsc');
  const [reqSort, setReqSort] = useState<ReqSort>('dateDesc');
  const [sortOpen, setSortOpen] = useState(false);

  const {
    data: coursesData,
    isFetching: fCourses,
    isLoading: lCourses,
    isError: isCoursesError,
    error: coursesLoadError,
    refetch: rCourses,
  } = useGetTrainingCoursesQuery();
  const { data: requestsData, isFetching: fRequests, isLoading: lRequests, refetch: rRequests } =
    useGetMyTrainingRequestsQuery();

  const courses = useMemo(() => {
    const list = asArray<any>(coursesData);
    switch (courseSort) {
      case 'nameAsc':   return sortRowsBy(list, 'asc',  (r) => String(r.courseName ?? ''));
      case 'nameDesc':  return sortRowsBy(list, 'desc', (r) => String(r.courseName ?? ''));
      case 'code':      return sortRowsBy(list, 'asc',  (r) => String(r.courseCode ?? ''));
      case 'hoursDesc': return sortRowsBy(list, 'desc', (r) => Number(r.trainingHours ?? 0));
      case 'type':      return sortRowsBy(list, 'asc',  (r) => String(r.courseType ?? ''));
      default:          return list;
    }
  }, [coursesData, courseSort]);
  const requests = useMemo(() => {
    const list = asArray<any>(requestsData);
    switch (reqSort) {
      case 'dateDesc': return sortRowsBy(list, 'desc', (r) => toDate(r.startDate ?? r.requestDate));
      case 'dateAsc':  return sortRowsBy(list, 'asc',  (r) => toDate(r.startDate ?? r.requestDate));
      case 'status':   return sortRowsBy(list, 'asc',  (r) => String(r.status ?? ''));
      case 'nameAsc':  return sortRowsBy(list, 'asc',  (r) => String(r.courseName ?? ''));
      default:         return list;
    }
  }, [requestsData, reqSort]);

  const refreshing = tab === 'courses' ? fCourses : fRequests;
  const pullInitialLoading = tab === 'courses' ? lCourses : lRequests;
  const onRefresh = tab === 'courses' ? rCourses : rRequests;

  const renderCourse = ({ item, index }: { item: any; index: number }) => {
    const accent = accentChroma(colors, skin, index);
    return (
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: accent }]}>
        <View style={styles.courseHeader}>
          <View style={[styles.courseIcon, { backgroundColor: `${accent}18` }]}>
            <Text style={styles.courseEmoji}>📚</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
              {item.courseName}
            </Text>
            {item.courseNameAr && item.courseNameAr !== item.courseName ? (
              <Text style={[styles.courseNameAr, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.courseNameAr}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.courseMeta}>
          {item.courseCode ? (
            <View style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>{item.courseCode}</Text>
            </View>
          ) : null}
          {item.courseType ? (
            <View style={[styles.chip, { backgroundColor: `${accent}18` }]}>
              <Text style={[styles.chipText, { color: accent }]}>{item.courseType}</Text>
            </View>
          ) : null}
          {item.trainingDays ? (
            <View style={[styles.chip, { backgroundColor: `${colors.success}18` }]}>
              <Text style={[styles.chipText, { color: colors.success }]}>{item.trainingDays}d / {item.trainingHours ?? 0}h</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const statusStyle = (status: string) => {
    const s = (status ?? '').toLowerCase();
    if (s.includes('approve')) return { bg: `${colors.success}18`, fg: colors.success };
    if (s.includes('reject') || s.includes('cancel')) return { bg: `${colors.danger}18`, fg: colors.danger };
    if (s.includes('pending') || s.includes('progress')) return { bg: `${colors.warning}18`, fg: colors.warning };
    return { bg: colors.primaryLight, fg: colors.primary };
  };

  const renderRequest = ({ item, index }: { item: any; index: number }) => {
    const st = statusStyle(item.status);
    return (
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={styles.reqHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.reqName, { color: colors.text }]} numberOfLines={2}>
              {item.courseName || item.courseNameAr || `Request #${item.id}`}
            </Text>
            {item.courseNameAr && item.courseNameAr !== item.courseName ? (
              <Text style={[styles.reqNameAr, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.courseNameAr}
              </Text>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.fg }]}>{item.status || 'Pending'}</Text>
          </View>
        </View>
        <View style={styles.reqMeta}>
          {item.startDate ? (
            <View style={styles.reqMetaItem}>
              <Text style={[styles.reqMetaLabel, { color: colors.textMuted }]}>Dates</Text>
              <Text style={[styles.reqMetaVal, { color: colors.text }]}>{item.startDate} - {item.endDate}</Text>
            </View>
          ) : null}
          {item.courseHours ? (
            <View style={styles.reqMetaItem}>
              <Text style={[styles.reqMetaLabel, { color: colors.textMuted }]}>Hours</Text>
              <Text style={[styles.reqMetaVal, { color: colors.text }]}>{item.courseHours}h</Text>
            </View>
          ) : null}
        </View>
        {item.comments ? (
          <Text style={[styles.reqComments, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.comments}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🎓</Text>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Training & Development</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {courses.length} courses available
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        {([
          { key: 'courses' as TabKey, label: 'Course Catalog', emoji: '📚', count: courses.length },
          { key: 'requests' as TabKey, label: 'My Requests', emoji: '📋', count: requests.length },
        ]).map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key}
              style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.key)} activeOpacity={0.7}
            >
              <Text style={styles.tabEmoji}>{t.emoji}</Text>
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>{t.label}</Text>
              <View style={[styles.tabCount, { backgroundColor: active ? colors.primaryLight : colors.greyCard }]}>
                <Text style={[styles.tabCountText, { color: active ? colors.primary : colors.textMuted }]}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            {tab === 'courses' ? courses.length : requests.length}
          </Text>
          <Text>{tab === 'courses' ? ' courses · ' : ' requests · '}</Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {tab === 'courses'
              ? (COURSE_SORTS.find((s) => s.key === courseSort) ?? COURSE_SORTS[0]).label.split('—')[0].trim()
              : (REQ_SORTS.find((s) => s.key === reqSort) ?? REQ_SORTS[0]).label.split('—')[0].trim()}
          </Text>
        </Text>
        <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
      </View>
      {tab === 'courses' ? (
        <SortSheet<CourseSort>
          visible={sortOpen}
          onClose={() => setSortOpen(false)}
          options={COURSE_SORTS}
          activeKey={courseSort}
          onPick={setCourseSort}
          title="Sort courses"
          colors={colors}
          shadows={shadows}
        />
      ) : (
        <SortSheet<ReqSort>
          visible={sortOpen}
          onClose={() => setSortOpen(false)}
          options={REQ_SORTS}
          activeKey={reqSort}
          onPick={setReqSort}
          title="Sort requests"
          colors={colors}
          shadows={shadows}
        />
      )}

      <QueryStates
        errorGateOnly
        loading={false}
        apiError={tab === 'courses' && isCoursesError}
        error={coursesLoadError}
        isRefreshing={refreshing}
        onRetry={onRefresh}
        style={{ flex: 1 }}
      >
      <FlatList
        data={tab === 'courses' ? courses : requests}
        keyExtractor={(item, i) => String(item.id ?? i)}
        renderItem={tab === 'courses' ? renderCourse : renderRequest}
        contentContainerStyle={styles.list}
        refreshControl={
          <ThemedRefreshControl isFetching={refreshing} isLoading={pullInitialLoading} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>{tab === 'courses' ? '📚' : '📋'}</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {tab === 'courses' ? 'No courses available' : 'No training requests'}
              </Text>
            </View>
        }
      />
      </QueryStates>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 12, paddingBottom: 8,
  },
  headerEmoji: { fontSize: 32 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 1 },

  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 12, paddingHorizontal: 12 },
  tabEmoji: { fontSize: 15 },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 2 },
  tabCountText: { fontSize: 11, fontWeight: '800' },

  sortBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortBarText: { fontSize: 12 },

  list: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },

  courseHeader: { flexDirection: 'row', gap: 12 },
  courseIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  courseEmoji: { fontSize: 20 },
  courseName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  courseNameAr: { fontSize: 12, marginTop: 2 },
  courseMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: '700' },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reqName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  reqNameAr: { fontSize: 12, marginTop: 2 },
  reqMeta: { flexDirection: 'row', gap: 20, marginTop: 10 },
  reqMetaItem: {},
  reqMetaLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  reqMetaVal: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  reqComments: { fontSize: 13, lineHeight: 18, marginTop: 8 },

  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15 },
});

export default TrainingScreen;
