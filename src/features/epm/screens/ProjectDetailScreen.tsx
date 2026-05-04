import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList, MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import { useToast } from '../../../shared/components/Toast';
import { pickOneDocumentForUpload } from '../../../shared/utils/pickDocument';
import {
  useGetProjectQuery,
  useGetProjectMilestonesQuery,
  useGetProjectRisksQuery,
  useGetProjectDeliverablesQuery,
  useGetBudgetQuery,
  useGetGanttQuery,
  useGetProjectStrategyQuery,
  useGetProjectInfoQuery,
  useGetProjectTeamQuery,
  useGetProjectIssuesQuery,
  useGetProjectChangeMgmtQuery,
  useGetProjectProcurementQuery,
  useGetProjectKPIsQuery,
  useGetProjectFinalResultQuery,
  useGetProjectLessonsQuery,
  useGetProjectPlanVersionsQuery,
  useGetProjectApprovalsQuery,
  useUploadMilestoneEvidenceMutation,
  useUpdateEPMTaskProgressMutation,
} from '../services/epmApi';
import { useEpmProjectRights } from '../hooks/useEpmProjectRights';

// ─── Types ──────────────────────────────────────────────────────────────────
type SectionKey =
  | 'overview' | 'strategy' | 'info' | 'team' | 'gantt'
  | 'milestones' | 'plan' | 'deliverables' | 'risks' | 'issues'
  | 'change' | 'report' | 'procurement' | 'kpis'
  | 'final' | 'lessons' | 'approvals';

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'overview',     label: 'Overview',        icon: '📊' },
  { key: 'strategy',     label: 'Strategy',        icon: '🎯' },
  { key: 'info',         label: 'Initiative',      icon: 'ℹ️' },
  { key: 'team',         label: 'Team',            icon: '👥' },
  { key: 'gantt',        label: 'Timeline',        icon: '📅' },
  { key: 'milestones',   label: 'Milestones',      icon: '🏁' },
  { key: 'plan',         label: 'Plan (Tasks)',     icon: '📋' },
  { key: 'deliverables', label: 'Deliverables',    icon: '📦' },
  { key: 'risks',        label: 'Risks',           icon: '⚠️' },
  { key: 'issues',       label: 'Issues',          icon: '🔴' },
  { key: 'change',       label: 'Change Mgmt',     icon: '🔄' },
  { key: 'report',       label: 'Status Report',   icon: '📝' },
  { key: 'procurement',  label: 'Procurement',     icon: '💳' },
  { key: 'kpis',         label: 'KPIs',            icon: '📈' },
  { key: 'final',        label: 'Final Result',    icon: '🏆' },
  { key: 'lessons',      label: 'Lessons',         icon: '💡' },
  { key: 'approvals',    label: 'Approvals',       icon: '✅' },
];

// ─── Status helpers ──────────────────────────────────────────────────────────
function normStatus(s: unknown): string {
  if (s == null) return '';
  if (typeof s === 'number') {
    switch (s) { case 0: return 'pending'; case 1: return 'approved'; case 2: return 'rejected'; }
  }
  return String(s).toLowerCase();
}
function statusLabel(s: unknown): string {
  if (s == null || s === '') return '—';
  if (typeof s === 'number') {
    switch (s) { case 0: return 'Pending'; case 1: return 'Approved'; case 2: return 'Rejected'; }
  }
  return String(s);
}
function statusColor(s: unknown, colors: any) {
  const k = normStatus(s);
  if (k.includes('complete') || k.includes('track') || k.includes('approved')) return { bg: `${colors.success}20`, fg: colors.success };
  if (k.includes('progress') || k.includes('plan')) return { bg: colors.primaryLight, fg: colors.primary };
  if (k.includes('risk') || k.includes('overdue') || k.includes('reject') || k.includes('critical') || k.includes('high')) return { bg: `${colors.danger}20`, fg: colors.danger };
  if (k.includes('delay') || k.includes('pending') || k.includes('medium')) return { bg: `${colors.warning}20`, fg: colors.warning };
  return { bg: colors.primaryLight, fg: colors.primary };
}

// ─── Shared components ────────────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: string; text: string; colors: any }> = ({ icon, text, colors }) => (
  <View style={s.emptyWrap}>
    <Text style={s.emptyIcon}>{icon}</Text>
    <Text style={[s.emptyText, { color: colors.textMuted }]}>{text}</Text>
  </View>
);

const SectionLoader: React.FC<{ colors: any }> = ({ colors }) => (
  <View style={s.sectionLoader}>
    <ThemedActivityIndicator color={colors.primary} />
  </View>
);

const ProgressBar: React.FC<{ pct: number; color: string; bg: string }> = ({ pct, color, bg }) => (
  <View style={[s.progressTrack, { backgroundColor: bg }]}>
    <View style={[s.progressFill, { width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: color }]} />
  </View>
);

const InfoRow: React.FC<{ label: string; value: string; colors: any }> = ({ label, value, colors }) => (
  <View style={s.infoRow}>
    <Text style={[s.infoLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[s.infoValue, { color: colors.text }]}>{value || '—'}</Text>
  </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────
const ProjectDetailScreen: React.FC<{ route: RouteProp<MoreStackParamList, 'ProjectDetail'> }> = ({ route }) => {
  const { projectId } = route.params;
  const navigation = useNavigation<MoreTabNavigation<'ProjectDetail'>>();
  const { colors, shadows } = useTheme();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const tabBarRef = useRef<ScrollView>(null);

  // ── Data queries ─────────────────────────────────────────────────────────
  const { data: projData, isLoading, isError, isFetching, refetch } = useGetProjectQuery(projectId);
  const project = useMemo(() => asObject<any>(projData) ?? projData, [projData]);

  const rights = useEpmProjectRights(project);

  // Lazy loads: only run the query for the active section
  const skipIf = (key: SectionKey) => activeSection !== key && activeSection !== 'overview';

  const { data: milData, isFetching: fMil, isLoading: lMil, refetch: rMil } = useGetProjectMilestonesQuery(projectId, {
    skip: !['milestones', 'overview'].includes(activeSection),
  });
  const { data: ganttData, isFetching: fGantt, refetch: rGantt } = useGetGanttQuery(projectId, { skip: activeSection !== 'gantt' });
  const { data: stratData, isFetching: fStrat, refetch: rStrat } = useGetProjectStrategyQuery(projectId, { skip: activeSection !== 'strategy' });
  const { data: infoData, isFetching: fInfo, refetch: rInfo }   = useGetProjectInfoQuery(projectId, { skip: activeSection !== 'info' });
  const { data: teamData, isFetching: fTeam, refetch: rTeam }   = useGetProjectTeamQuery(projectId, { skip: activeSection !== 'team' });
  const { data: riskData, isFetching: fRisk, refetch: rRisk }   = useGetProjectRisksQuery(projectId, { skip: activeSection !== 'risks' });
  const { data: delData, isFetching: fDel, refetch: rDel }      = useGetProjectDeliverablesQuery(projectId, { skip: activeSection !== 'deliverables' });
  const { data: issueData, isFetching: fIssue, refetch: rIssue } = useGetProjectIssuesQuery(projectId, { skip: activeSection !== 'issues' });
  const { data: chgData, isFetching: fChg, refetch: rChg }      = useGetProjectChangeMgmtQuery(projectId, { skip: activeSection !== 'change' });
  const { data: procData, isFetching: fProc, refetch: rProc }   = useGetProjectProcurementQuery(projectId, { skip: activeSection !== 'procurement' });
  const { data: kpiData, isFetching: fKpi, refetch: rKpi }      = useGetProjectKPIsQuery(projectId, { skip: activeSection !== 'kpis' });
  const { data: finalData, isFetching: fFinal, refetch: rFinal } = useGetProjectFinalResultQuery(projectId, { skip: activeSection !== 'final' });
  const { data: lessonData, isFetching: fLesson, refetch: rLesson } = useGetProjectLessonsQuery(projectId, { skip: activeSection !== 'lessons' });
  const { data: planData, isFetching: fPlan, refetch: rPlan }   = useGetProjectPlanVersionsQuery(projectId, { skip: activeSection !== 'plan' });
  const { data: apprData, isFetching: fAppr, refetch: rAppr }   = useGetProjectApprovalsQuery(projectId, { skip: activeSection !== 'approvals' });
  const { data: budgetData, isFetching: fBudget }               = useGetBudgetQuery(projectId, { skip: activeSection !== 'report' });

  // Mutations
  const [uploadEvidence, { isLoading: upLoading }] = useUploadMilestoneEvidenceMutation();
  const [updateProgress] = useUpdateEPMTaskProgressMutation();

  const milestones = useMemo(() => asArray<any>(milData), [milData]);
  const pct = project?.completionPercentage ?? 0;
  const badge = statusColor(project?.statusName ?? '', colors);

  const onRefresh = useCallback(() => {
    void refetch(); void rMil();
    if (activeSection === 'gantt') void rGantt();
    if (activeSection === 'strategy') void rStrat();
    if (activeSection === 'info') void rInfo();
    if (activeSection === 'team') void rTeam();
    if (activeSection === 'risks') void rRisk();
    if (activeSection === 'deliverables') void rDel();
    if (activeSection === 'issues') void rIssue();
    if (activeSection === 'change') void rChg();
    if (activeSection === 'procurement') void rProc();
    if (activeSection === 'kpis') void rKpi();
    if (activeSection === 'final') void rFinal();
    if (activeSection === 'lessons') void rLesson();
    if (activeSection === 'plan') void rPlan();
    if (activeSection === 'approvals') void rAppr();
  }, [activeSection, refetch, rMil, rGantt, rStrat, rInfo, rTeam, rRisk, rDel, rIssue, rChg, rProc, rKpi, rFinal, rLesson, rPlan, rAppr]);

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ThemedActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.errorTitle, { color: colors.text }]}>Could not load project</Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={() => void refetch()} activeOpacity={0.8}>
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Section renderers ─────────────────────────────────────────────────────

  const renderOverview = () => (
    <View>
      {/* Hero card */}
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={s.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroTitle, { color: colors.text }]}>{project?.projectName ?? project?.name}</Text>
            <Text style={[s.heroSub, { color: colors.textSecondary }]}>{project?.managerName ?? '—'}</Text>
            <View style={[s.badge, { backgroundColor: badge.bg, alignSelf: 'flex-start', marginTop: 8 }]}>
              <Text style={[s.badgeText, { color: badge.fg }]}>{statusLabel(project?.statusName)}</Text>
            </View>
          </View>
          <View style={[s.ring, { borderColor: pct >= 100 ? colors.success : colors.primary }]}>
            <Text style={[s.ringText, { color: pct >= 100 ? colors.success : colors.primary }]}>{pct}%</Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { val: project?.totalTasks ?? 0, label: 'Tasks', color: colors.primary, bg: colors.primaryLight },
          { val: project?.completedTasks ?? 0, label: 'Done', color: colors.success, bg: `${colors.success}18` },
          { val: project?.overdueTasks ?? 0, label: 'Overdue', color: colors.danger, bg: `${colors.danger}18` },
          { val: project?.riskCount ?? 0, label: 'Risks', color: colors.warning, bg: `${colors.warning}18` },
        ].map((stat) => (
          <View key={stat.label} style={[s.statCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
            <Text style={[s.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Dates */}
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <View style={s.dateRow}>
          <View>
            <Text style={[s.dateLabel, { color: colors.textMuted }]}>Start</Text>
            <Text style={[s.dateVal, { color: colors.text }]}>{project?.startDate ?? '—'}</Text>
          </View>
          <Text style={[s.dateArrow, { color: colors.textMuted }]}>→</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.dateLabel, { color: colors.textMuted }]}>End</Text>
            <Text style={[s.dateVal, { color: colors.text }]}>{project?.endDate ?? '—'}</Text>
          </View>
        </View>
        {project?.description ? (
          <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={5}>{project.description}</Text>
        ) : null}
      </View>

      {/* Quick milestones preview */}
      {milestones.length > 0 && (
        <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
          <View style={s.secHeader}>
            <Text style={s.secIcon}>🏁</Text>
            <Text style={[s.secTitle, { color: colors.text }]}>Recent Milestones</Text>
            <TouchableOpacity onPress={() => setActiveSection('milestones')}>
              <Text style={[s.seeAll, { color: colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {milestones.slice(0, 3).map((m: any, i: number) => {
            const sc = statusColor(m.status ?? '', colors);
            return (
              <View key={m.id ?? i} style={[s.quickRow, { borderBottomColor: colors.divider }]}>
                <View style={[s.quickDot, { backgroundColor: sc.fg }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.quickName, { color: colors.text }]} numberOfLines={1}>{m.milestoneName ?? m.name}</Text>
                  <Text style={[s.quickMeta, { color: colors.textMuted }]}>{m.startDate} – {m.endDate}</Text>
                </View>
                <Text style={[s.quickPct, { color: sc.fg }]}>{m.completionPercentage ?? 0}%</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderStrategy = () => {
    if (fStrat) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(stratData);
    const obj = rows[0] ?? asObject<any>(stratData) ?? {};
    if (!obj.strategyName && rows.length === 0) return <EmptyState icon="🎯" text="No strategy data" colors={colors} />;
    return (
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <InfoRow label="Strategy" value={obj.strategyName ?? ''} colors={colors} />
        <InfoRow label="Strategic Objective" value={obj.objectiveName ?? ''} colors={colors} />
        <InfoRow label="Initiative" value={obj.initiativeName ?? ''} colors={colors} />
        <InfoRow label="Program" value={obj.programName ?? ''} colors={colors} />
        {obj.alignment ? <InfoRow label="Alignment" value={String(obj.alignment)} colors={colors} /> : null}
      </View>
    );
  };

  const renderInfo = () => {
    if (fInfo) return <SectionLoader colors={colors} />;
    const obj = asObject<any>(infoData) ?? {};
    return (
      <View>
        <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[s.secTitle, { color: colors.text, marginBottom: 12 }]}>Project Card</Text>
          <InfoRow label="Project Name"   value={obj.projectName ?? project?.projectName ?? ''} colors={colors} />
          <InfoRow label="Manager"        value={obj.managerName ?? project?.managerName ?? ''} colors={colors} />
          <InfoRow label="Sector"         value={obj.sectorName ?? ''} colors={colors} />
          <InfoRow label="Department"     value={obj.departmentName ?? ''} colors={colors} />
          <InfoRow label="Start Date"     value={obj.startDate ?? project?.startDate ?? ''} colors={colors} />
          <InfoRow label="End Date"       value={obj.endDate ?? project?.endDate ?? ''} colors={colors} />
          <InfoRow label="Budget (AED)"   value={obj.budget != null ? Number(obj.budget).toLocaleString() : ''} colors={colors} />
          <InfoRow label="Status"         value={obj.statusName ?? project?.statusName ?? ''} colors={colors} />
        </View>
        {obj.objectives ? (
          <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[s.secTitle, { color: colors.text, marginBottom: 8 }]}>Objectives</Text>
            <Text style={[s.desc, { color: colors.textSecondary }]}>{obj.objectives}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderTeam = () => {
    if (fTeam) return <SectionLoader colors={colors} />;
    const members = asArray<any>(teamData);
    if (members.length === 0) return <EmptyState icon="👥" text="No team members" colors={colors} />;
    return (
      <View>
        {members.map((m: any, i: number) => (
          <View key={m.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
            <View style={s.teamRow}>
              <View style={[s.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[s.avatarText, { color: colors.primary }]}>
                  {(m.memberName ?? m.memberId ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.teamName, { color: colors.text }]}>{m.memberName ?? m.memberId}</Text>
                <Text style={[s.teamRole, { color: colors.textSecondary }]}>{m.positionInProject ?? ''}</Text>
                {m.dedication != null && (
                  <Text style={[s.teamDedication, { color: colors.textMuted }]}>Dedication: {m.dedication}%</Text>
                )}
              </View>
            </View>
            {m.mainResponsibility ? (
              <Text style={[s.desc, { color: colors.textSecondary, marginTop: 8 }]} numberOfLines={3}>{m.mainResponsibility}</Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderMilestones = () => {
    if (fMil) return <SectionLoader colors={colors} />;
    if (milestones.length === 0) return <EmptyState icon="🏁" text="No milestones" colors={colors} />;
    return (
      <View>
        {rights.canCreateMilestone && (
          <TouchableOpacity
            style={[s.fabButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('EpmMilestoneCreate', { projectId })}
            activeOpacity={0.8}
          >
            <Text style={s.fabText}>+ New Milestone</Text>
          </TouchableOpacity>
        )}
        {milestones.map((m: any, i: number) => {
          const sc = statusColor(m.status ?? '', colors);
          const mpct = m.completionPercentage ?? 0;
          const canEdit = rights.canEditThisMilestone(m.assignedToLogin ?? m.assignedTo ?? '');
          const canUp = rights.canUploadEvidence(m.assignedToLogin ?? m.assignedTo ?? '');
          return (
            <TouchableOpacity
              key={m.id ?? i}
              style={[s.card, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('EpmMilestoneDetail', { projectId, milestoneId: m.id })}
              activeOpacity={0.85}
            >
              <View style={s.milRow}>
                <View style={s.milTimeline}>
                  <View style={[s.milDot, { backgroundColor: sc.fg }]} />
                  {i < milestones.length - 1 && <View style={[s.milLine, { backgroundColor: colors.divider }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.milHeader}>
                    <Text style={[s.milName, { color: colors.text }]} numberOfLines={2}>{m.milestoneName ?? m.name}</Text>
                    <View style={[s.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.badgeText, { color: sc.fg }]}>{statusLabel(m.status)}</Text>
                    </View>
                  </View>
                  <Text style={[s.milDate, { color: colors.textMuted }]}>{m.startDate} – {m.endDate}</Text>
                  {m.assignedToName && <Text style={[s.milAssignee, { color: colors.textSecondary }]}>{m.assignedToName}</Text>}
                  <ProgressBar pct={mpct} color={sc.fg} bg={colors.greyCard} />
                  <Text style={[s.milPct, { color: sc.fg }]}>{mpct}% complete</Text>
                  {m.weight > 0 && (
                    <View style={[s.chip, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[s.chipText, { color: colors.primary }]}>Weight: {m.weight}%</Text>
                    </View>
                  )}
                  <View style={s.actionRow}>
                    {canEdit && (
                      <TouchableOpacity
                        style={[s.actionBtn, { borderColor: colors.primary }]}
                        onPress={() => navigation.navigate('EpmMilestoneEdit', { projectId, milestoneId: m.id })}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.actionBtnText, { color: colors.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    {canUp && (
                      <TouchableOpacity
                        style={[s.actionBtn, { borderColor: colors.success }]}
                        onPress={async () => {
                          try {
                            const file = await pickOneDocumentForUpload();
                            if (!file) return;
                            await uploadEvidence({ milestoneId: m.id, file }).unwrap();
                            toast.success('Uploaded', 'Evidence saved.');
                          } catch {
                            toast.error('Upload failed', 'Only the assignee can add evidence.');
                          }
                        }}
                        disabled={upLoading}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.actionBtnText, { color: colors.success }]}>Upload Evidence</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderPlan = () => {
    // Tasks / Initiative Plan
    if (fPlan) return <SectionLoader colors={colors} />;
    const tasks = asArray<any>(planData);
    if (tasks.length === 0) return (
      <View>
        {rights.canCreateTask && (
          <TouchableOpacity
            style={[s.fabButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('EpmTaskCreate', { projectId })}
            activeOpacity={0.8}
          >
            <Text style={s.fabText}>+ New Task</Text>
          </TouchableOpacity>
        )}
        <EmptyState icon="📋" text="No tasks in plan" colors={colors} />
      </View>
    );
    return (
      <View>
        {rights.canCreateTask && (
          <TouchableOpacity
            style={[s.fabButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('EpmTaskCreate', { projectId })}
            activeOpacity={0.8}
          >
            <Text style={s.fabText}>+ New Task</Text>
          </TouchableOpacity>
        )}
        {tasks.map((t: any, i: number) => {
          const sc = statusColor(t.status ?? '', colors);
          const tpct = t.completionPercentage ?? 0;
          const canEdit = rights.canEditThisTask(t.assignedToLogin ?? t.assignedTo ?? '');
          return (
            <TouchableOpacity
              key={t.id ?? i}
              style={[s.card, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('EpmTaskDetail', { projectId, taskId: t.id })}
              activeOpacity={0.85}
            >
              <View style={s.milHeader}>
                <Text style={[s.milName, { color: colors.text }]} numberOfLines={2}>{t.taskName ?? t.name}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.fg }]}>{statusLabel(t.status)}</Text>
                </View>
              </View>
              <Text style={[s.milDate, { color: colors.textMuted }]}>{t.startDate} – {t.endDate}</Text>
              {t.assignedToName && <Text style={[s.milAssignee, { color: colors.textSecondary }]}>{t.assignedToName}</Text>}
              <ProgressBar pct={tpct} color={sc.fg} bg={colors.greyCard} />
              <Text style={[s.milPct, { color: sc.fg }]}>{tpct}% complete</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderGantt = () => {
    if (fGantt) return <SectionLoader colors={colors} />;
    const tasks = asArray<any>(ganttData);
    if (tasks.length === 0) return <EmptyState icon="📅" text="No timeline data" colors={colors} />;
    const allDates = tasks.flatMap((t: any) => [t.startDate, t.endDate]).filter(Boolean).map((d: string) => new Date(d).getTime()).filter((n: number) => Number.isFinite(n));
    const minDate = allDates.length ? Math.min(...allDates) : 0;
    const maxDate = allDates.length ? Math.max(...allDates) : 1;
    const range = maxDate - minDate || 1;
    const clamp = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
    return (
      <View>
        {tasks.map((gt: any, i: number) => {
          const sc = statusColor(gt.status ?? '', colors);
          const s0 = gt.startDate ? new Date(gt.startDate).getTime() : minDate;
          const e0 = gt.endDate ? new Date(gt.endDate).getTime() : maxDate;
          const lPct = clamp(((s0 - minDate) / range) * 100);
          const wPct = Math.max(clamp(((e0 - s0) / range) * 100), 5);
          return (
            <TouchableOpacity
              key={gt.id ?? i}
              style={[s.card, shadows.card, { backgroundColor: colors.card }]}
              onPress={() => gt.isMilestone ? navigation.navigate('EpmMilestoneDetail', { projectId, milestoneId: gt.id }) : navigation.navigate('EpmTaskDetail', { projectId, taskId: gt.id })}
              activeOpacity={0.85}
            >
              <View style={s.ganttHeader}>
                <Text style={[s.milName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                  {gt.isMilestone ? '🏁 ' : ''}{gt.taskName ?? gt.name}
                </Text>
                <Text style={[s.ganttPct, { color: sc.fg }]}>{gt.completionPercentage ?? 0}%</Text>
              </View>
              <Text style={[s.milDate, { color: colors.textMuted }]}>{gt.startDate} – {gt.endDate}</Text>
              <View style={[s.ganttTrack, { backgroundColor: colors.greyCard }]}>
                <View style={[s.ganttBar, { left: `${lPct}%`, width: `${wPct}%`, backgroundColor: sc.fg, opacity: 0.3 }]} />
                {(gt.completionPercentage ?? 0) > 0 && (
                  <View style={[s.ganttBar, { left: `${lPct}%`, width: `${wPct * (gt.completionPercentage / 100)}%`, backgroundColor: sc.fg }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderDeliverables = () => {
    if (fDel) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(delData);
    if (rows.length === 0) return <EmptyState icon="📦" text="No deliverables" colors={colors} />;
    return (
      <View>
        {rows.map((d: any, i: number) => {
          const sc = statusColor(d.status ?? 0, colors);
          return (
            <View key={d.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: sc.fg }]}>
              <View style={s.milHeader}>
                <Text style={[s.milName, { color: colors.text }]} numberOfLines={2}>{d.taskName ?? d.name ?? `Deliverable #${d.deliverableId ?? d.id}`}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.fg }]}>{statusLabel(d.status)}</Text>
                </View>
              </View>
              {d.assignedToName && <Text style={[s.milAssignee, { color: colors.textSecondary }]}>{d.assignedToName}</Text>}
              <View style={s.milMeta}>
                {d.createdDate && <Text style={[s.milDate, { color: colors.textMuted }]}>Created: {d.createdDate}</Text>}
                {d.completedDate && <Text style={[s.milDate, { color: colors.success }]}>Done: {d.completedDate}</Text>}
              </View>
              {d.comments ? <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={2}>{d.comments}</Text> : null}
            </View>
          );
        })}
      </View>
    );
  };

  const renderRisks = () => {
    if (fRisk) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(riskData);
    if (rows.length === 0) return <EmptyState icon="⚠️" text="No risks identified" colors={colors} />;
    return (
      <View>
        {rights.canEditRisk && (
          <TouchableOpacity
            style={[s.fabButton, { backgroundColor: colors.warning }]}
            onPress={() => navigation.navigate('EpmRiskCreate', { projectId })}
            activeOpacity={0.8}
          >
            <Text style={s.fabText}>+ New Risk</Text>
          </TouchableOpacity>
        )}
        {rows.map((r: any, i: number) => {
          const score = (r.likelihood ?? 0) * (r.consequence ?? 0);
          const level = score >= 15 ? 'Critical' : score >= 8 ? 'High' : score >= 4 ? 'Medium' : 'Low';
          const rl = statusColor(level.toLowerCase().includes('critical') || level.toLowerCase().includes('high') ? 'overdue' : level.toLowerCase().includes('medium') ? 'delay' : 'track', colors);
          return (
            <View key={r.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: rl.fg }]}>
              <View style={s.riskRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.milName, { color: colors.text }]} numberOfLines={3}>{r.description}</Text>
                  {r.responsibleName ? <Text style={[s.milAssignee, { color: colors.textSecondary }]}>Owner: {r.responsibleName}</Text> : null}
                </View>
                <View style={[s.riskCircle, { backgroundColor: rl.bg }]}>
                  <Text style={[s.riskScore, { color: rl.fg }]}>{score}</Text>
                  <Text style={[s.riskLevel, { color: rl.fg }]}>{level}</Text>
                </View>
              </View>
              <View style={s.riskChips}>
                <View style={[s.chip, { backgroundColor: colors.greyCard, flex: 1, alignItems: 'center' }]}>
                  <Text style={[s.chipText, { color: colors.textMuted }]}>Likelihood</Text>
                  <Text style={[s.chipVal, { color: colors.text }]}>{r.likelihood ?? 0}/5</Text>
                </View>
                <View style={[s.chip, { backgroundColor: colors.greyCard, flex: 1, alignItems: 'center', marginLeft: 8 }]}>
                  <Text style={[s.chipText, { color: colors.textMuted }]}>Impact</Text>
                  <Text style={[s.chipVal, { color: colors.text }]}>{r.consequence ?? 0}/5</Text>
                </View>
              </View>
              {r.mitigation ? (
                <View style={[s.mitigationBox, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
                  <Text style={[s.chipText, { color: colors.success }]}>Mitigation</Text>
                  <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={4}>{r.mitigation}</Text>
                </View>
              ) : null}
              {rights.canEditRisk && (
                <TouchableOpacity
                  style={[s.actionBtn, { borderColor: colors.warning, alignSelf: 'flex-start', marginTop: 8 }]}
                  onPress={() => navigation.navigate('EpmRiskEdit', { projectId, riskId: r.id })}
                  activeOpacity={0.75}
                >
                  <Text style={[s.actionBtnText, { color: colors.warning }]}>Edit Risk</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderIssues = () => {
    if (fIssue) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(issueData);
    if (rows.length === 0) return (
      <View>
        {rights.canEditIssue && (
          <TouchableOpacity style={[s.fabButton, { backgroundColor: colors.danger }]} onPress={() => navigation.navigate('EpmIssueCreate', { projectId })} activeOpacity={0.8}>
            <Text style={s.fabText}>+ New Issue</Text>
          </TouchableOpacity>
        )}
        <EmptyState icon="🔴" text="No issues" colors={colors} />
      </View>
    );
    return (
      <View>
        {rights.canEditIssue && (
          <TouchableOpacity style={[s.fabButton, { backgroundColor: colors.danger }]} onPress={() => navigation.navigate('EpmIssueCreate', { projectId })} activeOpacity={0.8}>
            <Text style={s.fabText}>+ New Issue</Text>
          </TouchableOpacity>
        )}
        {rows.map((iss: any, i: number) => {
          const sc = statusColor(iss.status ?? iss.statusName ?? '', colors);
          return (
            <View key={iss.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: sc.fg }]}>
              <View style={s.milHeader}>
                <Text style={[s.milName, { color: colors.text }]} numberOfLines={2}>{iss.title ?? iss.description ?? `Issue #${iss.id}`}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.fg }]}>{statusLabel(iss.status ?? iss.statusName)}</Text>
                </View>
              </View>
              {iss.responsibleName && <Text style={[s.milAssignee, { color: colors.textSecondary }]}>Owner: {iss.responsibleName}</Text>}
              {iss.description && iss.title && <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={3}>{iss.description}</Text>}
              {iss.resolution ? (
                <View style={[s.mitigationBox, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
                  <Text style={[s.chipText, { color: colors.success }]}>Resolution</Text>
                  <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={3}>{iss.resolution}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  };

  const renderChangeMgmt = () => {
    if (fChg) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(chgData);
    if (rows.length === 0) return <EmptyState icon="🔄" text="No change requests" colors={colors} />;
    return (
      <View>
        {rows.map((c: any, i: number) => {
          const sc = statusColor(c.status ?? c.statusName ?? '', colors);
          return (
            <View key={c.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
              <View style={s.milHeader}>
                <Text style={[s.milName, { color: colors.text }]} numberOfLines={2}>{c.title ?? c.reason ?? `Change #${c.id}`}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.fg }]}>{statusLabel(c.status ?? c.statusName)}</Text>
                </View>
              </View>
              {c.description && <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={3}>{c.description}</Text>}
              {c.createdDate && <Text style={[s.milDate, { color: colors.textMuted }]}>Date: {c.createdDate}</Text>}
              {c.requestedBy && <Text style={[s.milAssignee, { color: colors.textSecondary }]}>By: {c.requestedBy}</Text>}
            </View>
          );
        })}
      </View>
    );
  };

  const renderStatusReport = () => {
    if (fBudget) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(budgetData);
    const total = rows.reduce((s: number, b: any) => s + (b.planned ?? 0), 0);
    const actual = rows.reduce((s: number, b: any) => s + (b.actual ?? 0), 0);
    const used = total > 0 ? Math.round((actual / total) * 100) : 0;
    return (
      <View>
        <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[s.secTitle, { color: colors.text, marginBottom: 12 }]}>Budget Summary</Text>
          <View style={s.statsRow}>
            <View style={[s.statCard, { backgroundColor: colors.primaryLight }]}>
              <Text style={[s.statVal, { color: colors.primary }]}>{total.toLocaleString()}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Planned</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: used > 90 ? `${colors.danger}18` : `${colors.success}18` }]}>
              <Text style={[s.statVal, { color: used > 90 ? colors.danger : colors.success }]}>{actual.toLocaleString()}</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Actual</Text>
            </View>
            <View style={[s.statCard, { backgroundColor: `${colors.warning}18` }]}>
              <Text style={[s.statVal, { color: colors.warning }]}>{used}%</Text>
              <Text style={[s.statLabel, { color: colors.textMuted }]}>Used</Text>
            </View>
          </View>
          <ProgressBar pct={used} color={used > 90 ? colors.danger : used > 70 ? colors.warning : colors.success} bg={colors.greyCard} />
        </View>
        {rows.length === 0 && <EmptyState icon="📝" text="No budget data" colors={colors} />}
        {rows.map((b: any, i: number) => {
          const rowPct = b.planned > 0 ? Math.round((b.actual / b.planned) * 100) : 0;
          return (
            <View key={b.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
              <View style={s.milHeader}>
                <Text style={[s.milName, { color: colors.text }]}>{b.year}/{String(b.month ?? '').padStart(2,'0')}</Text>
                <Text style={{ color: rowPct > 90 ? colors.danger : colors.success, fontWeight: '700' }}>{rowPct}%</Text>
              </View>
              <ProgressBar pct={rowPct} color={rowPct > 90 ? colors.danger : colors.success} bg={colors.greyCard} />
            </View>
          );
        })}
      </View>
    );
  };

  const renderProcurement = () => {
    if (fProc) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(procData);
    if (rows.length === 0) return <EmptyState icon="💳" text="No procurement data" colors={colors} />;
    return (
      <View>
        {rows.map((p: any, i: number) => {
          const sc = statusColor(p.status ?? p.statusName ?? '', colors);
          return (
            <View key={p.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
              <View style={s.milHeader}>
                <Text style={[s.milName, { color: colors.text }]} numberOfLines={2}>{p.description ?? p.title ?? `Payment #${p.id}`}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.fg }]}>{statusLabel(p.status ?? p.statusName)}</Text>
                </View>
              </View>
              {p.amount != null && <InfoRow label="Amount (AED)" value={Number(p.amount).toLocaleString()} colors={colors} />}
              {p.dueDate && <InfoRow label="Due Date" value={p.dueDate} colors={colors} />}
              {p.paidDate && <InfoRow label="Paid Date" value={p.paidDate} colors={colors} />}
            </View>
          );
        })}
      </View>
    );
  };

  const renderKPIs = () => {
    if (fKpi) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(kpiData);
    if (rows.length === 0) return <EmptyState icon="📈" text="No KPIs" colors={colors} />;
    return (
      <View>
        {rows.map((k: any, i: number) => {
          const sc = statusColor(k.status ?? k.statusName ?? '', colors);
          const kpct = k.progressPercentage ?? k.completionPercentage ?? 0;
          return (
            <View key={k.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
              <View style={s.milHeader}>
                <Text style={[s.milName, { color: colors.text }]} numberOfLines={2}>{k.name ?? k.kpiName}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.fg }]}>{statusLabel(k.status ?? k.statusName)}</Text>
                </View>
              </View>
              <View style={s.statsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.chipText, { color: colors.textMuted }]}>Target</Text>
                  <Text style={[s.teamName, { color: colors.text }]}>{k.target ?? '—'} {k.unit ?? ''}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.chipText, { color: colors.textMuted }]}>Actual</Text>
                  <Text style={[s.teamName, { color: sc.fg }]}>{k.actual ?? '—'} {k.unit ?? ''}</Text>
                </View>
              </View>
              <ProgressBar pct={kpct} color={sc.fg} bg={colors.greyCard} />
              <Text style={[s.milPct, { color: sc.fg }]}>{kpct}%</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderFinalResult = () => {
    if (fFinal) return <SectionLoader colors={colors} />;
    const obj = asObject<any>(finalData) ?? {};
    const rows = asArray<any>(finalData);
    if (!obj.finalResult && rows.length === 0) return <EmptyState icon="🏆" text="No final result" colors={colors} />;
    const item = rows[0] ?? obj;
    return (
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <InfoRow label="Final Result" value={item.finalResult ?? item.result ?? ''} colors={colors} />
        <InfoRow label="Approved By" value={item.approvedByName ?? item.approvedBy ?? ''} colors={colors} />
        <InfoRow label="Closure Date" value={item.closureDate ?? ''} colors={colors} />
        {item.comments && <Text style={[s.desc, { color: colors.textSecondary, marginTop: 8 }]}>{item.comments}</Text>}
      </View>
    );
  };

  const renderLessons = () => {
    if (fLesson) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(lessonData);
    if (rows.length === 0) return <EmptyState icon="💡" text="No lessons learnt" colors={colors} />;
    return (
      <View>
        {rows.map((l: any, i: number) => (
          <View key={l.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[s.milName, { color: colors.text }]} numberOfLines={1}>{l.title ?? l.lessonType ?? `Lesson #${l.id}`}</Text>
            {l.description && <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={4}>{l.description}</Text>}
            {l.recommendation && (
              <View style={[s.mitigationBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                <Text style={[s.chipText, { color: colors.primary }]}>Recommendation</Text>
                <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={3}>{l.recommendation}</Text>
              </View>
            )}
            {l.createdByName && <Text style={[s.milDate, { color: colors.textMuted }]}>By: {l.createdByName}</Text>}
          </View>
        ))}
      </View>
    );
  };

  const renderApprovals = () => {
    if (fAppr) return <SectionLoader colors={colors} />;
    const rows = asArray<any>(apprData);
    if (rows.length === 0) return <EmptyState icon="✅" text="No approvals" colors={colors} />;
    return (
      <View>
        {rows.map((a: any, i: number) => {
          const sc = statusColor(a.status ?? a.statusName ?? '', colors);
          return (
            <View key={a.id ?? i} style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
              <View style={s.milHeader}>
                <Text style={[s.milName, { color: colors.text }]} numberOfLines={2}>{a.title ?? a.stepName ?? `Approval #${a.id}`}</Text>
                <View style={[s.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.badgeText, { color: sc.fg }]}>{statusLabel(a.status ?? a.statusName)}</Text>
                </View>
              </View>
              {a.approverName && <Text style={[s.milAssignee, { color: colors.textSecondary }]}>Approver: {a.approverName}</Text>}
              {a.date && <Text style={[s.milDate, { color: colors.textMuted }]}>Date: {a.date}</Text>}
            </View>
          );
        })}
      </View>
    );
  };

  const sectionRenderers: Record<SectionKey, () => React.ReactElement> = {
    overview: renderOverview, strategy: renderStrategy, info: renderInfo,
    team: renderTeam, gantt: renderGantt, milestones: renderMilestones,
    plan: renderPlan, deliverables: renderDeliverables, risks: renderRisks,
    issues: renderIssues, change: renderChangeMgmt, report: renderStatusReport,
    procurement: renderProcurement, kpis: renderKPIs, final: renderFinalResult,
    lessons: renderLessons, approvals: renderApprovals,
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Section tab bar */}
      <ScrollView
        ref={tabBarRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabBar}
        style={[s.tabBarWrap, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
      >
        {SECTIONS.map((sec) => {
          const active = activeSection === sec.key;
          return (
            <TouchableOpacity
              key={sec.key}
              style={[s.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveSection(sec.key)}
              activeOpacity={0.7}
            >
              <Text style={s.tabIcon}>{sec.icon}</Text>
              <Text style={[s.tabText, { color: active ? colors.primary : colors.textMuted }]}>{sec.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        contentContainerStyle={s.contentPad}
        refreshControl={
          <ThemedRefreshControl isFetching={isFetching || fMil} isLoading={lMil} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {sectionRenderers[activeSection]()}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorTitle: { fontSize: 16, fontWeight: '600' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  contentPad: { paddingBottom: 32 },

  tabBarWrap: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  tabBar: { paddingHorizontal: 8, gap: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 10 },
  tabIcon: { fontSize: 13 },
  tabText: { fontSize: 12, fontWeight: '700' },

  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  heroSub: { fontSize: 13, marginTop: 2 },
  ring: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  ringText: { fontSize: 14, fontWeight: '900' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  statCard: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.3 },

  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateVal: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  dateArrow: { fontSize: 18 },
  desc: { fontSize: 13, lineHeight: 19, marginTop: 8 },

  secHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  secIcon: { fontSize: 16 },
  secTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  seeAll: { fontSize: 13, fontWeight: '700' },

  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  quickDot: { width: 8, height: 8, borderRadius: 4 },
  quickName: { fontSize: 13, fontWeight: '600' },
  quickMeta: { fontSize: 11, marginTop: 2 },
  quickPct: { fontSize: 12, fontWeight: '800' },

  milRow: { flexDirection: 'row', gap: 8 },
  milTimeline: { width: 24, alignItems: 'center' },
  milDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  milLine: { width: 2, flex: 1, marginTop: 4, minHeight: 40 },
  milHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  milName: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8, lineHeight: 20 },
  milMeta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  milDate: { fontSize: 11, marginBottom: 4 },
  milAssignee: { fontSize: 12, marginBottom: 6 },
  milPct: { fontSize: 11, fontWeight: '700', marginTop: 4 },

  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 6, borderRadius: 3 },

  chip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  chipText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  chipVal: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  fabButton: { marginHorizontal: 16, marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  teamRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  teamName: { fontSize: 15, fontWeight: '700' },
  teamRole: { fontSize: 13, marginTop: 2 },
  teamDedication: { fontSize: 11, marginTop: 2 },

  ganttHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ganttPct: { fontSize: 13, fontWeight: '800' },
  ganttTrack: { height: 18, borderRadius: 9, position: 'relative', overflow: 'hidden', marginTop: 6 },
  ganttBar: { position: 'absolute', top: 0, height: 18, borderRadius: 9 },

  riskRow: { flexDirection: 'row', gap: 12 },
  riskCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  riskScore: { fontSize: 18, fontWeight: '900' },
  riskLevel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
  riskChips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  mitigationBox: { marginTop: 10, borderRadius: 8, padding: 10, borderWidth: 1 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#0001' },
  infoLabel: { fontSize: 12, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '700', flex: 2, textAlign: 'right' },

  sectionLoader: { paddingVertical: 48, alignItems: 'center' },

  emptyWrap: { alignItems: 'center', marginTop: 48, marginBottom: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15 },
});

export default ProjectDetailScreen;
