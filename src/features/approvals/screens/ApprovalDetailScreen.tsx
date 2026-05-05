import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { ApprovalsStackParamList, ApprovalsTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useGetDecisionContextQuery, useDecideOnApprovalMutation } from '../services/approvalsApi';
import { getModuleDisplayName, moduleIcon } from '../utils/moduleLabels';
import type { ApprovalInboxRow } from '../utils/approvalInboxRouting';
import WorkflowProgress, { type WorkflowStep } from '../../../shared/components/WorkflowProgress';
import { formatSmartDateTime } from '../../../shared/utils/dateUtils';
import haptics from '../../../shared/utils/haptics';

type NavParams = { itemId: string; preview?: ApprovalInboxRow };

type HistoryEntry = {
  id?: number;
  actionPerformed?: string;
  actionDate?: string;
  comments?: string;
  actorName?: string;
  percentage?: number | null;
};

type ExtraField = {
  fieldId?: string;
  fieldType?: string;
  label?: string;
  value?: string | null;
};

const COMMON_FIELD_IDS = new Set([
  'requestor', 'assignedTo', 'priority', 'created',
  'taskStart', 'taskEnd', 'percent', 'taskDetail',
]);

/** Stacked label + value row */
const FieldRow = ({
  field, colors, fontFamily, isLast,
}: {
  field: ExtraField; colors: any; fontFamily?: string; isLast?: boolean;
}) => {
  const isPara = (field.fieldType || '').toLowerCase() === 'paragraph';
  return (
    <View
      style={[
        frs.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
      ]}
    >
      <Text style={[frs.label, { color: colors.textMuted, fontFamily }]} numberOfLines={2}>
        {field.label ?? '—'}
      </Text>
      <Text
        style={[frs.value, { color: colors.text, fontFamily, fontWeight: isPara ? '500' : '600' }]}
        selectable
      >
        {field.value && String(field.value).trim().length > 0 ? String(field.value) : '—'}
      </Text>
    </View>
  );
};
const frs = StyleSheet.create({
  row:   { paddingHorizontal: 14, paddingVertical: 11 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 },
  value: { fontSize: 14, lineHeight: 20 },
});

function moduleSectionTitle(t: (k: string, fb: string) => string, moduleCode?: string): string {
  switch ((moduleCode || '').toUpperCase()) {
    case 'LEAVE':            return t('approvals.section.leave',        'Leave details');
    case 'EPM_DELIVERABLE':  return t('approvals.section.deliverable',  'Deliverable');
    case 'EPM_MILESTONE':    return t('approvals.section.milestone',    'Milestone details');
    case 'EPM_TASK':         return t('approvals.section.epmTask',      'Task details');
    case 'PMS_KPI':          return t('approvals.section.kpi',          'KPI target');
    case 'PMS_OBJECTIVE':    return t('approvals.section.objective',    'Objective');
    case 'IBDAA_IDEA':       return t('approvals.section.idea',         'Idea');
    case 'SANADKOM_TICKET':  return t('approvals.section.ticket',       'Ticket');
    case 'SCAD_STAR':        return t('approvals.section.star',         'Recognition nomination');
    case 'APPRAISAL':        return t('approvals.section.appraisal',    'Appraisal details');
    case 'SURVEY':
    case 'BI_SURVEY':        return t('approvals.section.biSurvey',     'Survey details');
    case 'STANDALONE_TASK':  return t('approvals.section.task',         'Task');
    default:                 return t('approvals.section.details',      'Details');
  }
}

/** Compact tab bar — "Details" | "History" */
const TabBar = ({
  tabs, active, onSelect, colors, fontFamily,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onSelect: (id: string) => void;
  colors: any;
  fontFamily?: string;
}) => (
  <View style={[tbStyles.bar, { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider }]}>
    {tabs.map((tab, i) => {
      const isActive = tab.id === active;
      return (
        <TouchableOpacity
          key={tab.id}
          style={[
            tbStyles.tab,
            isActive && { borderBottomColor: colors.primary },
            i < tabs.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.divider },
          ]}
          onPress={() => onSelect(tab.id)}
          activeOpacity={0.7}
        >
          <Text style={[tbStyles.label, { color: isActive ? colors.primary : colors.textMuted, fontFamily }]}>
            {tab.label}
          </Text>
          {tab.count != null && tab.count > 0 && (
            <View style={[tbStyles.badge, { backgroundColor: isActive ? colors.primary : colors.textMuted }]}>
              <Text style={[tbStyles.badgeText, { fontFamily }]}>{tab.count > 99 ? '99+' : tab.count}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);
const tbStyles = StyleSheet.create({
  bar:       { flexDirection: 'row', borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  tab:       { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  label:     { fontSize: 13, fontWeight: '700' },
  badge:     { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

const ApprovalDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<ApprovalsStackParamList, 'ApprovalDetail'>>();
  const navigation = useNavigation<ApprovalsTabNavigation<'ApprovalDetail'>>();
  const insets     = useSafeAreaInsets();
  const { colors, fontFamily, shadows } = useTheme();
  const { itemId, preview } = (route.params || {}) as NavParams;

  const { data, isLoading, isError, refetch } = useGetDecisionContextQuery(itemId, { skip: !itemId });
  const [decide, { isLoading: decLoading }] = useDecideOnApprovalMutation();
  const [comment, setComment]  = useState('');
  const [busy,    setBusy]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  const d = data as { header?: any; allowedActions?: any[]; extraFields?: any[]; history?: any[]; data?: any } | undefined;
  const header        = d?.header ?? d?.data?.header;
  const rawActions: any[]      = d?.allowedActions ?? d?.data?.allowedActions ?? [];
  const extraFields: ExtraField[]   = (d?.extraFields  ?? d?.data?.extraFields  ?? []) as ExtraField[];
  const historyEntries: HistoryEntry[] = (d?.history ?? d?.data?.history ?? []) as HistoryEntry[];
  const moduleCode: string = header?.moduleCode || preview?.moduleCode || '';

  const { commonRows, moduleRows, kpiWorkflow } = useMemo(() => {
    const common: ExtraField[] = [];
    const mod: ExtraField[] = [];
    let wf: { steps: WorkflowStep[]; currentStepOrder?: number } | null = null;

    for (const f of extraFields) {
      const id   = String(f?.fieldId ?? '');
      const type = String(f?.fieldType ?? '').toLowerCase();
      if (type === 'workflow_json') {
        try { if (f.value) wf = JSON.parse(f.value) as { steps: WorkflowStep[]; currentStepOrder?: number }; }
        catch { /* ignore */ }
      } else if (COMMON_FIELD_IDS.has(id)) {
        common.push(f);
      } else {
        mod.push(f);
      }
    }
    return { commonRows: common, moduleRows: mod, kpiWorkflow: wf };
  }, [extraFields]);

  const actions = useMemo(
    () => rawActions.filter((a) => String(a?.actionCode ?? '').toUpperCase() !== 'OPEN_WEB'),
    [rawActions],
  );
  const hadOpenWebOnly = rawActions.length > 0 && rawActions.every((a) => String(a?.actionCode ?? '').toUpperCase() === 'OPEN_WEB');

  /** Extract surveyLinkId from `mobile://bi-surveys/<id>` returnLink (BI_SURVEY only). */
  const biSurveyLinkId = useMemo(() => {
    if ((moduleCode || '').toUpperCase() !== 'BI_SURVEY') return null;
    const link = (header as { returnLink?: string } | undefined)?.returnLink ?? '';
    const m = link.match(/mobile:\/\/bi-surveys\/(\d+)/i) || link.match(/\/Survey\/(\d+)/i);
    return m ? Number(m[1]) : null;
  }, [moduleCode, header]);

  const canAct       = header?.canAct === true || header?.canAct === 1;
  const headerMsg    = (header as { message?: string } | undefined)?.message;
  const title        = (header as { sourceTitle?: string } | undefined)?.sourceTitle || preview?.title || t('approvals.detail.fallbackTitle', 'Approval');
  const summary      = (header as { sourceSummary?: string } | undefined)?.sourceSummary || '';
  const previewSummary = [preview?.status, preview?.priority, preview?.fromName].filter(Boolean).join(' · ');

  const run = async (a: { actionCode: string; actionId?: number; requiresComment?: boolean; variant?: string; labelKey?: string }) => {
    const code = (a.actionCode || '').toUpperCase();

    // ── Native navigation actions (no decide() round-trip) ──────────────
    if (code === 'FILL_SURVEY' && biSurveyLinkId) {
      navigation.navigate('SurveyResponse', { surveyLinkId: biSurveyLinkId });
      return;
    }
    if (code === 'OPEN_PROJECT_PLAN' && a.actionId) {
      // Cross-stack: ApprovalsStack → MoreStack → ProjectDetail
      navigation.navigate('More', {
        screen: 'ProjectDetail',
        params: { projectId: a.actionId, initialSection: 'gantt' },
      });
      return;
    }
    if (code === 'OPEN_TICKET' && a.actionId) {
      // Cross-stack: ApprovalsStack → TicketStack (tab name "Sanadkom") → TicketDetail
      navigation.navigate('Sanadkom', {
        screen: 'TicketDetail',
        params: { ticketId: a.actionId },
      });
      return;
    }
    if (code === 'OPEN_WEB') {
      const link = (header as { returnLink?: string } | undefined)?.returnLink;
      if (link && /^https?:/i.test(link)) void Linking.openURL(link);
      return;
    }

    if (a.requiresComment && !comment.trim()) {
      haptics.notifyWarning();
      return;
    }
    const isReject = (a.variant === 'danger') || code.includes('REJECT') || code.includes('BACK');
    if (isReject) haptics.heavyImpact();
    else haptics.mediumImpact();
    setBusy(a.actionCode);
    try {
      await decide({
        itemId,
        body: {
          moduleCode: header?.moduleCode,
          actionCode: a.actionCode,
          actionId:   a.actionId,
          comment:    comment.trim() || undefined,
        },
      }).unwrap();
      haptics.notifySuccess();
      navigation.goBack();
    } catch {
      haptics.notifyError();
    }
    finally { setBusy(null); }
  };

  const vColor = (v: string) => (v === 'danger' ? colors.danger : v === 'info' ? colors.primary : colors.success);

  const tabs = [
    { id: 'details', label: t('approvals.tab.details', 'Details') },
    { id: 'history', label: t('approvals.tab.history', 'History'), count: historyEntries.length },
  ];

  const hasDetails = commonRows.length > 0 || moduleRows.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: 8,
          paddingBottom: Math.max(24, insets.bottom + 12),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ── */}
        <View style={[styles.hero, shadows?.card, { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider }]}>
          <Text style={styles.emoji}>{moduleIcon(moduleCode || preview?.moduleCode)}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.pillRow}>
              <View style={[styles.pill, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={[styles.pillText, { color: colors.primary, fontFamily }]}>
                  {getModuleDisplayName(t, moduleCode || preview?.moduleCode)}
                </Text>
              </View>
            </View>
            <Text style={[styles.hTitle, { color: colors.text, fontFamily }]}>{title}</Text>
            {(!!summary || !!previewSummary) && (
              <Text style={[styles.hSub, { color: colors.textSecondary, fontFamily }]}>
                {summary || previewSummary}
              </Text>
            )}
          </View>
        </View>

        {/* ── Workflow progress bar — full width, prominent ── */}
        {!isLoading && kpiWorkflow && kpiWorkflow.steps.length > 0 && (
          <View style={[styles.wfCard, shadows?.card, { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider }]}>
            <View style={[styles.wfHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.wfTitle, { color: colors.text, fontFamily }]}>
                {moduleCode.toUpperCase() === 'APPRAISAL'
                  ? t('approvals.wf.appraisal', 'APPRAISAL WORKFLOW')
                  : t('approvals.wf.kpi', 'APPROVAL WORKFLOW')}
              </Text>
            </View>
            <View style={{ padding: 14 }}>
              <WorkflowProgress
                steps={kpiWorkflow.steps}
                currentStepOrder={kpiWorkflow.currentStepOrder}
                colors={colors}
                shadows={shadows}
                title=""
                compact
              />
            </View>
          </View>
        )}

        {isLoading && (
          <View style={styles.center}>
            <ThemedActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8, fontFamily }}>{t('common.loading')}</Text>
          </View>
        )}

        {isError && (
          <TouchableOpacity onPress={() => void refetch()} style={[styles.retry, { borderColor: colors.divider }]}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontFamily }}>{t('common.retry')}</Text>
          </TouchableOpacity>
        )}

        {/* ── Tab bar ── */}
        {!isLoading && (hasDetails || historyEntries.length > 0) && (
          <TabBar
            tabs={tabs}
            active={activeTab}
            onSelect={(id) => setActiveTab(id as 'details' | 'history')}
            colors={colors}
            fontFamily={fontFamily}
          />
        )}

        {/* ══ DETAILS TAB ══ */}
        {activeTab === 'details' && (
          <>
            {/* Common task fields (requestor, due date, etc.) */}
            {!isLoading && commonRows.length > 0 && (
              <View style={[styles.groupCard, shadows?.card, { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider }]}>
                <View style={[styles.groupHeader, { borderBottomColor: colors.divider }]}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.groupTitle, { color: colors.text, fontFamily }]}>
                    {t('approvals.detail.summary', 'Request')}
                  </Text>
                </View>
                {commonRows.map((f, i) => (
                  <FieldRow
                    key={`c-${f.fieldId ?? i}`}
                    field={f}
                    colors={colors}
                    fontFamily={fontFamily}
                    isLast={i === commonRows.length - 1}
                  />
                ))}
              </View>
            )}

            {/* Module-specific fields */}
            {!isLoading && moduleRows.length > 0 && (
              <View style={[styles.groupCard, shadows?.card, { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider, marginTop: 10 }]}>
                <View style={[styles.groupHeader, { borderBottomColor: colors.divider }]}>
                  <View style={[styles.dot, { backgroundColor: colors.success ?? colors.primary }]} />
                  <Text style={[styles.groupTitle, { color: colors.text, fontFamily }]}>
                    {moduleSectionTitle(t, moduleCode)}
                  </Text>
                </View>
                {moduleRows.map((f, i) => (
                  <FieldRow
                    key={`m-${f.fieldId ?? i}`}
                    field={f}
                    colors={colors}
                    fontFamily={fontFamily}
                    isLast={i === moduleRows.length - 1}
                  />
                ))}
              </View>
            )}

            {/* Fallback preview when no extra fields returned */}
            {!isLoading && commonRows.length === 0 && moduleRows.length === 0 && !!preview && (
              <View style={[styles.groupCard, shadows?.card, { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider }]}>
                <View style={[styles.groupHeader, { borderBottomColor: colors.divider }]}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.groupTitle, { color: colors.text, fontFamily }]}>{t('approvals.detail.summary', 'Request')}</Text>
                </View>
                <FieldRow field={{ label: t('approvals.detail.from', 'From'),     value: preview.fromName ?? null }} colors={colors} fontFamily={fontFamily} />
                <FieldRow field={{ label: t('approvals.detail.to', 'To'),         value: preview.toName ?? null }} colors={colors} fontFamily={fontFamily} />
                <FieldRow field={{ label: t('approvals.detail.status', 'Status'), value: preview.status ?? null }} colors={colors} fontFamily={fontFamily} />
                <FieldRow field={{ label: t('approvals.detail.priority', 'Priority'), value: preview.priority ?? null }} colors={colors} fontFamily={fontFamily} isLast />
              </View>
            )}

            {/* Friendly fallback card — for modules with no native screen yet */}
            {hadOpenWebOnly && (
              <View
                style={[
                  styles.unsupportedCard,
                  { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}33` },
                ]}
              >
                <Text style={[styles.unsupportedTitle, { color: colors.text, fontFamily }]}>
                  {t('approvals.unsupported.title', 'Not available on mobile yet')}
                </Text>
                <Text style={[styles.unsupportedBody, { color: colors.textMuted, fontFamily }]}>
                  {t(
                    'approvals.unsupported.body',
                    "This approval type isn't supported in the SmartSupport mobile app yet. Please open the SmartSupport web application to take action.",
                  )}
                </Text>
                <TouchableOpacity
                  style={[styles.btn, { borderColor: colors.primary, backgroundColor: colors.primary, marginTop: 12, marginBottom: 0 }]}
                  onPress={() => {
                    const link = (header as { returnLink?: string } | undefined)?.returnLink;
                    if (link && /^https?:/i.test(link)) void Linking.openURL(link);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', fontFamily }}>
                    {t('approvals.unsupported.openWeb', 'Continue in SmartSupport')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Not-actionable message */}
            {!isLoading && !canAct && !hadOpenWebOnly && (
              <View style={[styles.infoBox, { backgroundColor: `${colors.warning ?? '#F59E0B'}14`, borderColor: `${colors.warning ?? '#F59E0B'}40` }]}>
                <Text style={{ color: colors.warning ?? '#F59E0B', fontSize: 13, fontFamily, lineHeight: 18 }}>
                  {headerMsg || t('approvals.notActionable', 'This item is not available for action.')}
                </Text>
              </View>
            )}

            {/* ── Action buttons + comment input ── */}
            {canAct && actions.length > 0 && (
              <>
                <TextInput
                  placeholder={t('approvals.comment', 'Add a comment (optional)')}
                  value={comment}
                  onChangeText={setComment}
                  style={[styles.input, { color: colors.text, borderColor: colors.divider, backgroundColor: colors.card, fontFamily }]}
                  multiline
                  placeholderTextColor={colors.textMuted}
                />
                <View style={styles.actionRow}>
                  {actions.map((a) => {
                    const needC = !!a.requiresComment;
                    const dis   = (needC && !comment.trim()) || (!!busy && decLoading);
                    const bg    = vColor(a.variant || 'success');
                    // Resolve label: try i18n key first, then fall back to the
                    // labelKey itself (the SP now uses ActionPerformed text as
                    // a friendly fallback so "Task Forwarded" reads cleanly),
                    // and only as a last resort the raw actionCode.
                    const fallback = a.labelKey || a.actionCode;
                    const buttonLabel = a.labelKey
                      ? t(a.labelKey, { defaultValue: fallback })
                      : a.actionCode;
                    return (
                      <TouchableOpacity
                        key={`${a.actionCode}-${a.actionId ?? 0}`}
                        onPress={() => void run(a)}
                        disabled={!!dis}
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: dis ? `${bg}40` : bg,
                            opacity: dis ? 0.6 : 1,
                          },
                        ]}
                      >
                        {busy === a.actionCode && decLoading ? (
                          <ThemedActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                            style={{ color: '#fff', fontWeight: '700', textAlign: 'center', fontFamily, fontSize: 14 }}
                          >
                            {buttonLabel}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        {/* ══ HISTORY TAB ══ */}
        {activeTab === 'history' && (
          <>
            {historyEntries.length === 0 ? (
              <View style={styles.center}>
                <Text style={{ color: colors.textMuted, fontFamily, fontSize: 14 }}>
                  {t('approvals.detail.noHistory', 'No history yet')}
                </Text>
              </View>
            ) : (
              <View style={[styles.groupCard, shadows?.card, { backgroundColor: colors.card, borderColor: colors.border ?? colors.divider }]}>
                {historyEntries.map((entry, i) => {
                  const isLast  = i === historyEntries.length - 1;
                  const dateStr = entry.actionDate ? formatSmartDateTime(entry.actionDate) : '';
                  const action = (entry.actionPerformed ?? '').toLowerCase();
                  const dotColor =
                    action.includes('approv') ? colors.success :
                    action.includes('reject') || action.includes('back') ? colors.danger :
                    colors.primary;
                  return (
                    <View
                      key={`h-${entry.id ?? i}`}
                      style={[
                        hSty.row,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                      ]}
                    >
                      {/* timeline dot */}
                      <View style={hSty.dotCol}>
                        <View style={[hSty.dot, { backgroundColor: dotColor }]} />
                        {!isLast && <View style={[hSty.line, { backgroundColor: colors.divider }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={hSty.rowTop}>
                          <Text style={[hSty.actor, { color: colors.text, fontFamily }]} numberOfLines={1}>
                            {entry.actorName ?? '—'}
                          </Text>
                          {entry.percentage != null && (
                            <View style={[hSty.pctBadge, { backgroundColor: `${colors.primary}18` }]}>
                              <Text style={[hSty.pctText, { color: colors.primary, fontFamily }]}>{entry.percentage}%</Text>
                            </View>
                          )}
                        </View>
                        <View style={hSty.rowMeta}>
                          <View style={[hSty.actionPill, { backgroundColor: `${dotColor}18` }]}>
                            <Text style={[hSty.actionText, { color: dotColor, fontFamily }]}>
                              {entry.actionPerformed ?? '—'}
                            </Text>
                          </View>
                          {!!dateStr && (
                            <Text style={[hSty.date, { color: colors.textMuted, fontFamily }]}>{dateStr}</Text>
                          )}
                        </View>
                        {!!entry.comments && (
                          <Text style={[hSty.comments, { color: colors.textSecondary, fontFamily }]} selectable>
                            {entry.comments}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 14,
  },
  emoji: { fontSize: 36, marginTop: 2 },
  pillRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  pill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  hTitle: { fontSize: 18, fontWeight: '800', marginTop: 6, lineHeight: 24 },
  hSub:   { fontSize: 13, marginTop: 4, lineHeight: 18 },
  // Workflow card — full width, more breathing room
  wfCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  wfHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wfTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  groupTitle: { flex: 1, fontSize: 14, fontWeight: '800' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  center: { alignItems: 'center', padding: 20 },
  retry: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  infoBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    marginTop: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 120,
  },
  btn: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, alignItems: 'center' },
  unsupportedCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 8 },
  unsupportedTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  unsupportedBody: { fontSize: 13, lineHeight: 19 },
});

const hSty = StyleSheet.create({
  row:        { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  dotCol:     { width: 20, alignItems: 'center', paddingTop: 3 },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  line:       { flex: 1, width: 2, marginTop: 4 },
  rowTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  actor:      { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  pctBadge:   { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  pctText:    { fontSize: 11, fontWeight: '700' },
  rowMeta:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  actionPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  actionText: { fontSize: 11, fontWeight: '700' },
  date:       { fontSize: 11 },
  comments:   { fontSize: 13, lineHeight: 18, marginTop: 2 },
});

export default ApprovalDetailScreen;
