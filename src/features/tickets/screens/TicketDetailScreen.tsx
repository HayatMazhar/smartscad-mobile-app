import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { Linking } from 'react-native';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useTranslation } from 'react-i18next';
import { useGetTicketQuery, useGetTicketAttachmentsQuery, useUploadTicketDocumentMutation } from '../services/ticketApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import { useToast } from '../../../shared/components/Toast';
import { pickOneDocumentForUpload } from '../../../shared/utils/pickDocument';
import WorkflowProgress from '../../../shared/components/WorkflowProgress';
import TimelineList, { TimelineEvent } from '../../../shared/components/TimelineList';
import QueryStates from '../../../shared/components/QueryStates';
import TicketActionTab, {
  ticketDetailActionTabTitle,
  resolveTicketActionFormVariant,
} from '../components/TicketActionTab';
import {
  normalizeTicketWorkflowRow,
  buildStepWaitLine,
  firstAwaitingIdentity,
} from '../utils/ticketWorkflowDisplay';
import { store } from '../../../store/store';
import { API_BASE_URL } from '../../../shared/api/apiBaseUrl';

type DetailTab = 'details' | 'attributes' | 'timeline' | 'action';

const TicketDetailScreen: React.FC<{ route: any }> = ({ route }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const heroSubColor = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.5)';

  const statusHex = useCallback(
    (name: string) => {
      const m: Record<string, string> = {
        New: colors.warning,
        Open: colors.primary,
        'In Progress': colors.primary,
        Resolved: colors.success,
        Closed: colors.success,
        Cancelled: colors.danger,
      };
      return m[name] ?? colors.primary;
    },
    [colors],
  );
  const ticketId = route?.params?.ticketId;
  const { data, isLoading, refetch, isFetching, isError, error } = useGetTicketQuery(ticketId, { skip: !ticketId });
  const { data: ticketAttachments, refetch: refetchAtt } = useGetTicketAttachmentsQuery(ticketId, { skip: !ticketId });
  const [uploadTicketDoc, { isLoading: uploadingAtt }] = useUploadTicketDocumentMutation();
  const toast = useToast();
  const [tab, setTab] = useState<DetailTab>('details');
  const autoActionTabRef = useRef(false);

  const detail = useMemo(() => {
    if (!data) return null;
    const d = data as any;
    return {
      ticket: d.ticket ?? d,
      attributes: asArray<any>(d.attributes ?? []),
      approvals: asArray<any>(d.approvals ?? []),
      workflow: asArray<any>(d.workflow ?? []),
      actionFields: asArray<any>(d.actionFields ?? []),
      activeEnquiry: (asArray<any>(d.activeEnquiry ?? []))[0] ?? null,
      revertableSteps: asArray<any>(d.revertableSteps ?? []),
    };
  }, [data]);

  const ticket = detail?.ticket;
  const showActionTab = !!ticket && resolveTicketActionFormVariant(ticket) !== null;

  useEffect(() => {
    autoActionTabRef.current = false;
  }, [ticketId]);

  useEffect(() => {
    if (!ticket || !showActionTab || autoActionTabRef.current) return;
    setTab('action');
    autoActionTabRef.current = true;
  }, [ticket, showActionTab]);
  const attributes = detail?.attributes ?? [];
  const approvals = detail?.approvals ?? [];
  const workflowRaw = detail?.workflow ?? [];
  const workflowSteps = useMemo(
    () => (workflowRaw as any[]).map((s) => normalizeTicketWorkflowRow(s)),
    [workflowRaw]
  );
  const waitContext = useMemo(
    () => (ticket ? buildStepWaitLine(ticket as any) : null),
    [ticket]
  );
  // Build a full lifecycle timeline: current wait state at top (web parity) → creation → …
  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!ticket) return [];
    const events: TimelineEvent[] = [];
    const w = buildStepWaitLine(ticket as any);
    if (w.line && w.line.length > 0) {
      events.push({
        id: 'current-workflow',
        statusKey: 'pending',
        typeName: w.step,
        stepName: w.who ? `Waiting for ${w.who}` : undefined,
        actionDate: new Date().toISOString(),
        actorId: firstAwaitingIdentity((ticket as any).isWaitingFor),
        actorName: w.who || undefined,
        comments: [(ticket as any).currentStepTypeName, (ticket as any).statusName].filter(Boolean).join(' · '),
      });
    }

    if (ticket.createdDate) {
      events.push({
        statusKey: 'created',
        typeName: 'Created',
        stepName: 'Request submitted',
        actionDate: ticket.createdDate,
        actorName: ticket.createdByName ?? (ticket.createdBy != null ? String(ticket.createdBy) : undefined),
        actorId: ticket.createdBy != null ? String(ticket.createdBy) : undefined,
        comments: ticket.description,
      });
    }

    for (const a of approvals) {
      const fallback =
        a.approvalType === 2 ? 'approved' :
        a.approvalType === 3 ? 'rejected' :
        a.approvalType === 4 ? 'returned' :
        a.approvalType === 6 ? 'assigned' :
        a.approvalType === 10 ? 'skipped' :
        a.approvalType === 11 ? 'closed_partial' :
        a.approvalType === 12 ? 'back' :
        'action';
      const stepLabel = typeof a.stepName === 'string' ? a.stepName.trim() : '';
      const actionLabel =
        typeof a.actionType === 'string' ? a.actionType.trim() :
        '';
      const byName =
        typeof a.actionByName === 'string' ? a.actionByName.trim() :
        '';
      const byIdRaw = a.actionBy;
      const actorId =
        byIdRaw != null && String(byIdRaw).trim() !== '' ? String(byIdRaw) : undefined;
      events.push({
        id: a.id,
        statusKey: a.statusKey ?? fallback,
        typeName: stepLabel || actionLabel || 'Action',
        stepName: stepLabel ? actionLabel || undefined : undefined,
        actorId,
        actorName: byName || undefined,
        comments: a.comments ?? undefined,
        actionDate: a.actionDate ?? undefined,
      });
    }

    const resolvedAt = (ticket as any).solutionProvidedDate || ticket.resolvedDate;
    if (resolvedAt) {
      events.push({
        statusKey: 'resolved',
        typeName: 'Resolved',
        actionDate: resolvedAt,
        actorName: ticket.assignedToName,
        actorId: ticket.assignedTo != null ? String(ticket.assignedTo) : undefined,
        stepName: 'Solution provided',
        comments: (ticket as any).resolutionNotes ?? ticket.technicianComments,
      });
    }

    if (ticket.closedDate) {
      events.push({
        statusKey: 'closed',
        typeName: 'Closed',
        actionDate: ticket.closedDate,
        actorName: ticket.createdByName,
        actorId: ticket.createdBy != null ? String(ticket.createdBy) : undefined,
        stepName: ticket.rating ? `Rated ${ticket.rating}/5` : 'Ticket closed',
        comments: ticket.ratingComments,
      });
    }

    return events.sort((a, b) => {
      if (a.id === 'current-workflow') return -1;
      if (b.id === 'current-workflow') return 1;
      const ta = a.actionDate ? new Date(a.actionDate).getTime() : 0;
      const tb = b.actionDate ? new Date(b.actionDate).getTime() : 0;
      return tb - ta; // newest first
    });
  }, [ticket, approvals]);

  const tabKeys = useMemo((): DetailTab[] => {
    const keys: DetailTab[] = ['details', 'attributes', 'timeline'];
    if (showActionTab) return [...keys, 'action'];
    return keys;
  }, [showActionTab]);

  const actionTabTitle = ticket ? ticketDetailActionTabTitle(ticket, t) : t('tickets.tab.action', 'Action');

  const delegatedBy = route?.params?.delegatedBy as string | undefined;

  const attachmentRows = useMemo(() => asArray(ticketAttachments), [ticketAttachments]);
  const [downloadingFileId, setDownloadingFileId] = useState<number | null>(null);

  const downloadAttachment = useCallback(async (fileId: number, name: string, ext: string) => {
    setDownloadingFileId(fileId);
    try {
      const token = (store.getState() as any).auth?.accessToken as string | undefined;
      const url = `${API_BASE_URL}/tickets/${ticketId}/attachments/${fileId}/download`;
      const safeExt = ext.startsWith('.') ? ext : ext ? `.${ext}` : '';
      const destFile = new File(Paths.cache, `ticket_${ticketId}_${fileId}${safeExt}`);
      const downloaded = await File.downloadFileAsync(url, destFile, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        idempotent: true,
      });
      let openUri = downloaded.uri;
      if (Platform.OS === 'android') {
        openUri = await getContentUriAsync(downloaded.uri);
      }
      await Linking.openURL(openUri);
    } catch {
      toast.error('Download failed', 'Check your connection and try again.');
    } finally {
      setDownloadingFileId(null);
    }
  }, [ticketId, toast]);

  const onRefreshTicket = () => {
    void refetch();
    void refetchAtt();
  };

  const onUploadTicketFile = async () => {
    if (!ticketId) return;
    try {
      const file = await pickOneDocumentForUpload();
      if (!file) return;
      await uploadTicketDoc({ ticketId, file }).unwrap();
      void refetchAtt();
      toast.success('Uploaded', 'File attached to this request.');
    } catch {
      toast.error('Upload failed', 'You may not have access, or the file was rejected.');
    }
  };

  const statusName = ticket?.statusName ?? 'New';
  const sc = statusHex(statusName);

  if (!ticketId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Missing ticket ID</Text>
      </View>
    );
  }

  return (
    <QueryStates
      loading={isLoading && !ticket}
      apiError={!!(isError && !ticket)}
      error={error}
      isRefreshing={isFetching}
      onRetry={() => void refetch()}
      style={{ flex: 1 }}
    >
      {!ticket ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textMuted }}>Ticket not found</Text>
        </View>
      ) : (
    <ScrollView style={[{ flex: 1, backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={onRefreshTicket} />}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.stackHeaderBackground }]}>
        <View style={styles.heroTop}>
          <View style={[styles.ticketNoBadge, { backgroundColor: onStackLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.ticketNo, { color: colors.stackHeaderText }]}>#{ticket.ticketNo ?? ticket.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${sc}30` }]}>
            <Text style={[styles.statusText, { color: sc }]}>{statusName}</Text>
          </View>
        </View>
        <Text style={[styles.heroTitle, { color: colors.stackHeaderText }]}>{ticket.serviceName}</Text>
        {ticket.groupName ? <Text style={[styles.heroSub, { color: heroSubColor }]}>{ticket.groupName} {'>'} {ticket.categoryName}</Text> : null}
        {waitContext && (
          <View style={styles.waitBanner}>
            <Text style={[styles.waitLabel, { color: heroSubColor }]}>{t('tickets.waiting.bannerTitle', 'Where the request is now')}</Text>
            <Text style={[styles.waitLine, { color: colors.stackHeaderText }]} numberOfLines={3}>
              {waitContext.line}
            </Text>
            {(ticket as any).statusName && (
              <Text style={[styles.waitSub, { color: heroSubColor }]}>{(ticket as any).statusName}</Text>
            )}
          </View>
        )}
      </View>

      {/* Workflow progress (step names from SP use stepName → name via normalizeTicketWorkflowRow).
          Mirrors web TicketWorkflow.cshtml: when ClosedDate is set, every
          step is rendered as completed (no "current" step). */}
      {workflowSteps.length > 0 && (
        <WorkflowProgress
          steps={workflowSteps.filter((s) => (s.stepOrder ?? 0) > 0)}
          currentStepId={ticket.workflowStepId ?? (ticket as any).currentWorkflowStepId ?? ticket.currentStepId}
          currentStepOrder={ticket.currentStepOrder}
          colors={colors}
          shadows={shadows}
          isComplete={Boolean(
            ticket.closedDate
              || String(statusName).toLowerCase() === 'closed'
              || String(statusName).toLowerCase() === 'resolved',
          )}
        />
      )}

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        {tabKeys.map((tabKey: DetailTab) => {
          const active = tab === tabKey;
          const labels: Record<DetailTab, string> = {
            details: attachmentRows.length > 0 ? `Info (${attachmentRows.length})` : 'Info',
            attributes: `Fields (${attributes.length})`,
            timeline: `History (${timeline.length})`,
            action: actionTabTitle,
          };
          return (
            <TouchableOpacity
              key={tabKey}
              style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(tabKey)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]}>{labels[tabKey]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

        {tab === 'action' && showActionTab && ticketId ? (
          <TicketActionTab
            ticketId={ticketId}
            ticket={ticket}
            actionFields={detail?.actionFields ?? []}
            activeEnquiry={detail?.activeEnquiry ?? null}
            revertableSteps={detail?.revertableSteps ?? []}
            delegatedBy={delegatedBy}
            onSuccess={() => {
              void refetch();
              setTab('details');
            }}
          />
        ) : null}

        {tab === 'details' && (
        <View>
          <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            {waitContext && (
              <View style={styles.infoBlock}>
                <Text style={[styles.blockLabel, { color: colors.textMuted }]}>{t('tickets.waiting.linePrefix', 'Waiting for')}</Text>
                <Text style={[styles.blockValue, { color: colors.text }]} numberOfLines={4}>
                  {waitContext.line}
                </Text>
              </View>
            )}
            <InfoRow label="Created By" value={ticket.createdByName} colors={colors} />
            <InfoRow label="Created Date" value={fmtDate(ticket.createdDate)} colors={colors} />
            <InfoRow label="Assigned To" value={ticket.assignedToName ?? '—'} colors={colors} />
            <InfoRow
              label={t('tickets.currentStep', 'Current step')}
              value={(ticket as any).currentStepName ?? (ticket as any).CurrentStepName ?? '—'}
              colors={colors}
            />
            {!!(ticket as any).currentStepTypeName && (
              <InfoRow
                label={t('tickets.stepType', 'Step type')}
                value={String((ticket as any).currentStepTypeName)}
                colors={colors}
              />
            )}
            <InfoRow label="Resolved Date" value={fmtDate((ticket as any).solutionProvidedDate || ticket.resolvedDate)} colors={colors} />
            <InfoRow label="Closed Date" value={fmtDate(ticket.closedDate)} colors={colors} />
            {ticket.rating != null && <InfoRow label="Rating" value={`${'★'.repeat(ticket.rating)}${'☆'.repeat(5 - ticket.rating)}`} colors={colors} />}
            {ticket.description ? (
              <View style={styles.descSection}>
                <Text style={[styles.descLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
                <Text style={[styles.descText, { color: colors.textSecondary }]}>{ticket.description}</Text>
              </View>
            ) : null}
            {ticket.technicianComments ? (
              <View style={styles.descSection}>
                <Text style={[styles.descLabel, { color: colors.textMuted }]}>RESOLUTION</Text>
                <Text style={[styles.descText, { color: colors.textSecondary }]}>{ticket.technicianComments}</Text>
              </View>
            ) : null}
          </View>

          {/* Attachments section */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
              Attachments {attachmentRows.length > 0 ? `(${attachmentRows.length})` : ''}
            </Text>
            {ticket.isWaitingForMe && (
              <TouchableOpacity
                onPress={onUploadTicketFile}
                disabled={uploadingAtt}
                style={{
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                  marginBottom: 8,
                }}
                activeOpacity={0.75}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {uploadingAtt ? 'Uploading…' : '+ Add attachment'}
                </Text>
              </TouchableOpacity>
            )}
            {attachmentRows.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>No attachments</Text>
            ) : (
              <View style={[{ borderRadius: 12, overflow: 'hidden' }, shadows.card, { backgroundColor: colors.card }]}>
                {attachmentRows.map((a: any, i: number) => {
                  const fileId = a.id as number;
                  const name = (a.name ?? a.fileName ?? 'file') as string;
                  const ext = (a.extension ?? '') as string;
                  const isLast = i === attachmentRows.length - 1;
                  const isDownloading = downloadingFileId === fileId;
                  return (
                    <View
                      key={fileId ?? i}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border ?? '#e5e7eb',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                          {name}{ext}
                        </Text>
                        {a.uploadedByName ? (
                          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{a.uploadedByName}</Text>
                        ) : null}
                        {a.uploadedDate ? (
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>{a.uploadedDate}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => void downloadAttachment(fileId, name, ext)}
                        disabled={isDownloading}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: `${colors.primary}15`,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                          {isDownloading ? '…' : '↓'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {tab === 'attributes' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          {attributes.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No form fields</Text>
          ) : (
            <View style={[{ borderRadius: 12, overflow: 'hidden' }, shadows.card, { backgroundColor: colors.card }]}>
              {attributes.map((attr: any, i: number) => {
                const label = attr.attributeName ?? attr.name ?? '';
                const val = attr.value ?? '';
                const isLong = val.length > 60;
                const isLast = i === attributes.length - 1;
                return (
                  <View
                    key={attr.id ?? i}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border ?? '#e5e7eb',
                      ...(isLong
                        ? {}
                        : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.textMuted,
                        flexShrink: 0,
                        ...(isLong ? { marginBottom: 4 } : { maxWidth: '45%' }),
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.text,
                        fontWeight: '500',
                        ...(isLong ? {} : { maxWidth: '52%', textAlign: 'right' }),
                      }}
                    >
                      {val || '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {tab === 'timeline' && (
        <TimelineList
          events={timeline}
          colors={colors}
          shadows={shadows}
          formatDate={fmtDate}
        />
      )}

    </ScrollView>
      )}
    </QueryStates>
  );
};

const InfoRow = ({ label, value, colors }: { label: string; value?: string; colors: any }) => (
  value ? (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  ) : null
);

function fmtDate(d?: string | Date | null) {
  if (!d) return undefined;
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return typeof d === 'string' ? d : undefined; }
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { padding: 20, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  ticketNoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ticketNo: { fontSize: 13, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 4 },
  heroSub: { fontSize: 12 },
  waitBanner: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.2)' },
  waitLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  waitLine: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  waitSub: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  infoBlock: { marginBottom: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  blockLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  blockValue: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  sectionHdr: { fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '700' },
  card: { margin: 16, borderRadius: 14, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  descSection: { marginTop: 14 },
  descLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, marginBottom: 6 },
  descText: { fontSize: 14, lineHeight: 21 },
  attrCard: { borderRadius: 10, padding: 12 },
  attrLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  attrValue: { fontSize: 14 },
});

export default TicketDetailScreen;
