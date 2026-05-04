import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ScrollView, Modal, Pressable } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetTaskHubQuery, useGetTaskHubFiltersQuery } from '../services/taskApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { accentChroma } from '../../../app/theme/accentChroma';
import { asArray } from '../../../shared/utils/apiNormalize';
import { resolveHubItemRoute } from '../utils/taskRouting';
import DateField from '../../../shared/components/DateField';
import ThemedIcon from '../../../shared/components/ThemedIcon';
import QueryStates from '../../../shared/components/QueryStates';
import TaskListSkeleton from '../../../shared/components/skeleton/TaskListSkeleton';
import type { SemanticIconName } from '../../../app/theme/semanticIcons';

// =============================================================================
// Task Hub list — full parity with the web portal /taskmgmt/index.aspx.
// All filters are sent to the server (GetUserHub via spMobile_Tasks_GetHub);
// this screen only does sort + client-side search narrowing after fetch.
// =============================================================================

type TaskActionId = 0 | 1 | 2 | 3 | 9 | 11 | 12;
type TaskStatusId = 0 | 4 | 5 | 6 | 7 | 8 | 80;

// Quick-action pills mirror the most-used items in hub.ascx's TaskAction
// dropdown. Full list is available in the filter sheet.
const QUICK_ACTIONS: {
  id: TaskActionId; label: string; icon: string; vecIcon: SemanticIconName; color: string; managerOnly?: boolean;
}[] = [
  { id: 1, label: 'Waiting', icon: '⏳', vecIcon: 'hourglass', color: '#297DE3' },
  { id: 3, label: 'Assigned to Me', icon: '📨', vecIcon: 'document', color: '#9B6BD9' },
  { id: 2, label: 'Assigned by Me', icon: '📤', vecIcon: 'pencil', color: '#60C6B5' },
  { id: 9, label: 'My Resources', icon: '👥', vecIcon: 'team', color: '#F9BA53', managerOnly: true },
  { id: 0, label: 'All', icon: '📋', vecIcon: 'waitTask', color: '#94A3B8' },
];

type SortKey = 'dueAsc' | 'dueDesc' | 'recent' | 'pctAsc' | 'pctDesc' | 'name';
const SORTS: { key: SortKey; label: string; icon: string }[] = [
  { key: 'dueAsc',  label: 'Due date — earliest first', icon: '📅' },
  { key: 'dueDesc', label: 'Due date — latest first',   icon: '📅' },
  { key: 'recent',  label: 'Recently added',            icon: '🆕' },
  { key: 'pctAsc',  label: 'Completion — lowest first', icon: '📉' },
  { key: 'pctDesc', label: 'Completion — highest first', icon: '📈' },
  { key: 'name',    label: 'Name — A to Z',             icon: '🔤' },
];

const toTime = (v?: string | null) => (v ? new Date(v).getTime() : 0);
const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Default end date matches the web portal: today + 1 month.
const defaultEndDateISO = () => {
  const d = new Date(); d.setMonth(d.getMonth() + 1);
  return toISODate(d);
};

const TaskListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows, skin } = useTheme();

  const statusColor = useCallback(
    (row: any) => {
      const k = String(row?.statusKey ?? '').toLowerCase();
      if (k === 'overdue' || row?.isOverdue) return { bg: `${colors.danger}25`, text: colors.danger };
      if (k === 'completed' || row?.isCompleted) return { bg: `${colors.success}25`, text: colors.success };
      if (k === 'inprogress' || row?.isInProgress) return { bg: colors.primaryLight, text: colors.primary };
      if (k === 'delayed' || row?.isDelayed) return { bg: `${colors.warning}28`, text: colors.warning };
      if (k === 'rejected') return { bg: `${colors.danger}25`, text: colors.danger };
      if (k === 'approved') return { bg: `${colors.success}25`, text: colors.success };
      if (k === 'waiting') return { bg: colors.primaryLight, text: colors.primary };
      return { bg: colors.greyCard, text: colors.textMuted };
    },
    [colors],
  );

  // ─── Filter state ──────────────────────────────────────────────────────
  const [taskAction, setTaskAction] = useState<TaskActionId>(1);       // Waiting by default
  const [taskStatus, setTaskStatus] = useState<TaskStatusId>(0);       // All
  const [startDate,  setStartDate]  = useState<string>('');            // '' = null
  const [endDate,    setEndDate]    = useState<string>(defaultEndDateISO());
  const [selectedModules, setSelectedModules] = useState<string[]>([]); // [] = all
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');              // debounced via Apply
  const [sortKey, setSortKey] = useState<SortKey>('dueAsc');
  // Manager-only: which subordinates to narrow to.
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [assignedByIds, setAssignedByIds] = useState<string[]>([]);
  const [reporteeSearchTo, setReporteeSearchTo] = useState('');
  const [reporteeSearchBy, setReporteeSearchBy] = useState('');

  // UI-only state
  const [sortOpen, setSortOpen]     = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // ─── Filter metadata ───────────────────────────────────────────────────
  const { data: metaData } = useGetTaskHubFiltersQuery(undefined);
  const meta = (metaData as any)?.data ?? metaData ?? {};
  const isManager  = Boolean(meta?.permissions?.isManager ?? meta?.permissions?.[0]?.isManager);
  const modules    = asArray<any>(meta?.modules);
  const taskActionOptions   = asArray<any>(meta?.taskActions);
  const taskStatusOptions   = asArray<any>(meta?.taskStatuses);
  const reportees           = asArray<any>(meta?.reportees);

  // ─── Hub query ─────────────────────────────────────────────────────────
  const queryParams = useMemo(() => ({
    taskAction,
    taskStatus,
    startDate: startDate || null,
    endDate:   endDate   || null,
    csvFeedSource: selectedModules.length ? selectedModules.join(',') : null,
    // Server-side AssignedTo / AssignedBy filtering — honoured by GetUserHub
    // only when the caller is a manager (mirrors the web portal).
    csvAssignedTo: isManager && assignedToIds.length ? assignedToIds.join(',') : null,
    csvAssignedBy: isManager && assignedByIds.length ? assignedByIds.join(',') : null,
    search: search.trim() || null,
    maxRows: 200,
  }), [taskAction, taskStatus, startDate, endDate, selectedModules,
       isManager, assignedToIds, assignedByIds, search]);

  const { data, isFetching, isLoading, refetch, isError, error } = useGetTaskHubQuery(queryParams);
  const allRows = asArray<any>(data);

  // ─── Client-side sort only (filtering is server-side) ──────────────────
  const rows = useMemo(() => {
    const list = [...allRows].sort((a, b) => {
      switch (sortKey) {
        case 'dueAsc':  return toTime(a.finishDate) - toTime(b.finishDate);
        case 'dueDesc': return toTime(b.finishDate) - toTime(a.finishDate);
        case 'recent':  return toTime(b.recordTimestamp ?? b.createdDate) - toTime(a.recordTimestamp ?? a.createdDate);
        case 'pctAsc':  return (a.completionPercentage ?? 0) - (b.completionPercentage ?? 0);
        case 'pctDesc': return (b.completionPercentage ?? 0) - (a.completionPercentage ?? 0);
        case 'name':    return String(a.title ?? '').localeCompare(String(b.title ?? ''));
        default:        return 0;
      }
    });
    return list;
  }, [allRows, sortKey]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (taskAction !== 1 ? 1 : 0) +
    (taskStatus !== 0 ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate && endDate !== defaultEndDateISO() ? 1 : 0) +
    (selectedModules.length ? 1 : 0) +
    (isManager && assignedToIds.length ? 1 : 0) +
    (isManager && assignedByIds.length ? 1 : 0);

  const resetFilters = () => {
    setTaskAction(1);
    setTaskStatus(0);
    setStartDate('');
    setEndDate(defaultEndDateISO());
    setSelectedModules([]);
    setAssignedToIds([]); setAssignedByIds([]);
    setReporteeSearchTo(''); setReporteeSearchBy('');
    setSearch(''); setPendingSearch('');
    setSortKey('dueAsc');
  };

  // Filter reportees client-side for the searchable multi-selects.
  const filteredReporteesTo = useMemo(() => {
    const q = reporteeSearchTo.trim().toLowerCase();
    if (!q) return reportees;
    return reportees.filter((r: any) =>
      String(r.displayName ?? '').toLowerCase().includes(q) ||
      String(r.userId      ?? '').toLowerCase().includes(q));
  }, [reportees, reporteeSearchTo]);
  const filteredReporteesBy = useMemo(() => {
    const q = reporteeSearchBy.trim().toLowerCase();
    if (!q) return reportees;
    return reportees.filter((r: any) =>
      String(r.displayName ?? '').toLowerCase().includes(q) ||
      String(r.userId      ?? '').toLowerCase().includes(q));
  }, [reportees, reporteeSearchBy]);

  const activeSort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];
  const quickActions = QUICK_ACTIONS.filter((q) => !q.managerOnly || isManager);

  const currentActionLabel =
    (taskActionOptions.find((o) => o.id === taskAction)?.label as string)
    || quickActions.find((q) => q.id === taskAction)?.label
    || 'Task Action';
  const currentStatusLabel =
    (taskStatusOptions.find((o) => o.id === taskStatus)?.label as string) || 'All';

  // ─── Row tap → route to the correct detail screen ───────────────────────
  const openRow = (item: any) => {
    const route = resolveHubItemRoute(item);
    // TaskList lives inside the More stack now; push the detail directly when
    // we're already on the same stack to preserve back-history.
    if (route.stack === 'More' && route.screen === 'TaskDetail') {
      navigation.navigate('TaskDetail', route.params);
    } else {
      navigation.navigate(route.stack, { screen: route.screen, params: (route as any).params });
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="screen.task_list">
      {/* Action bar: New Task + filter badge */}
      <View style={[styles.actionBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CreateTask')} activeOpacity={0.7}>
          <Text style={styles.createBtnText}>+ New Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setFiltersOpen(true)} activeOpacity={0.7}>
          {skin.iconPresentation === 'vector' ? (
            <ThemedIcon name="settings" size={18} color={colors.text} />
          ) : (
            <Text style={[styles.filterBtnIcon, { color: colors.text }]}>⚙️</Text>
          )}
          <Text style={[styles.filterBtnLabel, { color: colors.text }]}>Filters</Text>
          {activeFilterCount > 0 ? (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Search + Sort */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {skin.iconPresentation === 'vector' ? (
              <Text style={[styles.searchIcon, { color: colors.textMuted }]}>⌕</Text>
            ) : (
              <Text style={styles.searchIcon}>🔍</Text>
            )}
            <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search tasks, assignor, category…"
            placeholderTextColor={colors.textMuted}
            value={pendingSearch}
            onChangeText={setPendingSearch}
            onSubmitEditing={() => setSearch(pendingSearch)}
            returnKeyType="search"
          />
          {pendingSearch ? (
            <TouchableOpacity onPress={() => { setPendingSearch(''); setSearch(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.searchClear, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setSortOpen(true)} activeOpacity={0.7}>
          <Text style={[styles.sortBtnIcon, { color: colors.text }]}>⇅</Text>
          <Text style={[styles.sortBtnLabel, { color: colors.text }]}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Task-Action quick pills (most common filter) */}
      <View style={styles.filterStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filterRow}
        >
          {quickActions.map((f) => {
            const active = taskAction === f.id;
            return (
              <TouchableOpacity key={`a-${f.id}`}
                style={[styles.filterPill, {
                  backgroundColor: active
                    ? (skin.iconPresentation === 'vector' || skin.quickAccessStyle === 'professional' ? accentChroma(colors, skin, Number(f.id)) : f.color)
                    : colors.card,
                  borderColor: active
                    ? (skin.iconPresentation === 'vector' || skin.quickAccessStyle === 'professional' ? accentChroma(colors, skin, Number(f.id)) : f.color)
                    : colors.border,
                }]}
                onPress={() => setTaskAction(f.id)} activeOpacity={0.7}>
                {skin.iconPresentation === 'vector' ? (
                  <ThemedIcon
                    name={f.vecIcon}
                    size={14}
                    color={active ? '#fff' : colors.textMuted}
                  />
                ) : (
                  <Text style={[styles.filterIcon, { color: active ? '#fff' : colors.textMuted }]}>{f.icon}</Text>
                )}
                <Text style={[styles.filterText, { color: active ? '#fff' : colors.text }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary strip */}
      <View style={[styles.summaryRow, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          <Text style={{ fontWeight: '800', color: colors.text }}>{rows.length}</Text>
          <Text> tasks · </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }} numberOfLines={1}>{currentActionLabel}</Text>
          {taskStatus !== 0 ? (
            <>
              <Text> · </Text>
              <Text style={{ fontWeight: '700' }}>{currentStatusLabel}</Text>
            </>
          ) : null}
        </Text>
        {activeFilterCount > 0 ? (
          <TouchableOpacity onPress={resetFilters} activeOpacity={0.7}
            style={[styles.resetBtn, { borderColor: colors.border }]}>
            <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <QueryStates
        errorGateOnly
        loading={false}
        apiError={isError}
        error={error}
        isRefreshing={isFetching}
        onRetry={refetch}
        style={{ flex: 1 }}
      >
      <FlatList data={rows}
        style={styles.flatList}
        keyExtractor={(item, i) => String(item.id ?? i)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const sc = statusColor(item);
          return (
            <TouchableOpacity style={[styles.card, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => openRow(item)} activeOpacity={0.7}>
              <View style={styles.cardTop}>
                {item.taskNo ? (
                  <Text style={[styles.taskNo, { color: colors.textMuted }]}>{item.taskNo}</Text>
                ) : null}
                {item.feedSourceName ? (
                  <Text style={[styles.moduleBadge, { backgroundColor: `${colors.primary}15`, color: colors.primary }]} numberOfLines={1}>
                    {item.feedSourceName}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.taskName, { color: colors.text }]} numberOfLines={2}>
                {item.title ?? item.taskName ?? '(untitled)'}
              </Text>
              <View style={styles.cardMeta}>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{item.taskStatus ?? 'Pending'}</Text>
                </View>
                {item.completionPercentage != null ? (
                  <Text style={[styles.pct, { color: colors.textMuted }]}>{item.completionPercentage}%</Text>
                ) : null}
                {item.priority ? (
                  <Text style={[styles.catBadge, { color: colors.textMuted }]}>{item.priority}</Text>
                ) : null}
              </View>
              <View style={[styles.cardBottom, { borderTopColor: colors.divider }]}>
                <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.assignedBy ? `From: ${item.assignedBy}` : ''}
                </Text>
                <Text style={[styles.metaText, { color: item.isOverdue ? '#F76161' : colors.textMuted, fontWeight: item.isOverdue ? '700' : '400' }]}>
                  {item.finishDate ? `Due: ${new Date(item.finishDate).toLocaleDateString()}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          isLoading || (isFetching && rows.length === 0) ? (
            <TaskListSkeleton />
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {activeFilterCount > 0 ? 'No tasks match your filters' : 'No tasks found'}
              </Text>
              {activeFilterCount > 0 ? (
                <TouchableOpacity onPress={resetFilters} style={[styles.resetBtnBig, { backgroundColor: colors.primary }]}>
                  <Text style={styles.resetBtnBigText}>Clear filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />
      </QueryStates>

      {/* ─── Sort sheet ───────────────────────────────────────────────── */}
      <Modal transparent visible={sortOpen} animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSortOpen(false)}>
          <Pressable style={[styles.sheet, shadows.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Sort tasks by</Text>
            {SORTS.map((s) => {
              const active = s.key === sortKey;
              return (
                <TouchableOpacity key={s.key}
                  style={[styles.sheetRow, { backgroundColor: active ? `${colors.primary}15` : 'transparent' }]}
                  onPress={() => { setSortKey(s.key); setSortOpen(false); }}
                  activeOpacity={0.7}>
                  <Text style={styles.sheetRowIcon}>{s.icon}</Text>
                  <Text style={[styles.sheetRowText, { color: active ? colors.primary : colors.text, fontWeight: active ? '800' : '500' }]}>
                    {s.label}
                  </Text>
                  {active ? <Text style={[styles.sheetCheck, { color: colors.primary }]}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Filters sheet (full parity with hub.ascx) ─────────────────── */}
      <Modal transparent visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setFiltersOpen(false)}>
          <Pressable style={[styles.filterSheet, shadows.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation?.()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.divider }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Filter tasks</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Date range */}
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <DateField label="Start Date" value={startDate} onChange={setStartDate} placeholder="Any" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <DateField label="End Date" value={endDate} onChange={setEndDate} placeholder="Any" />
                </View>
              </View>

              {/* Task Action dropdown (full list) */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Task Action</Text>
              <View style={styles.pillWrap}>
                {(taskActionOptions.length ? taskActionOptions : quickActions.map((q) => ({ id: q.id, label: q.label })))
                  .map((o: any) => {
                    const active = taskAction === o.id;
                    return (
                      <TouchableOpacity key={`ta-${o.id}`}
                        style={[styles.optionPill, {
                          backgroundColor: active ? colors.primary : colors.background,
                          borderColor: active ? colors.primary : colors.border,
                        }]}
                        onPress={() => setTaskAction(o.id)} activeOpacity={0.7}>
                        <Text style={[styles.optionPillText, { color: active ? '#fff' : colors.text }]}>{o.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              {/* Task Status dropdown trigger */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Task Status</Text>
              <TouchableOpacity
                style={[styles.dropdownBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setStatusMenuOpen((v) => !v)} activeOpacity={0.7}>
                <Text style={[styles.dropdownText, { color: colors.text }]}>{currentStatusLabel}</Text>
                <Text style={{ color: colors.textMuted }}>▾</Text>
              </TouchableOpacity>
              {statusMenuOpen ? (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  {(taskStatusOptions.length ? taskStatusOptions : [
                    { id: 0, label: 'All' }, { id: 4, label: 'Approved' }, { id: 5, label: 'Completed' },
                    { id: 6, label: 'Delayed' }, { id: 7, label: 'In Progress' }, { id: 8, label: 'Overdue' },
                    { id: 80, label: 'Rejected' },
                  ]).map((o: any) => (
                    <TouchableOpacity key={`ts-${o.id}`}
                      style={[styles.dropdownRow, { borderBottomColor: colors.divider }]}
                      onPress={() => { setTaskStatus(o.id); setStatusMenuOpen(false); }} activeOpacity={0.7}>
                      <Text style={[styles.dropdownRowText, { color: taskStatus === o.id ? colors.primary : colors.text }]}>
                        {o.label}
                      </Text>
                      {taskStatus === o.id ? <Text style={[styles.sheetCheck, { color: colors.primary }]}>✓</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Modules multi-select */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type (Module)</Text>
              <View style={styles.pillWrap}>
                <TouchableOpacity
                  style={[styles.optionPill, {
                    backgroundColor: selectedModules.length === 0 ? colors.primary : colors.background,
                    borderColor: selectedModules.length === 0 ? colors.primary : colors.border,
                  }]}
                  onPress={() => setSelectedModules([])} activeOpacity={0.7}>
                  <Text style={[styles.optionPillText, { color: selectedModules.length === 0 ? '#fff' : colors.text }]}>
                    All
                  </Text>
                </TouchableOpacity>
                {modules.map((m: any) => {
                  const active = selectedModules.includes(m.id);
                  return (
                    <TouchableOpacity key={`m-${m.id}`}
                      style={[styles.optionPill, {
                        backgroundColor: active ? colors.primary : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                      }]}
                      onPress={() => {
                        setSelectedModules((cur) =>
                          cur.includes(m.id) ? cur.filter((x) => x !== m.id) : [...cur, m.id]
                        );
                      }}
                      activeOpacity={0.7}>
                      <Text style={[styles.optionPillText, { color: active ? '#fff' : colors.text }]} numberOfLines={1}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Manager-only: Assigned To / Assigned By (mirrors hub.ascx selResources / selResourcesBy) */}
              {isManager && reportees.length > 0 ? (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Assigned To ({assignedToIds.length || 'any'})
                  </Text>
                  <View style={[styles.searchBoxInline, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search your team…"
                      placeholderTextColor={colors.textMuted}
                      value={reporteeSearchTo}
                      onChangeText={setReporteeSearchTo}
                    />
                    {assignedToIds.length ? (
                      <TouchableOpacity onPress={() => setAssignedToIds([])}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.searchClear, { color: colors.textMuted }]}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <ScrollView
                    style={styles.reporteeList}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled">
                    {filteredReporteesTo.slice(0, 50).map((r: any) => {
                      const active = assignedToIds.includes(r.userId);
                      return (
                        <TouchableOpacity key={`to-${r.userId}`}
                          style={[styles.reporteeRow, { borderBottomColor: colors.divider, backgroundColor: active ? `${colors.primary}15` : 'transparent' }]}
                          onPress={() => setAssignedToIds((cur) =>
                            cur.includes(r.userId) ? cur.filter((x) => x !== r.userId) : [...cur, r.userId])}
                          activeOpacity={0.7}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.reporteeName, { color: colors.text }]} numberOfLines={1}>
                              {r.displayName || r.userId}
                            </Text>
                            {r.jobTitle ? (
                              <Text style={[styles.reporteeMeta, { color: colors.textMuted }]} numberOfLines={1}>
                                {r.jobTitle}
                              </Text>
                            ) : null}
                          </View>
                          {active ? <Text style={[styles.sheetCheck, { color: colors.primary }]}>✓</Text> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    Assigned By ({assignedByIds.length || 'any'})
                  </Text>
                  <View style={[styles.searchBoxInline, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={[styles.searchInput, { color: colors.text }]}
                      placeholder="Search your team…"
                      placeholderTextColor={colors.textMuted}
                      value={reporteeSearchBy}
                      onChangeText={setReporteeSearchBy}
                    />
                    {assignedByIds.length ? (
                      <TouchableOpacity onPress={() => setAssignedByIds([])}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.searchClear, { color: colors.textMuted }]}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <ScrollView
                    style={styles.reporteeList}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled">
                    {filteredReporteesBy.slice(0, 50).map((r: any) => {
                      const active = assignedByIds.includes(r.userId);
                      return (
                        <TouchableOpacity key={`by-${r.userId}`}
                          style={[styles.reporteeRow, { borderBottomColor: colors.divider, backgroundColor: active ? `${colors.primary}15` : 'transparent' }]}
                          onPress={() => setAssignedByIds((cur) =>
                            cur.includes(r.userId) ? cur.filter((x) => x !== r.userId) : [...cur, r.userId])}
                          activeOpacity={0.7}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.reporteeName, { color: colors.text }]} numberOfLines={1}>
                              {r.displayName || r.userId}
                            </Text>
                            {r.jobTitle ? (
                              <Text style={[styles.reporteeMeta, { color: colors.textMuted }]} numberOfLines={1}>
                                {r.jobTitle}
                              </Text>
                            ) : null}
                          </View>
                          {active ? <Text style={[styles.sheetCheck, { color: colors.primary }]}>✓</Text> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              {/* Apply / Reset */}
              <View style={styles.sheetBtnRow}>
                <TouchableOpacity
                  style={[styles.sheetBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => { resetFilters(); }} activeOpacity={0.7}>
                  <Text style={[styles.sheetBtnText, { color: colors.text }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setSearch(pendingSearch); setFiltersOpen(false); }} activeOpacity={0.7}>
                  <Text style={[styles.sheetBtnText, { color: '#fff' }]}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, flexGrow: 0, flexShrink: 0 },
  createBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  filterBtnIcon: { fontSize: 14 },
  filterBtnLabel: { fontSize: 13, fontWeight: '700' },
  filterBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },

  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center', flexGrow: 0, flexShrink: 0 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 40 },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  searchClear: { fontSize: 16, paddingHorizontal: 4 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 40, borderRadius: 10, borderWidth: 1 },
  sortBtnIcon: { fontSize: 15, fontWeight: '900' },
  sortBtnLabel: { fontSize: 13, fontWeight: '700' },

  filterStrip: { height: 52, flexGrow: 0, flexShrink: 0, justifyContent: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, alignItems: 'center' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterIcon: { fontSize: 11 },
  filterText: { fontSize: 12, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6, flexGrow: 0, flexShrink: 0 },
  summaryText: { flex: 1, fontSize: 12 },
  resetBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  resetText: { fontSize: 11, fontWeight: '700' },

  flatList: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32, gap: 8 },
  card: { borderRadius: 12, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  taskNo: { fontSize: 11, fontWeight: '700' },
  moduleBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, maxWidth: 180 },
  taskName: { fontSize: 14, fontWeight: '700', lineHeight: 19, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  pct: { fontSize: 12, fontWeight: '700' },
  catBadge: { fontSize: 11 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 8 },
  metaText: { fontSize: 11, flexShrink: 1 },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, marginBottom: 12 },
  resetBtnBig: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  resetBtnBigText: { color: '#fff', fontWeight: '700' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginVertical: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10 },
  sheetRowIcon: { fontSize: 17 },
  sheetRowText: { flex: 1, fontSize: 14 },
  sheetCheck: { fontSize: 16, fontWeight: '900' },

  // Filters sheet
  filterSheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, maxHeight: '85%' },
  dateRow: { flexDirection: 'row', marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 12, marginBottom: 8 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, maxWidth: 220 },
  optionPillText: { fontSize: 12, fontWeight: '700' },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, borderWidth: 1 },
  dropdownText: { fontSize: 14, fontWeight: '600' },
  dropdownMenu: { marginTop: 6, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  dropdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dropdownRowText: { fontSize: 14, fontWeight: '500' },
  sheetBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  sheetBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { fontSize: 14, fontWeight: '800' },

  // Reportee (Assigned To / By) pickers — manager-only
  searchBoxInline: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 38, marginBottom: 6 },
  reporteeList: { maxHeight: 180, borderRadius: 10, overflow: 'hidden' },
  reporteeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  reporteeName: { fontSize: 13, fontWeight: '700' },
  reporteeMeta: { fontSize: 11, marginTop: 1 },
});

export default TaskListScreen;
