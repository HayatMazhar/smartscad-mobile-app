import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import TicketActionField, { type ActionFieldRow } from './TicketActionField';
import {
  useTicketActionMutation,
  useTicketEnquiryReplyMutation,
  useTicketRevertMutation,
  useCancelTicketMutation,
  useRateTicketMutation,
} from '../services/ticketApi';
import { useToast } from '../../../shared/components/Toast';
import { useTheme } from '../../../app/theme/ThemeContext';

/** Bit from API (BIT / bool / numeric). */
export function ticketFlag(v: unknown): boolean {
  if (v === true || v === 1 || v === '1') return true;
  if (typeof v === 'string' && v.toLowerCase() === 'true') return true;
  return false;
}

export type TicketActionFormVariant =
  | 'enquiry'
  | 'editAttributes'
  | 'approval'
  | 'resolution'
  | 'rating'
  | 'revert'
  | 'cancel';

/**
 * Mirrors web PrepareTabs mutual-exclusion order exactly:
 *   editAttributes  → enquiry  → approval / resolution  → rating  → revert  → cancel
 *
 * Web rules (TicketController.cs lines 756-764):
 *   - EditableTicketAttributes removes TicketEnquiry   (editAttributes wins over enquiry)
 *   - TicketEnquiry removes Approval                   (enquiry wins over approval)
 *   - Approval removes AssignerRevert                  (approval wins over revert)
 *
 * Note: canReplyEnquiry from SP already gates on isWaitingForMe, so a stale unanswered
 * enquiry from a past workflow cycle no longer wrongly blocks the current approval action.
 */
export function resolveTicketActionFormVariant(ticket: any): TicketActionFormVariant | null {
  if (!ticket) return null;
  const stepPri = Number(ticket?.currentStepTypePriority ?? ticket?.CurrentStepTypePriority ?? 0);
  const stepTypeId = Number(ticket?.currentStepTypeId ?? ticket?.currentStepTypeID ?? 0);
  const isResolutionStep = stepTypeId === 4;
  const isWaitingForMe = ticketFlag(ticket.isWaitingForMe);
  const mo = ticketFlag(ticket.mobileApproval ?? ticket.MobileApproval);

  const approveFallback =
    (ticket.canApprove === undefined || ticket.canApprove === null) &&
    isWaitingForMe &&
    mo &&
    stepPri === 2 &&
    !isResolutionStep;
  const resolveFallback =
    (ticket.canResolve === undefined || ticket.canResolve === null) &&
    isWaitingForMe &&
    mo &&
    isResolutionStep;

  const canApprove =
    ticket.canApprove !== undefined && ticket.canApprove !== null
      ? ticketFlag(ticket.canApprove)
      : approveFallback;
  const canResolve =
    ticket.canResolve !== undefined && ticket.canResolve !== null
      ? ticketFlag(ticket.canResolve)
      : resolveFallback;

  // Web priority: editAttributes wins over enquiry wins over approval
  if (ticketFlag(ticket.canEditAttributes)) return 'editAttributes';
  if (ticketFlag(ticket.canReplyEnquiry)) return 'enquiry';
  if (canApprove) return 'approval';
  if (canResolve) return 'resolution';
  if (ticketFlag(ticket.canRate)) return 'rating';
  if (ticketFlag(ticket.canRevert)) return 'revert';
  if (ticketFlag(ticket.canCancel)) return 'cancel';
  return null;
}

/** Tab label keys for ticket detail segmented control */
export function ticketDetailActionTabTitle(ticket: any, translate: TFunction): string {
  const v = resolveTicketActionFormVariant(ticket);
  const labels: Record<TicketActionFormVariant, string> = {
    enquiry: translate('tickets.action.tab.replyEnquiry', 'Reply enquiry'),
    editAttributes: translate('tickets.action.tab.editRequest', 'Edit request'),
    approval: translate('tickets.tab.action', 'Action'),
    resolution: translate('tickets.action.tab.resolve', 'Resolve'),
    rating: translate('tickets.action.tab.rateService', 'Rate service'),
    revert: translate('tickets.action.tab.revert', 'Revert'),
    cancel: translate('tickets.action.tab.cancel', 'Cancel'),
  };
  return v ? labels[v] : translate('tickets.tab.action', 'Action');
}

function getFlag(flags: string | undefined, key: string): string | undefined {
  if (!flags) return undefined;
  const parts = flags.split('|');
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq < 0) continue;
    const k = p.slice(0, eq).trim();
    if (k === key) return p.slice(eq + 1);
  }
  return undefined;
}

function tagToAttrId(fields: ActionFieldRow[], tag: string): number | undefined {
  const tt = tag.trim();
  for (const f of fields) {
    if (getFlag(f.flags, 'Tag') === tt) return f.serviceAttributeId;
  }
  return undefined;
}

function matchesShowWhen(
  showWhen: string,
  fields: ActionFieldRow[],
  form: Record<string, string>,
): boolean {
  const pairs = showWhen.split(',').map((x) => x.trim()).filter(Boolean);
  for (const pair of pairs) {
    const idx = pair.indexOf(':');
    if (idx < 0) continue;
    const tag = pair.slice(0, idx);
    const expected = pair.slice(idx + 1);
    const attrId = tagToAttrId(fields, tag);
    if (attrId == null) return false;
    const cur = form[String(attrId)] ?? '';
    if (cur !== expected) return false;
  }
  return true;
}

function fieldPassesConditional(field: ActionFieldRow, allFields: ActionFieldRow[], form: Record<string, string>): boolean {
  if (field.isHidden) return false;

  const tagMatch = getFlag(field.flags, 'ShowWhenTagMatch');
  if (tagMatch) {
    const idx = tagMatch.indexOf(':');
    if (idx > 0) {
      const tag = tagMatch.slice(0, idx);
      const expected = tagMatch.slice(idx + 1);
      const attrId = tagToAttrId(allFields, tag);
      if (attrId == null) return false;
      const cur = form[String(attrId)] ?? '';
      if (cur !== expected) return false;
    }
  }

  const tagNot = getFlag(field.flags, 'ShowWhenTagNotMatch');
  if (tagNot) {
    const idx = tagNot.indexOf(':');
    if (idx > 0) {
      const tag = tagNot.slice(0, idx);
      const val = tagNot.slice(idx + 1);
      const attrId = tagToAttrId(allFields, tag);
      if (attrId != null) {
        const cur = form[String(attrId)] ?? '';
        if (cur === val) return false;
      }
    }
  }

  const sw = getFlag(field.flags, 'ShowWhen');
  if (sw && !matchesShowWhen(sw, allFields, form)) return false;

  return true;
}

function findAttrIdByNameHint(fields: ActionFieldRow[], hint: string): number | undefined {
  const h = hint.toLowerCase();
  const hit = fields.find(
    (f) =>
      String(f.name ?? '')
        .toLowerCase()
        .includes(h) ||
      String(f.nameAr ?? '')
        .toLowerCase()
        .includes(h),
  );
  return hit?.serviceAttributeId;
}

export type TicketActiveEnquiry = {
  enquiryId?: number;
  question?: string;
  questionAr?: string;
  askedByName?: string;
  createdDate?: string;
};

interface Props {
  ticketId: number;
  ticket: any;
  actionFields: ActionFieldRow[];
  activeEnquiry?: TicketActiveEnquiry | null;
  revertableSteps?: Array<{
    stepId: number;
    stepOrder?: number;
    stepName?: string;
    stepNameAr?: string;
    lastHandlerName?: string;
    lastHandlerId?: string;
  }>;
  delegatedBy?: string | null;
  onSuccess: () => void;
}

const TicketActionTab: React.FC<Props> = ({
  ticketId,
  ticket,
  actionFields,
  activeEnquiry,
  revertableSteps = [],
  delegatedBy,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const toast = useToast();

  const [performAction, { isLoading: busyAction }] = useTicketActionMutation();
  const [replyEnquiry, { isLoading: busyReply }] = useTicketEnquiryReplyMutation();
  const [revertTicket, { isLoading: busyRevert }] = useTicketRevertMutation();
  const [cancelTicket, { isLoading: busyCancel }] = useCancelTicketMutation();
  const [rateTicket, { isLoading: busyRate }] = useRateTicketMutation();

  const isLoading = busyAction || busyReply || busyRevert || busyCancel || busyRate;

  const variant = useMemo(() => resolveTicketActionFormVariant(ticket), [ticket]);

  const isResolutionStep = variant === 'resolution';

  const editableFieldsRaw = useMemo(
    () => (actionFields ?? []).filter((f) => ticketFlag(f.isEditable) && !f.isHidden),
    [actionFields],
  );

  const visibleFields = useMemo(
    () => (actionFields ?? []).filter((f) => !f.isHidden),
    [actionFields],
  );

  const scopeFields = variant === 'editAttributes' ? editableFieldsRaw : visibleFields;

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of scopeFields) {
      next[String(f.serviceAttributeId)] = f.currentValue ?? '';
    }
    setForm(next);
  }, [scopeFields]);

  const [approvalChoice, setApprovalChoice] = useState<2 | 3 | 10>(2);
  const [comments, setComments] = useState('');
  const [enquiryReply, setEnquiryReply] = useState('');
  const [implPlan, setImplPlan] = useState('');
  const [rollbackPlan, setRollbackPlan] = useState('');
  const [rating, setRating] = useState(0);
  const [cancelReason, setCancelReason] = useState('');
  const [revertComments, setRevertComments] = useState('');
  const [revertSel, setRevertSel] = useState(revertableSteps[0]?.stepId ?? 0);

  useEffect(() => {
    const first = revertableSteps[0];
    setRevertSel(first?.stepId ?? 0);
  }, [revertableSteps]);

  const showReject = Boolean(ticket?.showRejectButton ?? true);
  const showSkip = Boolean(ticket?.showSkipButton ?? false);
  const isChangeRequest = Boolean(ticket?.isChangeRequest);

  const renderedFields = useMemo(
    () => scopeFields.filter((f) => fieldPassesConditional(f, scopeFields, form)),
    [scopeFields, form],
  );

  const setVal = (id: number, v: string) => {
    setForm((prev) => ({ ...prev, [String(id)]: v }));
  };

  const buildAttributePairsFrom = (fields: ActionFieldRow[]): { id: number; value: string }[] => {
    const pairs: { id: number; value: string }[] = [];
    for (const f of fields) {
      const v = form[String(f.serviceAttributeId)] ?? '';
      pairs.push({ id: f.serviceAttributeId, value: v });
    }
    if (isChangeRequest && isResolutionStep) {
      const implId = findAttrIdByNameHint(visibleFields, 'implementation');
      const rbId = findAttrIdByNameHint(visibleFields, 'rollback');
      if (implId != null && implPlan) pairs.push({ id: implId, value: implPlan });
      if (rbId != null && rollbackPlan) pairs.push({ id: rbId, value: rollbackPlan });
    }
    return pairs;
  };

  const validateResolution = (): boolean => {
    if (!comments.trim()) {
      toast.error(t('tickets.action.resolutionCommentsRequired', 'Resolution comments are required'));
      return false;
    }
    for (const f of renderedFields) {
      if (!f.isRequired) continue;
      const v = (form[String(f.serviceAttributeId)] ?? '').trim();
      if (!v) {
        toast.error(t('tickets.action.fieldRequired', 'Please fill all required fields'));
        return false;
      }
    }
    if (isChangeRequest) {
      const implId = findAttrIdByNameHint(visibleFields, 'implementation');
      const rbId = findAttrIdByNameHint(visibleFields, 'rollback');
      if (implId != null && !implPlan.trim()) {
        toast.error(t('tickets.action.implRequired', 'Implementation plan is required'));
        return false;
      }
      if (rbId != null && !rollbackPlan.trim()) {
        toast.error(t('tickets.action.rollbackRequired', 'Rollback plan is required'));
        return false;
      }
    }
    return true;
  };

  const validateApproval = (): boolean => {
    if (approvalChoice === 3 && !comments.trim()) {
      toast.error(t('tickets.action.rejectCommentsRequired', 'Comments are required to reject'));
      return false;
    }
    return true;
  };

  const selectedRevertRow = useMemo(() => {
    const r = revertableSteps.find((x) => x.stepId === revertSel) ?? revertableSteps[0];
    return r;
  }, [revertableSteps, revertSel]);

  const submit = async () => {
    try {
      if (variant === 'enquiry') {
        if (!enquiryReply.trim()) {
          toast.error(t('tickets.action.replyRequired', 'Please enter your reply'));
          return;
        }
        await replyEnquiry({ ticketId, reply: enquiryReply.trim() }).unwrap();
      } else if (variant === 'editAttributes') {
        if (editableFieldsRaw.length === 0) {
          toast.error(t('tickets.action.noEditableFields', 'No editable fields for this step'));
          return;
        }
        for (const f of renderedFields) {
          if (!f.isRequired) continue;
          const v = (form[String(f.serviceAttributeId)] ?? '').trim();
          if (!v) {
            toast.error(t('tickets.action.fieldRequired', 'Please fill all required fields'));
            return;
          }
        }
        const pairs = buildAttributePairsFrom(renderedFields);
        await performAction({
          ticketId,
          body: {
            actionType: 5,
            comments: comments.trim(),
            attributeValuesJson: pairs.length ? JSON.stringify(pairs) : undefined,
            delegatedBy: delegatedBy || undefined,
          },
        }).unwrap();
      } else if (variant === 'rating') {
        if (rating < 1 || rating > 5) {
          toast.error(t('tickets.action.ratingRequired', 'Please choose a rating'));
          return;
        }
        await rateTicket({
          ticketId,
          body: { rating, comments: comments.trim() },
        }).unwrap();
      } else if (variant === 'revert') {
        if (!selectedRevertRow) {
          toast.error(t('tickets.action.revertPickStep', 'Select a workflow step'));
          return;
        }
        if (!revertComments.trim()) {
          toast.error(t('tickets.action.revertCommentsRequired', 'Comments are required'));
          return;
        }
        await revertTicket({
          ticketId,
          targetStepId: selectedRevertRow.stepId,
          targetUserId: selectedRevertRow.lastHandlerId ?? '',
          comments: revertComments.trim(),
        }).unwrap();
      } else if (variant === 'cancel') {
        if (!cancelReason.trim()) {
          toast.error(t('tickets.action.cancelReasonRequired', 'A reason is required'));
          return;
        }
        await cancelTicket({
          ticketId,
          body: { comments: cancelReason.trim() },
        }).unwrap();
      } else if (variant === 'resolution') {
        if (!validateResolution()) return;
        const pairs = buildAttributePairsFrom(renderedFields);
        await performAction({
          ticketId,
          body: {
            actionType: 2,
            comments: comments.trim(),
            attributeValuesJson: pairs.length ? JSON.stringify(pairs) : undefined,
          },
        }).unwrap();
      } else if (variant === 'approval') {
        if (!validateApproval()) return;
        await performAction({
          ticketId,
          body: {
            actionType: approvalChoice,
            comments: comments.trim(),
            delegatedBy: delegatedBy || undefined,
          },
        }).unwrap();
      } else if (variant == null) {
        if (!comments.trim()) {
          toast.error(t('tickets.action.commentsRequired', 'Comments are required'));
          return;
        }
        for (const f of renderedFields) {
          if (!f.isRequired) continue;
          const v = (form[String(f.serviceAttributeId)] ?? '').trim();
          if (!v) {
            toast.error(t('tickets.action.fieldRequired', 'Please fill all required fields'));
            return;
          }
        }
        const pairs = buildAttributePairsFrom(renderedFields);
        await performAction({
          ticketId,
          body: {
            actionType: 2,
            comments: comments.trim(),
            attributeValuesJson: pairs.length > 0 ? JSON.stringify(pairs) : undefined,
            delegatedBy: delegatedBy || undefined,
          },
        }).unwrap();
      }
      toast.success(t('tickets.action.done', 'Action saved'));
      onSuccess();
    } catch {
      toast.error(t('tickets.action.failed', 'Action failed'));
    }
  };

  const title =
    variant != null ? ticketDetailActionTabTitle(ticket, t) : t('tickets.action.title', 'Take action');

  return (
    <View style={[styles.card, shadows.card, { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 12 }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {variant === 'enquiry' && (
        <>
          {activeEnquiry ? (
            <>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('tickets.action.enquiryFrom', 'Question from')} {activeEnquiry.askedByName ?? '—'}
              </Text>
              <View style={[styles.readonlyBox, { borderColor: colors.divider }]}>
                <Text style={{ color: colors.textSecondary }}>
                  {i18n.language?.startsWith('ar')
                    ? activeEnquiry.questionAr ?? activeEnquiry.question
                    : activeEnquiry.question}
                </Text>
              </View>
            </>
          ) : (
            <Text style={{ color: colors.textMuted, marginBottom: 8 }}>
              {t('tickets.action.enquiryNoDetail', 'You have an open enquiry on this ticket.')}
            </Text>
          )}
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('tickets.action.yourReply', 'Your reply')}</Text>
          <TextInput
            value={enquiryReply}
            onChangeText={setEnquiryReply}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
            style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
          />
        </>
      )}

      {variant === 'editAttributes' && (
        <>
          {renderedFields.map((f) => (
            <TicketActionField
              key={f.serviceAttributeId}
              field={f}
              value={form[String(f.serviceAttributeId)] ?? ''}
              onChange={(v) => setVal(f.serviceAttributeId, v)}
              colors={colors}
              lang={i18n.language}
            />
          ))}
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {t('tickets.action.comments', 'Comments')}
          </Text>
          <TextInput
            value={comments}
            onChangeText={setComments}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
            style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
          />
        </>
      )}

      {variant === 'rating' && (
        <>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {t('tickets.action.rateHint', 'Tap a star rating (required)')}
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setRating(s)}
                style={[styles.starBtn, s <= rating && { backgroundColor: `${colors.primary}22` }]}
                activeOpacity={0.75}
              >
                <Text style={[styles.starTxt, { color: s <= rating ? colors.primary : colors.textMuted }]}>{'★'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {t('tickets.action.commentsOptional', 'Comments (optional)')}
          </Text>
          <TextInput
            value={comments}
            onChangeText={setComments}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
            style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
          />
        </>
      )}

      {variant === 'revert' && (
        <>
          {revertableSteps.length === 0 ? (
            <Text style={{ color: colors.danger }}>
              {t('tickets.action.noRevertSteps', 'No revert targets available')}
            </Text>
          ) : (
            <>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {t('tickets.action.revertPick', 'Revert to')}
              </Text>
              {revertableSteps.map((rw) => {
                const lbl = `${i18n.language?.startsWith('ar') && rw.stepNameAr ? rw.stepNameAr : rw.stepName ?? '—'} (${rw.lastHandlerName ?? '—'})`;
                const on = revertSel === rw.stepId || (revertSel === 0 && rw === revertableSteps[0]);
                return (
                  <TouchableOpacity
                    key={rw.stepId}
                    style={[
                      styles.choice,
                      { borderColor: on ? colors.primary : colors.divider },
                    ]}
                    onPress={() => setRevertSel(rw.stepId)}
                    activeOpacity={0.75}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{lbl}</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('tickets.action.comments', 'Comments')}
              </Text>
              <TextInput
                value={revertComments}
                onChangeText={setRevertComments}
                multiline
                textAlignVertical="top"
                placeholderTextColor={colors.textMuted}
                style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
              />
            </>
          )}
        </>
      )}

      {variant === 'cancel' && (
        <>
          <Text style={{ color: colors.danger, marginBottom: 12, fontWeight: '700' }}>
            {t('tickets.action.cancelWarn', 'This will cancel the request. This cannot be undone.')}
          </Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('tickets.action.cancelReason', 'Reason')}</Text>
          <TextInput
            value={cancelReason}
            onChangeText={setCancelReason}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
            style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
          />
        </>
      )}

      {variant === 'approval' && (
        <>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t('tickets.action.chooseOutcome', 'Choose an outcome')}</Text>
          <TouchableOpacity
            style={[styles.choice, approvalChoice === 2 && { borderColor: colors.primary }]}
            onPress={() => setApprovalChoice(2)}
            activeOpacity={0.75}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t('tickets.action.approve', 'Approve')}</Text>
          </TouchableOpacity>
          {showReject && (
            <TouchableOpacity
              style={[styles.choice, approvalChoice === 3 && { borderColor: colors.danger }]}
              onPress={() => setApprovalChoice(3)}
              activeOpacity={0.75}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('tickets.action.reject', 'Reject')}</Text>
            </TouchableOpacity>
          )}
          {showSkip && (
            <TouchableOpacity
              style={[styles.choice, approvalChoice === 10 && { borderColor: colors.textSecondary }]}
              onPress={() => setApprovalChoice(10)}
              activeOpacity={0.75}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('tickets.action.skip', 'Skip')}</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.label, { color: colors.textMuted }]}>{t('tickets.action.comments', 'Comments')}</Text>
          <TextInput
            value={comments}
            onChangeText={setComments}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
            style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
          />
        </>
      )}

      {variant === 'resolution' && (
        <>
          {isChangeRequest && (
            <>
              <Text style={[styles.section, { color: colors.textMuted }]}>{t('tickets.action.changeRequest', 'Change request')}</Text>
              <Text style={[styles.label, { color: colors.textMuted }]}>{t('tickets.action.implPlan', 'Implementation plan')}</Text>
              <TextInput
                value={implPlan}
                onChangeText={setImplPlan}
                multiline
                textAlignVertical="top"
                placeholderTextColor={colors.textMuted}
                style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
              />
              <Text style={[styles.label, { color: colors.textMuted }]}>{t('tickets.action.rollbackPlan', 'Rollback plan')}</Text>
              <TextInput
                value={rollbackPlan}
                onChangeText={setRollbackPlan}
                multiline
                textAlignVertical="top"
                placeholderTextColor={colors.textMuted}
                style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
              />
            </>
          )}
          {renderedFields.map((f) => (
            <TicketActionField
              key={f.serviceAttributeId}
              field={f}
              value={form[String(f.serviceAttributeId)] ?? ''}
              onChange={(v) => setVal(f.serviceAttributeId, v)}
              colors={colors}
              lang={i18n.language}
            />
          ))}
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {t('tickets.action.resolutionComments', 'Resolution / technician comments')}
          </Text>
          <TextInput
            value={comments}
            onChangeText={setComments}
            multiline
            textAlignVertical="top"
            placeholderTextColor={colors.textMuted}
            style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
          />
        </>
      )}

      {variant === null && renderedFields.length > 0 && (
          <>
            {renderedFields.map((f) => (
              <TicketActionField
                key={f.serviceAttributeId}
                field={f}
                value={form[String(f.serviceAttributeId)] ?? ''}
                onChange={(v) => setVal(f.serviceAttributeId, v)}
                colors={colors}
                lang={i18n.language}
              />
            ))}
          </>
        )}

      {variant === null && (
          <>
            <Text style={[styles.label, { color: colors.textMuted }]}>{t('tickets.action.comments', 'Comments')}</Text>
            <TextInput
              value={comments}
              onChangeText={setComments}
              multiline
              textAlignVertical="top"
              placeholderTextColor={colors.textMuted}
              style={[styles.ta, { borderColor: colors.divider, color: colors.text }]}
            />
          </>
        )}

      <TouchableOpacity
        style={[styles.submit, { backgroundColor: colors.primary, opacity: isLoading ? 0.65 : 1 }]}
        onPress={() => void submit()}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? <ThemedActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>{t('tickets.action.submit', 'Submit')}</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 24 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  hint: { fontSize: 13, marginBottom: 8 },
  readonlyBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  starBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd' },
  starTxt: { fontSize: 22 },
  choice: {
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderColor: '#ddd',
  },
  section: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  ta: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  submit: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default TicketActionTab;
