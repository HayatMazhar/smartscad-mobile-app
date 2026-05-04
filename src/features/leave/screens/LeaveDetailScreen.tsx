import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetLeaveDetailQuery, useGetLeaveDocumentsQuery, useUploadLeaveDocumentMutation } from '../services/leaveApi';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import { useToast } from '../../../shared/components/Toast';
import { pickOneDocumentForUpload } from '../../../shared/utils/pickDocument';
import WorkflowProgress, { WorkflowStep } from '../../../shared/components/WorkflowProgress';
import TimelineList, { TimelineEvent } from '../../../shared/components/TimelineList';
import { formatSmartDateTime, formatDateOnly } from '../../../shared/utils/dateUtils';
import QueryStates from '../../../shared/components/QueryStates';

/**
 * Mirrors the web LeaveView.aspx. Reuses the ticket detail's shared workflow
 * progress + timeline components so leaves and tickets feel like the same
 * first-class workflow entity in the mobile app.
 */
const LeaveDetailScreen: React.FC<{ route: any }> = ({ route }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const heroSubColor = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.65)';

  // Route params accept any of these shapes so existing list screens don't
  // need to agree on a single name before this lands.
  const leaveId: string | undefined =
    route?.params?.leaveId ?? route?.params?.id ?? route?.params?.leaveAppUID;

  const { data, isLoading, isFetching, isError, error, refetch } = useGetLeaveDetailQuery(leaveId ?? '', {
    skip: !leaveId,
  });
  const { data: leaveDocs, refetch: refetchDocs } = useGetLeaveDocumentsQuery(leaveId ?? '', { skip: !leaveId });
  const [uploadLeaveDoc, { isLoading: uploadingDoc }] = useUploadLeaveDocumentMutation();
  const toast = useToast();

  const [tab, setTab] = useState<'details' | 'timeline' | 'files'>('details');

  // The SP returns a multi-result envelope:
  //   { leave: {...}, history: [...], workflow: [...] }
  // The workflow + history are driven by the linked SmartHelp ticket —
  // same schema and data the ticket detail screen renders.
  const { leave, history, workflowRows } = useMemo(() => {
    if (!data) return { leave: null as any, history: [] as any[], workflowRows: [] as any[] };
    const envelope = asObject<any>(data) ?? {};
    const payload = asObject<any>(envelope.data) ?? envelope;
    const leaveObj = asObject<any>(payload.leave) ?? asObject<any>(payload) ?? null;
    const historyRows = asArray<any>(payload.history ?? payload.actions ?? []);
    const wfRows = asArray<any>(payload.workflow ?? payload.steps ?? []);
    return { leave: leaveObj, history: historyRows, workflowRows: wfRows };
  }, [data]);

  // Real workflow comes from the linked ticket's ServiceWorkflow (Result 3).
  // If the leave has no ticket link, fall back to a 3-step Applied / Manager /
  // HR Approval progression so the UI is never empty.
  const workflow: WorkflowStep[] = useMemo(() => {
    if (workflowRows && workflowRows.length > 0) {
      return workflowRows.map((s: any) => ({
        id: Number(s.id ?? s.stepOrder ?? 0),
        stepOrder: Number(s.stepOrder ?? 0),
        name: String(s.name ?? ''),
      }));
    }
    if (!leave) return [];
    const steps: WorkflowStep[] = [
      { id: 1, stepOrder: 1, name: t('leave.wf.applied', 'Applied') },
      { id: 2, stepOrder: 2, name: t('leave.wf.manager', 'Manager') },
      { id: 3, stepOrder: 3, name: t('leave.wf.hrApproval', 'HR Approval') },
    ];
    return steps;
  }, [workflowRows, leave, t]);

  // Prefer the server-resolved step order (from Ticket.WorkflowStepID).
  // Fallback: derive from ApplicationStatus (20 → 1, 21 → 2, 22 → last).
  const currentStepOrder: number | undefined = useMemo(() => {
    if (leave?.currentStepOrder != null) return Number(leave.currentStepOrder);
    const statusId = Number(leave?.statusId ?? 0);
    if (statusId >= 22) return workflow.length || 3;
    if (statusId >= 21) return 2;
    return 1;
  }, [leave, workflow.length]);

  // Mirrors the web TicketWorkflow.cshtml rule:
  //   isSuccess = !isCancel && (... || Model.ClosedDate.HasValue)
  // i.e. ALL steps render as green ticks ONLY when the ticket is closed
  // *successfully* (approved). Rejected / cancelled tickets keep showing the
  // "Cancelled at step X" visual where steps before X are green and X+ are red.
  //
  // For a leave application the success-close equivalent is ApplicationStatus
  // == 22 (Approved). 23 (Rejected) and 24 (Cancelled) MUST NOT mark every
  // step green — that would visually claim approval that never happened.
  //
  // The user-reported bug was that an approved 3-step leave displayed only
  // 2/3 ticks because the SP returns currentStepOrder = 3 ("Close the Ticket"
  // — the terminal step), which the chip renderer was treating as "in
  // progress" instead of "done". Setting workflowApproved=true forces every
  // step to a green tick, matching what `Model.ClosedDate.HasValue` triggers
  // in the web TicketWorkflow.cshtml.
  const workflowApproved: boolean = useMemo(() => {
    const statusId = Number(leave?.statusId ?? 0);
    const statusKey = String(leave?.statusKey ?? '').toLowerCase();
    return statusId === 22 || statusKey === 'approved';
  }, [leave]);

  // For rejected / cancelled we tell WorkflowProgress where the workflow
  // stopped so it can paint that step + everything after it as the "cancel"
  // colour, mirroring `isCancel = wf.StepOrder >= ClosingWorkflow.StepOrder`.
  const workflowCancelledAtStep: number | undefined = useMemo(() => {
    const statusId = Number(leave?.statusId ?? 0);
    const statusKey = String(leave?.statusKey ?? '').toLowerCase();
    const isStopped = statusId === 23 || statusId === 24
      || statusKey === 'rejected' || statusKey === 'cancelled';
    if (!isStopped) return undefined;
    // Where did the rejection/cancellation land? The SP exposes the
    // currentStepOrder (which for a closed leave is the terminal step), so
    // fall back to that. Defaults to the last step for fully rejected leaves
    // so at least the final step renders in the cancelled colour.
    const cs = Number(leave?.currentStepOrder ?? 0);
    if (cs > 0) return cs;
    return workflow.length || undefined;
  }, [leave, workflow.length]);

  // Map history rows straight into the shared TimelineEvent shape.
  const leaveDocumentRows = useMemo(() => asArray(leaveDocs), [leaveDocs]);

  const onRefresh = () => {
    void refetch();
    void refetchDocs();
  };

  const onUploadLeaveFile = async () => {
    if (!leaveId) return;
    try {
      const file = await pickOneDocumentForUpload();
      if (!file) return;
      await uploadLeaveDoc({ leaveId, file }).unwrap();
      void refetchDocs();
      toast.success('Uploaded', 'Document added to this leave request.');
    } catch {
      toast.error('Upload failed', 'Only the applicant can add documents, or the file was rejected.');
    }
  };

  const timeline: TimelineEvent[] = useMemo(() => {
    return history.map((h: any, i: number) => ({
      id: h.id ?? h.ActionPerformedID ?? i,
      statusKey: h.statusKey ?? 'action',
      typeName: h.typeName ?? h.actionName ?? 'Action',
      stepName: h.stepName ?? undefined,
      comments: h.comments ?? null,
      actionDate: h.actionDate ?? null,
      actorId: h.actorId ?? null,
      actorName: h.actorName ?? h.actorId ?? null,
    }));
  }, [history]);

  const statusKey = leave ? String(leave.statusKey ?? 'pending').toLowerCase() : '';
  const statusColor = (() => {
    switch (statusKey) {
      case 'approved': return colors.success;
      case 'rejected': return colors.danger;
      case 'pending': return colors.warning;
      case 'cancelled': return colors.textMuted;
      default: return colors.primary;
    }
  })();
  const showHours = !!(leave && (leave.isShortLeave === true || leave.isShortLeave === 1));
  const durationValue = leave
    ? (showHours && leave.shortLeaveMinutes
      ? formatMinutes(Number(leave.shortLeaveMinutes))
      : `${Number(leave.daysCount ?? 0)} ${t('leave.days', 'days')}`)
    : '';

  if (!leaveId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>
          {t('leave.notFound', 'Leave request not found')}
        </Text>
      </View>
    );
  }

  return (
    <QueryStates
      loading={isLoading && !leave}
      apiError={!!(isError && !leave)}
      error={error}
      isRefreshing={isFetching}
      onRetry={() => void refetch()}
      style={{ flex: 1 }}
    >
      {!leave ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textMuted }}>
            {t('leave.notFound', 'Leave request not found')}
          </Text>
        </View>
      ) : (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={onRefresh} />
      }
    >
      {/* Hero — mirrors the ticket detail hero so the UX feels shared. */}
      <View style={[styles.hero, { backgroundColor: colors.stackHeaderBackground }]}>
        <View style={styles.heroTop}>
          <View style={[styles.taskNoBadge, { backgroundColor: onStackLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.taskNo, { color: colors.stackHeaderText }]}>#{leave.taskNo ?? leave.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}30` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {leave.statusName ?? statusKey}
            </Text>
          </View>
        </View>
        <Text style={[styles.heroTitle, { color: colors.stackHeaderText }]}>{leave.leaveTypeName}</Text>
        <Text style={[styles.heroSub, { color: heroSubColor }]}>
          {fmtDate(leave.startDate, showHours)} → {fmtDate(leave.endDate, showHours)}
          {'  •  '}
          {durationValue}
        </Text>
      </View>

      <WorkflowProgress
        steps={workflow}
        currentStepOrder={currentStepOrder}
        colors={colors}
        shadows={shadows}
        isComplete={workflowApproved}
        cancelledAtStepOrder={workflowCancelledAtStep}
      />

      {/* Tabs */}
      <View
        style={[
          styles.tabRow,
          { backgroundColor: colors.card, borderBottomColor: colors.divider },
        ]}
      >
        {(['details', 'timeline', 'files'] as const).map((key) => {
          const active = tab === key;
          const label =
            key === 'details'
              ? t('leave.tab.details', 'Info')
              : key === 'timeline'
                ? `${t('leave.tab.history', 'History')} (${timeline.length})`
                : `${t('leave.tab.files', 'Files')} (${leaveDocumentRows.length})`;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.tab,
                active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setTab(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'details' && (
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <InfoRow label={t('leave.applicant', 'Applicant')} value={leave.applicantName} colors={colors} />
          <InfoRow label={t('leave.appliedOn', 'Applied On')} value={fmtDate(leave.applicationDate, true)} colors={colors} />
          <InfoRow label={t('leave.from', 'From')} value={fmtDate(leave.startDate, showHours)} colors={colors} />
          <InfoRow label={t('leave.to', 'To')} value={fmtDate(leave.endDate, showHours)} colors={colors} />
          <InfoRow label={t('leave.duration', 'Duration')} value={durationValue} colors={colors} />
          <InfoRow label={t('leave.acceptor', 'Manager')} value={leave.acceptorName ?? '—'} colors={colors} />
          <InfoRow label={t('leave.approver', 'HR Approver')} value={leave.approverName ?? '—'} colors={colors} />
          <InfoRow label={t('leave.contact', 'Contact')} value={leave.contactNumber ?? '—'} colors={colors} />
          {leave.ticketNo ? (
            <InfoRow label={t('leave.ticket', 'Ticket')} value={String(leave.ticketNo)} colors={colors} />
          ) : null}
          {leave.reason ? (
            <View style={styles.descSection}>
              <Text style={[styles.descLabel, { color: colors.textMuted }]}>
                {t('leave.reason', 'REASON')}
              </Text>
              <Text style={[styles.descText, { color: colors.textSecondary }]}>{leave.reason}</Text>
            </View>
          ) : null}
        </View>
      )}

      {tab === 'timeline' && (
        <TimelineList
          events={timeline}
          colors={colors}
          shadows={shadows}
          emptyLabel={t('leave.noHistory', 'No history yet')}
          formatDate={(d) => fmtDate(d, true)}
        />
      )}

      {tab === 'files' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          <TouchableOpacity
            onPress={onUploadLeaveFile}
            disabled={uploadingDoc}
            style={{
              borderWidth: 1,
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: 'center',
              borderColor: colors.primary,
              backgroundColor: `${colors.primary}10`,
            }}
            activeOpacity={0.75}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {uploadingDoc ? '…' : t('leave.uploadDoc', '+ Upload document')}
            </Text>
          </TouchableOpacity>
          {leaveDocumentRows.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 24 }}>
              {t('leave.noDocs', 'No documents yet')}
            </Text>
          ) : (
            leaveDocumentRows.map((d: any, i: number) => (
              <View
                key={d.id ?? d.FileName ?? i}
                style={[
                  styles.card,
                  shadows.card,
                  { backgroundColor: colors.card, marginHorizontal: 0, marginTop: 0, padding: 12 },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={2}>
                  {d.fileName ?? d.name ?? d.FileName}
                </Text>
                {d.uploadedByName ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{d.uploadedByName}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
      )}
    </QueryStates>
  );
};

const InfoRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value?: string | null;
  colors: any;
}) =>
  value ? (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  ) : null;

function fmtDate(d?: string | Date | null, withTime = false): string {
  if (!d) return '—';
  return withTime ? formatSmartDateTime(d) : formatDateOnly(d);
}

function formatMinutes(mins: number): string {
  if (!isFinite(mins) || mins <= 0) return '0 hrs';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hrs` : `${h}h ${m}m`;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { padding: 20, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  taskNoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  taskNo: { fontSize: 13, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 4 },
  heroSub: { fontSize: 12 },
  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '700' },
  card: { margin: 16, borderRadius: 14, padding: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  descSection: { marginTop: 14 },
  descLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, marginBottom: 6 },
  descText: { fontSize: 14, lineHeight: 21 },
});

export default LeaveDetailScreen;
