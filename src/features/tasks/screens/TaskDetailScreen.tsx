import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import ThemedRefreshControl from '../../../shared/components/ThemedRefreshControl';
import { useToast } from '../../../shared/components/Toast';
import { useGetTaskFullQuery, usePerformTaskActionMutation, useUploadTaskDocumentMutation } from '../services/taskApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asObject, asArray } from '../../../shared/utils/apiNormalize';
import { extractTicketIdFromLink, stripHtml } from '../utils/taskRouting';
import { pickOneDocumentForUpload } from '../../../shared/utils/pickDocument';

const TaskDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { colors, shadows } = useTheme();
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const heroSubColor = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.7)';
  const heroProjectColor = onStackLight ? colors.textMuted : 'rgba(255,255,255,0.5)';

  const actions = useMemo(
    () => [
      { id: 7, label: 'Accept', icon: '✅', color: colors.success },
      { id: 8, label: 'Update %', icon: '📊', color: colors.primary },
      { id: 9, label: 'Complete', icon: '🏁', color: colors.success },
      { id: 12, label: 'Cancel', icon: '❌', color: colors.danger },
    ],
    [colors],
  );
  const taskId = route?.params?.taskId;
  const { data, isLoading, refetch, isFetching, isError } = useGetTaskFullQuery(taskId, { skip: !taskId });
  const toast = useToast();
  const [performAction, { isLoading: acting }] = usePerformTaskActionMutation();
  const [uploadDoc, { isLoading: uploading }] = useUploadTaskDocumentMutation();

  const [tab, setTab] = useState<'detail' | 'history' | 'documents' | 'actions'>('detail');
  const [pct, setPct] = useState('');
  const [comments, setComments] = useState('');

  const bundle = useMemo(() => asObject<any>(data) ?? (data as any) ?? {}, [data]);
  const task = useMemo(() => {
    const d = bundle.detail;
    if (d == null) return {};
    const arr = asArray<any>(d);
    if (arr.length) return asObject<any>(arr[0]) ?? arr[0] ?? {};
    return asObject<any>(d) ?? {};
  }, [bundle]);
  const history = useMemo(() => asArray<any>(bundle.history), [bundle]);
  const documents = useMemo(() => asArray<any>(bundle.documents), [bundle]);

  // If this "task" is actually a Sanadkom/SmartHelp ticket workflow proxy,
  // replace this screen with the real TicketDetail so the user sees the
  // proper description, workflow progress, attributes and timeline instead
  // of the raw HTML email template the Task table stores.
  const feedSource = task?.FeedSourceName ?? task?.feedSourceName;
  const returnLink = task?.FeedSourceReturnLink ?? task?.feedSourceReturnLink ?? task?.externalLink;
  const ticketIdFromLink = useMemo(() => extractTicketIdFromLink(returnLink), [returnLink]);
  const shouldRedirectToTicket =
    !!ticketIdFromLink && /sanadkom|smarthelp|ticket/i.test(String(feedSource ?? returnLink ?? ''));

  useEffect(() => {
    if (shouldRedirectToTicket && ticketIdFromLink) {
      navigation.replace?.('Sanadkom', {
        screen: 'TicketDetail',
        params: { ticketId: ticketIdFromLink },
      });
    }
  }, [shouldRedirectToTicket, ticketIdFromLink, navigation]);

  if (isLoading || shouldRedirectToTicket) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ThemedActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!isLoading && !isFetching && (isError || !task || Object.keys(task as object).length === 0)) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.textMuted }}>Task not found</Text></View>;
  }

  const pctNum = task.TaskPercentage ?? task.completionPercentage ?? task.taskPercentage ?? 0;
  const statusLabel = task.TaskStatus ?? task.statusName ?? 'Pending';
  const rawDescription = task.TaskDetail ?? task.taskDetail;
  const cleanDescription = stripHtml(rawDescription);

  const handleAction = async (actionId: number) => {
    try {
      await performAction({ taskId, body: { actionId, comments: comments || null, percentage: pct ? Number(pct) : null } }).unwrap();
      setComments('');
      setPct('');
      refetch();
      toast.success('Done', 'Action performed successfully.');
    } catch {
      toast.error('Failed', 'Could not perform action. Please try again.');
    }
  };

  const onUploadDocument = async () => {
    if (!taskId) return;
    try {
      const file = await pickOneDocumentForUpload();
      if (!file) return;
      await uploadDoc({ taskId, file }).unwrap();
      refetch();
      toast.success('Uploaded', 'File attached to this task.');
    } catch {
      toast.error('Upload failed', 'Could not attach file. Check permissions and try again.');
    }
  };

  return (
    <ScrollView style={[{ flex: 1, backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<ThemedRefreshControl isFetching={isFetching} isLoading={isLoading} onRefresh={refetch} />}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.stackHeaderBackground }]}>
        <Text style={[styles.heroTitle, { color: colors.stackHeaderText }]}>{task.TaskName ?? task.taskName}</Text>
        <View style={styles.heroMeta}>
          <View style={[styles.heroBadge, { backgroundColor: pctNum >= 100 ? `${colors.success}30` : `${colors.primary}30` }]}>
            <Text style={{ color: colors.stackHeaderText, fontSize: 12, fontWeight: '700' }}>{pctNum}%</Text>
          </View>
          <Text style={[styles.heroStatus, { color: heroSubColor }]}>{statusLabel}</Text>
        </View>
        {(task.ProjectName ?? task.projectName) ? (
          <Text style={[styles.heroProject, { color: heroProjectColor }]}>Project: {task.ProjectName ?? task.projectName}</Text>
        ) : null}
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        {(['detail', 'history', 'documents', 'actions'] as const).map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity key={t} style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)} activeOpacity={0.7}>
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted, fontSize: 13 }]}>
                {t === 'detail' ? 'Details' : t === 'history' ? 'History' : t === 'documents' ? 'Files' : 'Actions'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'detail' && (
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <InfoRow label="Assignee" value={task.ResourceName ?? task.assigneeName} colors={colors} />
          <InfoRow label="Assignor" value={task.AssignorName ?? task.assignorName} colors={colors} />
          <InfoRow label="Start Date" value={formatDate(task.TaskStartDate ?? task.startDate)} colors={colors} />
          <InfoRow label="Due Date" value={formatDate(task.TaskFinishDate ?? task.endDate)} colors={colors} />
          <InfoRow label="Priority" value={task.Priority ?? task.priority} colors={colors} />
          <InfoRow label="Category" value={task.TaskCategory ?? task.category} colors={colors} />
          <InfoRow label="Completion" value={`${pctNum}%`} colors={colors} />
          {cleanDescription ? (
            <View style={styles.descSection}>
              <Text style={[styles.descLabel, { color: colors.textMuted }]}>Description</Text>
              <Text style={[styles.descText, { color: colors.textSecondary }]}>{cleanDescription}</Text>
            </View>
          ) : null}
        </View>
      )}

      {tab === 'history' && (
        <View style={{ paddingHorizontal: 16, gap: 8, paddingTop: 8 }}>
          {history.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 40 }}>No history found</Text>
          ) : history.map((h: any, i: number) => (
            <View key={h.id ?? i} style={[styles.histCard, shadows.card, { backgroundColor: colors.card }]}>
              <View style={styles.histTop}>
                <View style={[styles.histDot, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.histAction, { color: colors.primary }]}>{h.actionName ?? h.actionPerformed}</Text>
                  <Text style={[styles.histActor, { color: colors.textSecondary }]}>{h.actorName ?? h.actorId}</Text>
                </View>
                <Text style={[styles.histDate, { color: colors.textMuted }]}>{formatDate(h.actionDate)}</Text>
              </View>
              {h.comments ? <Text style={[styles.histComment, { color: colors.textSecondary }]}>{h.comments}</Text> : null}
              {h.percentage != null ? <Text style={[styles.histPct, { color: colors.textMuted }]}>Progress: {h.percentage}%</Text> : null}
            </View>
          ))}
        </View>
      )}

      {tab === 'documents' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          <TouchableOpacity
            style={[styles.uploadBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}
            onPress={onUploadDocument}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{uploading ? 'Uploading…' : '+ Upload evidence / attachment'}</Text>
          </TouchableOpacity>
          {documents.length === 0 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 24 }}>No files yet</Text>
          ) : (
            documents.map((d: any, i: number) => (
              <View key={d.id ?? i} style={[styles.docRow, shadows.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 20 }}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={2}>{d.fileName ?? d.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                    {d.uploadedByName ?? d.uploadedBy ?? '—'} · {formatDate(d.uploadedDate)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'actions' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="Comments (optional)" placeholderTextColor={colors.textMuted}
            value={comments} onChangeText={setComments} multiline />
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, marginTop: 8 }]}
            placeholder="Completion % (e.g. 50)" placeholderTextColor={colors.textMuted}
            value={pct} onChangeText={setPct} keyboardType="numeric" />
          <View style={styles.actionGrid}>
            {actions.map((a) => (
              <TouchableOpacity key={a.id} style={[styles.actionBtn, { backgroundColor: `${a.color}14`, borderColor: a.color }]}
                onPress={() => handleAction(a.id)} activeOpacity={0.7} disabled={acting}>
                <Text style={{ fontSize: 20 }}>{a.icon}</Text>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const InfoRow = ({ label, value, colors }: { label: string; value?: string; colors: any }) => (
  <View style={styles.infoRow}>
    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.text }]}>{value ?? '—'}</Text>
  </View>
);

function formatDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { padding: 20, paddingBottom: 24 },
  heroTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 10 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroStatus: { fontSize: 13, fontWeight: '600' },
  heroProject: { fontSize: 12, marginTop: 8 },
  tabRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '700' },
  card: { margin: 16, borderRadius: 14, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  descSection: { marginTop: 12 },
  descLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  descText: { fontSize: 14, lineHeight: 21 },
  histCard: { borderRadius: 12, padding: 12 },
  histTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  histDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  histAction: { fontSize: 13, fontWeight: '700' },
  histActor: { fontSize: 12, marginTop: 2 },
  histDate: { fontSize: 11 },
  histComment: { fontSize: 13, lineHeight: 19, marginTop: 6, paddingLeft: 16 },
  histPct: { fontSize: 11, marginTop: 4, paddingLeft: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, minHeight: 44 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, minWidth: '45%' },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  uploadBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
});

export default TaskDetailScreen;
