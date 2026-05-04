import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import {
  useGetAppraisalYearsQuery,
  useGetCurrentAppraisalQuery,
  useGetAppraisalWorkflowQuery,
  useGetPersonalObjectivesQuery,
  useGetCompetenciesQuery,
  useGetSubordinatesQuery,
  useGetAppraisalForUserQuery,
  useGetWorkflowStepsForUserQuery,
  useGetObjectivesForUserQuery,
  useGetCompetenciesForUserQuery,
} from '../services/appraisalApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { accentChroma } from '../../../app/theme/accentChroma';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import { SortSheet, SortTriggerButton, sortRowsBy, SortOption } from '../../../shared/components/SortSheet';
import QueryStates from '../../../shared/components/QueryStates';

type TabKey = 'overview' | 'objectives' | 'competencies';
type ObjSort  = 'nameAsc' | 'nameDesc' | 'weightDesc';
type CompSort = 'nameAsc' | 'nameDesc';

const OBJ_SORTS: SortOption<ObjSort>[] = [
  { key: 'nameAsc',    label: 'Name — A to Z',         icon: '🔤' },
  { key: 'nameDesc',   label: 'Name — Z to A',         icon: '🔤' },
  { key: 'weightDesc', label: 'Weight — high to low',  icon: '⚖️' },
];
const COMP_SORTS: SortOption<CompSort>[] = [
  { key: 'nameAsc',  label: 'Name — A to Z', icon: '🔤' },
  { key: 'nameDesc', label: 'Name — Z to A', icon: '🔤' },
];
const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview',     label: 'Overview',     icon: '📊' },
  { key: 'objectives',   label: 'Objectives',   icon: '🎯' },
  { key: 'competencies', label: 'Competencies', icon: '💡' },
];

const AppraisalScreen: React.FC = () => {
  const { colors, shadows, skin } = useTheme();
  const [tab, setTab]           = useState<TabKey>('overview');
  const [objSort, setObjSort]   = useState<ObjSort>('weightDesc');
  const [compSort, setCompSort] = useState<CompSort>('nameAsc');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // ── Year history list ─────────────────────────────────────────────────
  const { data: yearsRaw, refetch: rYears } = useGetAppraisalYearsQuery(
    selectedUserId ? { targetUserId: selectedUserId } : undefined
  );
  const years = useMemo(() => asArray<any>(yearsRaw), [yearsRaw]);
  // Auto-select the latest year on load / when picker switches
  React.useEffect(() => {
    if (years.length > 0 && selectedYear === null) {
      setSelectedYear(Number(years[0].year));
    }
  }, [years, selectedYear]);
  // Reset year when switching subordinate
  React.useEffect(() => { setSelectedYear(null); }, [selectedUserId]);

  const yearArg = selectedYear ? { year: selectedYear } : undefined;

  // ── Own data ──────────────────────────────────────────────────────────
  const {
    data: ownAppraisalRaw,
    isFetching: fApp,
    isLoading: lApp,
    isError: isAppError,
    error: ownAppErr,
    refetch: rApp,
  } = useGetCurrentAppraisalQuery(yearArg);
  const { data: ownWorkflowRaw, isFetching: fWf, isLoading: lWf, refetch: rWf } = useGetAppraisalWorkflowQuery(yearArg);
  const { data: ownObjectivesRaw, isFetching: fObj, isLoading: lObj, refetch: rObj } =
    useGetPersonalObjectivesQuery(yearArg);
  const { data: ownCompetRaw, isFetching: fComp, isLoading: lComp, refetch: rComp } = useGetCompetenciesQuery(yearArg);

  // ── Subordinates (manager view) ───────────────────────────────────────
  const { data: subordinatesRaw, refetch: rSub } = useGetSubordinatesQuery();
  const subordinates = useMemo(() => asArray<any>(subordinatesRaw), [subordinatesRaw]);
  const isManager    = subordinates.length > 0;

  // ── Subordinate-specific data (only fetches when a user is selected) ──
  const skip = !selectedUserId;
  const subArg = { targetUserId: selectedUserId ?? '', year: selectedYear ?? null };
  const { data: subAppraisalRaw, isFetching: fSubApp, isLoading: lSubApp, refetch: rSubApp } =
    useGetAppraisalForUserQuery(subArg, { skip });
  const { data: subWorkflowRaw, isFetching: fSubWf, isLoading: lSubWf, refetch: rSubWf } =
    useGetWorkflowStepsForUserQuery(subArg, { skip });
  const { data: subObjectivesRaw, isFetching: fSubObj, isLoading: lSubObj, refetch: rSubObj } =
    useGetObjectivesForUserQuery(subArg, { skip });
  const { data: subCompetRaw, isFetching: fSubComp, isLoading: lSubComp, refetch: rSubComp } =
    useGetCompetenciesForUserQuery(subArg, { skip });

  // ── Resolve which dataset to show ────────────────────────────────────
  const appraisal  = selectedUserId ? asObject<any>(subAppraisalRaw)  : asObject<any>(ownAppraisalRaw);
  const wfSteps    = selectedUserId ? asArray<any>(subWorkflowRaw)    : asArray<any>(ownWorkflowRaw);
  const rawObjList = selectedUserId ? asArray<any>(subObjectivesRaw)  : asArray<any>(ownObjectivesRaw);
  const rawCompList= selectedUserId ? asArray<any>(subCompetRaw)      : asArray<any>(ownCompetRaw);

  const objectives = useMemo(() => {
    switch (objSort) {
      case 'nameAsc':    return sortRowsBy(rawObjList, 'asc',  (r) => String(r.name ?? ''));
      case 'nameDesc':   return sortRowsBy(rawObjList, 'desc', (r) => String(r.name ?? ''));
      case 'weightDesc': return sortRowsBy(rawObjList, 'desc', (r) => Number(r.weight ?? 0));
      default:           return rawObjList;
    }
  }, [rawObjList, objSort]);

  const competencies = useMemo(() => {
    switch (compSort) {
      case 'nameAsc':  return sortRowsBy(rawCompList, 'asc',  (r) => String(r.name ?? ''));
      case 'nameDesc': return sortRowsBy(rawCompList, 'desc', (r) => String(r.name ?? ''));
      default:         return rawCompList;
    }
  }, [rawCompList, compSort]);

  const refreshing = selectedUserId
    ? (fSubApp || fSubWf || fSubObj || fSubComp)
    : (fApp || fWf || fObj || fComp);
  const pullInitialLoading = selectedUserId
    ? (lSubApp || lSubWf || lSubObj || lSubComp)
    : (lApp || lWf || lObj || lComp);

  const onRefresh = useCallback(() => {
    if (selectedUserId) {
      void rSubApp(); void rSubWf(); void rSubObj(); void rSubComp();
    } else {
      void rApp(); void rWf(); void rObj(); void rComp();
    }
    void rSub();
    void rYears();
  }, [selectedUserId, rApp, rWf, rObj, rComp, rSubApp, rSubWf, rSubObj, rSubComp, rSub, rYears]);

  // ── Selected subordinate name ─────────────────────────────────────────
  const selectedSub = selectedUserId
    ? subordinates.find((s) => s.userId === selectedUserId)
    : null;

  // ── Helpers ───────────────────────────────────────────────────────────
  const stepColor = (s?: string) => {
    const lower = (s ?? '').toLowerCase();
    if (lower.includes('complet')) return { bg: `${colors.success}20`, fg: colors.success };
    if (lower.includes('manager') || lower.includes('line')) return { bg: `${colors.warning}20`, fg: colors.warning };
    if (lower.includes('dg') || lower.includes('executive') || lower.includes('director')) return { bg: `${colors.danger}20`, fg: colors.danger };
    return { bg: colors.primaryLight, fg: colors.primary };
  };

  const ratingChipStyle = (rateId?: number | null, isManager?: boolean) => {
    if (!rateId) return { bg: `${colors.greyCard}40`, fg: colors.textMuted };
    if (rateId >= 4) return { bg: `${colors.success}20`, fg: colors.success };
    if (rateId === 3) return { bg: `${colors.warning}20`, fg: colors.warning };
    return { bg: `${colors.danger}20`, fg: colors.danger };
  };

  // ── Overview tab ──────────────────────────────────────────────────────
  const renderOverview = () => {
    const sc = stepColor(appraisal?.currentStep);
    const currentStep = appraisal?.currentStep ?? 'Pending';
    const score = appraisal?.overallScore;
    const finalResult = appraisal?.finalResult;
    const yearLabel = appraisal?.year ?? selectedYear;

    return (
      <View>
        {/* Period card */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <View style={styles.periodHeader}>
            <Text style={styles.periodEmoji}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.periodName, { color: colors.text }]}>
                {appraisal?.periodName ?? `Appraisal ${yearLabel ?? ''}`.trim()}
              </Text>
              <Text style={[styles.periodDates, { color: colors.textMuted }]}>
                {appraisal?.startDate ?? '—'} to {appraisal?.endDate ?? '—'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.fg }]}>{currentStep}</Text>
            </View>
          </View>
          {finalResult != null && (
            <View style={[styles.finalResultRow, { borderTopColor: colors.divider }]}>
              <Text style={[styles.finalResultLabel, { color: colors.textMuted }]}>Final Result</Text>
              <Text style={[styles.finalResultValue, { color: colors.success }]}>
                {Number(finalResult).toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Score / stats card */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.secondary }]}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreEmoji}>🎯</Text>
              <Text style={styles.scoreVal}>{objectives.length}</Text>
              <Text style={styles.scoreLabel}>Objectives</Text>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreEmoji}>💡</Text>
              <Text style={styles.scoreVal}>{competencies.length}</Text>
              <Text style={styles.scoreLabel}>Competencies</Text>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreEmoji}>📊</Text>
              <Text style={styles.scoreVal}>
                {score != null ? Number(score).toFixed(2) : '—'}
              </Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          </View>
        </View>

        {/* Workflow timeline from real DB steps */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.secTitle, { color: colors.text }]}>Appraisal Workflow</Text>
          {wfSteps.length === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={[styles.emptyInlineText, { color: colors.textMuted }]}>
                {appraisal ? 'Evaluation not started yet' : 'No appraisal found'}
              </Text>
            </View>
          ) : (
            wfSteps.map((step: any, i: number) => {
              const isDone    = step.isCompleted === true || step.isCompleted === 1;
              const isCurrent = step.isCurrent   === true || step.isCurrent   === 1;
              const dotColor  = isDone ? colors.success : isCurrent ? colors.primary : colors.greyCard;
              const sc2       = stepColor(step.stepName);
              return (
                <View key={`${step.stepId}-${i}`} style={styles.wfRow}>
                  <View style={styles.wfTimeline}>
                    <View style={[styles.wfDot, { backgroundColor: dotColor }]}>
                      {isDone    && <Text style={styles.wfCheck}>✓</Text>}
                      {isCurrent && !isDone && <Text style={styles.wfDotInner}>●</Text>}
                    </View>
                    {i < wfSteps.length - 1 && (
                      <View style={[styles.wfLine, { backgroundColor: isDone ? colors.success : colors.greyCard }]} />
                    )}
                  </View>
                  <View style={[
                    styles.wfContent,
                    isCurrent && { borderColor: sc2.fg, borderWidth: 1, borderRadius: 10, padding: 10, backgroundColor: sc2.bg },
                  ]}>
                    <Text style={[styles.wfStepName, {
                      color: isCurrent ? sc2.fg : isDone ? colors.success : colors.textMuted,
                    }]}>
                      {step.stepName}
                    </Text>
                    {isCurrent && (
                      <Text style={[styles.wfStepStatus, { color: sc2.fg }]}>
                        {step.statusText ?? 'Current Step'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    );
  };

  // ── Objectives tab ────────────────────────────────────────────────────
  const renderObjectives = () => (
    <View>
      {objectives.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No objectives found</Text>
        </View>
      ) : objectives.map((obj: any, i: number) => {
        const selfStyle = ratingChipStyle(obj.selfRateId, false);
        const mgrStyle  = ratingChipStyle(obj.managerRateId, true);
        const hasRatings = obj.selfRateId != null || obj.managerRateId != null;
        const hasQuarters = obj.q1ReviewName || obj.q2ReviewName || obj.q3ReviewName;
        return (
          <View key={obj.id ?? i} style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.objHeader}>
              <View style={[styles.objNum, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.objNumText, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.objName, { color: colors.text }]} numberOfLines={3}>
                  {obj.name}
                </Text>
                {obj.description ? (
                  <Text style={[styles.objDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                    {obj.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Weight & Type */}
            <View style={styles.objMeta}>
              {obj.weight != null && (
                <View style={[styles.objChip, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.objChipText, { color: colors.primary }]}>
                    Weight: {obj.weight}%
                  </Text>
                </View>
              )}
              {obj.completion != null && (
                <View style={[styles.objChip, { backgroundColor: `${colors.info ?? colors.primary}18` }]}>
                  <Text style={[styles.objChipText, { color: colors.info ?? colors.primary }]}>
                    Completion: {Number(obj.completion).toFixed(0)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Ratings */}
            {hasRatings && (
              <View style={[styles.ratingsBox, { backgroundColor: `${colors.greyCard}40`, borderRadius: 10 }]}>
                <View style={styles.ratingRow}>
                  <View style={styles.ratingHalf}>
                    <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>Self Rating</Text>
                    <View style={[styles.ratingBadge, { backgroundColor: selfStyle.bg }]}>
                      <Text style={[styles.ratingBadgeText, { color: selfStyle.fg }]}>
                        {obj.selfRateName || 'Not rated'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.ratingDivider, { backgroundColor: colors.divider }]} />
                  <View style={styles.ratingHalf}>
                    <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>Manager Rating</Text>
                    <View style={[styles.ratingBadge, { backgroundColor: mgrStyle.bg }]}>
                      <Text style={[styles.ratingBadgeText, { color: mgrStyle.fg }]}>
                        {obj.managerRateName || 'Not rated'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Manager remarks */}
                {obj.managerRemarks ? (
                  <Text style={[styles.ratingRemarks, { color: colors.textSecondary }]} numberOfLines={2}>
                    💬 {obj.managerRemarks}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Quarterly reviews */}
            {hasQuarters && (
              <View style={styles.quarterRow}>
                {(['q1ReviewName', 'q2ReviewName', 'q3ReviewName'] as const).map((qKey, qi) => {
                  const qName = obj[qKey];
                  if (!qName) return null;
                  const isGood = (qName as string).toLowerCase().includes('on track') ||
                                 (qName as string).toLowerCase().includes('met') ||
                                 (qName as string).toLowerCase().includes('excee');
                  return (
                    <View key={qKey} style={[styles.qChip, {
                      backgroundColor: isGood ? `${colors.success}18` : `${colors.warning}18`,
                    }]}>
                      <Text style={[styles.qChipLabel, { color: colors.textMuted }]}>Q{qi + 1}</Text>
                      <Text style={[styles.qChipText, { color: isGood ? colors.success : colors.warning }]}>
                        {qName}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  // ── Competencies tab ──────────────────────────────────────────────────
  const renderCompetencies = () => (
    <View>
      {competencies.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>💡</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No competencies found</Text>
        </View>
      ) : competencies.map((comp: any, i: number) => {
        const tc     = accentChroma(colors, skin, Number(comp.type ?? 0) + i);
        const tStyle = ratingChipStyle(comp.targetRateId);
        const eStyle = ratingChipStyle(comp.evaluatedRateId);
        return (
          <View key={comp.id ?? i} style={[
            styles.card, shadows.card,
            { backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: tc },
          ]}>
            <Text style={[styles.compName, { color: colors.text }]}>{comp.name}</Text>
            {comp.nameAr && comp.nameAr !== comp.name ? (
              <Text style={[styles.compNameAr, { color: colors.textSecondary }]}>{comp.nameAr}</Text>
            ) : null}
            {comp.description ? (
              <Text style={[styles.compDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                {comp.description}
              </Text>
            ) : null}
            <View style={styles.compTypeBadgeWrap}>
              <View style={[styles.compTypeBadge, { backgroundColor: `${tc}18` }]}>
                <Text style={[styles.compTypeText, { color: tc }]}>
                  {comp.type === 1 ? 'Core' : comp.type === 2 ? 'Leadership' : comp.type === 3 ? 'Functional' : `Type ${comp.type}`}
                </Text>
              </View>
              {comp.needPDP ? (
                <View style={[styles.compTypeBadge, { backgroundColor: `${colors.warning}18` }]}>
                  <Text style={[styles.compTypeText, { color: colors.warning }]}>Needs PDP</Text>
                </View>
              ) : null}
            </View>

            {/* Ratings */}
            {(comp.targetRateId != null || comp.evaluatedRateId != null) && (
              <View style={[styles.ratingsBox, { backgroundColor: `${colors.greyCard}40`, borderRadius: 10, marginTop: 10 }]}>
                <View style={styles.ratingRow}>
                  <View style={styles.ratingHalf}>
                    <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>Target</Text>
                    <View style={[styles.ratingBadge, { backgroundColor: tStyle.bg }]}>
                      <Text style={[styles.ratingBadgeText, { color: tStyle.fg }]}>
                        {comp.targetRateName || 'Not set'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.ratingDivider, { backgroundColor: colors.divider }]} />
                  <View style={styles.ratingHalf}>
                    <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>Evaluated</Text>
                    <View style={[styles.ratingBadge, { backgroundColor: eStyle.bg }]}>
                      <Text style={[styles.ratingBadgeText, { color: eStyle.fg }]}>
                        {comp.evaluatedRateName || 'Not rated'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const content: Record<TabKey, () => React.ReactElement> = {
    overview:     renderOverview,
    objectives:   renderObjectives,
    competencies: renderCompetencies,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Manager: subordinate picker ──────────────────────────────── */}
      {isManager && (
        <TouchableOpacity
          style={[styles.pickerBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.pickerIcon}>👤</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>Viewing appraisal of</Text>
            <Text style={[styles.pickerName, { color: colors.text }]}>
              {selectedSub ? selectedSub.name : 'My own appraisal'}
            </Text>
          </View>
          <Text style={[styles.pickerChevron, { color: colors.primary }]}>▼</Text>
        </TouchableOpacity>
      )}

      {/* ── Year filter chips ───────────────────────────────────────── */}
      {years.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={[styles.yearWrap, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
          contentContainerStyle={styles.yearBar}
        >
          {years.map((y: any) => {
            const yr = Number(y.year);
            const active = selectedYear === yr;
            const isComplete = y.isCompleted === 1 || y.isCompleted === true;
            return (
              <TouchableOpacity
                key={yr}
                onPress={() => setSelectedYear(yr)}
                activeOpacity={0.7}
                style={[
                  styles.yearChip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.divider },
                ]}
              >
                <Text style={[styles.yearChipText, { color: active ? '#fff' : colors.text }]}>
                  {yr}
                </Text>
                {isComplete && (
                  <View style={[styles.yearDot, { backgroundColor: active ? '#fff' : colors.success }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[styles.tabWrap, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
        contentContainerStyle={styles.tabBar}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key}
              style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.key)} activeOpacity={0.7}
            >
              <Text style={styles.tabEmoji}>{t.icon}</Text>
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Sort bar ─────────────────────────────────────────────────── */}
      {(tab === 'objectives' || tab === 'competencies') && (
        <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
          <Text style={[styles.sortBarText, { color: colors.textSecondary }]}>
            {tab === 'objectives'
              ? `${objectives.length} objectives`
              : `${competencies.length} competencies`}
          </Text>
          <SortTriggerButton onPress={() => setSortOpen(true)} colors={colors} />
        </View>
      )}
      {tab === 'objectives' && (
        <SortSheet<ObjSort>
          visible={sortOpen} onClose={() => setSortOpen(false)}
          options={OBJ_SORTS} activeKey={objSort} onPick={setObjSort}
          title="Sort objectives" colors={colors} shadows={shadows}
        />
      )}
      {tab === 'competencies' && (
        <SortSheet<CompSort>
          visible={sortOpen} onClose={() => setSortOpen(false)}
          options={COMP_SORTS} activeKey={compSort} onPick={setCompSort}
          title="Sort competencies" colors={colors} shadows={shadows}
        />
      )}

      {/* ── Content ──────────────────────────────────────────────────── */}
      <QueryStates
        errorGateOnly
        loading={false}
        style={{ flex: 1 }}
        apiError={!selectedUserId && !!(isAppError && !appraisal)}
        error={!selectedUserId ? ownAppErr : undefined}
        isRefreshing={fApp}
        onRetry={() => void rApp()}
      >
        {!selectedUserId && lApp ? (
          <View style={[styles.center, { backgroundColor: colors.background }]}>
            <ThemedActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
              <ThemedRefreshControl isFetching={refreshing} isLoading={pullInitialLoading} onRefresh={onRefresh} />
            }
          >
            {content[tab]()}
          </ScrollView>
        )}
      </QueryStates>

      {/* ── Subordinate picker modal ──────────────────────────────────── */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.divider }]} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Employee</Text>

          {/* Own appraisal option */}
          <TouchableOpacity
            style={[
              styles.subRow,
              !selectedUserId && { backgroundColor: colors.primaryLight },
            ]}
            onPress={() => { setSelectedUserId(null); setPickerOpen(false); }}
            activeOpacity={0.7}
          >
            <View style={[styles.subAvatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>Me</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subName, { color: colors.text }]}>My own appraisal</Text>
              <Text style={[styles.subStatus, { color: colors.textMuted }]}>Switch back to your own</Text>
            </View>
            {!selectedUserId && <Text style={{ color: colors.primary }}>✓</Text>}
          </TouchableOpacity>

          <FlatList
            data={subordinates}
            keyExtractor={(item) => item.userId}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => {
              const isSelected = selectedUserId === item.userId;
              const isComplete = (item.statusLabel ?? '').toLowerCase().includes('complet');
              return (
                <TouchableOpacity
                  style={[styles.subRow, isSelected && { backgroundColor: colors.primaryLight }]}
                  onPress={() => { setSelectedUserId(item.userId); setPickerOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.subAvatar, { backgroundColor: accentChroma(colors, skin, item.userId?.charCodeAt(5) ?? 0) + '30' }]}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                      {(item.name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.subStatus, { color: isComplete ? colors.success : colors.textMuted }]}>
                      {item.statusLabel ?? 'Not Started'}
                    </Text>
                  </View>
                  {isSelected && <Text style={{ color: colors.primary }}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Manager picker bar
  pickerBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerIcon:    { fontSize: 22 },
  pickerLabel:   { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerName:    { fontSize: 14, fontWeight: '700', marginTop: 1 },
  pickerChevron: { fontSize: 12, fontWeight: '700' },

  // Year filter
  yearWrap: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  yearBar:  { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  yearChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1,
  },
  yearChipText: { fontSize: 13, fontWeight: '700' },
  yearDot:  { width: 6, height: 6, borderRadius: 3 },

  // Tabs
  tabWrap: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  tabBar:  { paddingHorizontal: 12, gap: 4 },
  tab:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 12, paddingHorizontal: 14 },
  tabEmoji: { fontSize: 15 },
  tabText:  { fontSize: 13, fontWeight: '700' },

  // Sort bar
  sortBar:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  sortBarText: { fontSize: 12 },

  // Cards
  card:   { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16 },
  badge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Period card
  periodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  periodEmoji:  { fontSize: 28 },
  periodName:   { fontSize: 18, fontWeight: '800' },
  periodDates:  { fontSize: 12, marginTop: 2 },
  finalResultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
  },
  finalResultLabel: { fontSize: 12, fontWeight: '600' },
  finalResultValue: { fontSize: 20, fontWeight: '900' },

  // Score card
  scoreRow:    { flexDirection: 'row', alignItems: 'center' },
  scoreItem:   { flex: 1, alignItems: 'center', gap: 4 },
  scoreEmoji:  { fontSize: 22 },
  scoreVal:    { fontSize: 24, fontWeight: '900', color: '#fff' },
  scoreLabel:  { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  scoreDivider:{ width: 1, height: 40 },

  secTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },

  // Workflow
  wfRow:      { flexDirection: 'row', marginBottom: 4 },
  wfTimeline: { width: 30, alignItems: 'center' },
  wfDot:      { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  wfCheck:    { color: '#fff', fontSize: 12, fontWeight: '800' },
  wfDotInner: { color: '#fff', fontSize: 10 },
  wfLine:     { width: 2, height: 28, marginVertical: 2 },
  wfContent:  { flex: 1, marginLeft: 10, paddingVertical: 6 },
  wfStepName: { fontSize: 14, fontWeight: '700' },
  wfStepStatus:{ fontSize: 11, fontWeight: '600', marginTop: 2 },

  emptyInline:     { alignItems: 'center', paddingVertical: 16 },
  emptyInlineText: { fontSize: 13 },
  emptyWrap:  { alignItems: 'center', marginTop: 60 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyText:  { fontSize: 15 },

  // Objectives
  objHeader: { flexDirection: 'row', gap: 12 },
  objNum:    { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  objNumText:{ fontSize: 14, fontWeight: '900' },
  objName:   { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  objDesc:   { fontSize: 13, lineHeight: 18, marginTop: 4 },
  objMeta:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  objChip:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  objChipText:{ fontSize: 11, fontWeight: '700' },

  // Ratings box (used for objectives and competencies)
  ratingsBox:  { marginTop: 12, padding: 12 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center' },
  ratingHalf:  { flex: 1, alignItems: 'center', gap: 6 },
  ratingDivider:{ width: 1, height: 36, marginHorizontal: 8 },
  ratingLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  ratingBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 70, alignItems: 'center' },
  ratingBadgeText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  ratingRemarks:   { fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  // Quarterly review chips
  quarterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  qChip:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 70 },
  qChipLabel: { fontSize: 10, fontWeight: '600' },
  qChipText:  { fontSize: 11, fontWeight: '700' },

  // Competencies
  compName:       { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  compNameAr:     { fontSize: 13, marginBottom: 4 },
  compDesc:       { fontSize: 13, lineHeight: 18, marginTop: 4 },
  compTypeBadgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  compTypeBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  compTypeText:   { fontSize: 11, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:   {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12,
    maxHeight: '80%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle:  { fontSize: 17, fontWeight: '800', marginBottom: 12 },

  // Subordinate row
  subRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, marginBottom: 2 },
  subAvatar:{ width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  subName:  { fontSize: 14, fontWeight: '700' },
  subStatus:{ fontSize: 12, marginTop: 2 },
});

export default AppraisalScreen;
