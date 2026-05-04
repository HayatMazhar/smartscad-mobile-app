import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import {
  useGetKPITargetsQuery,
  useSaveKpiTargetResultMutation,
} from '../services/pmsApi';
import type { PmsKpiTarget, PmsWriteResponse } from '../types';

type Action = 'Save' | 'Submit' | 'Approve' | 'Reject';

/**
 * Mirrors legacy SmartHelp/PMS/Views/KPIs/PartialViews/EnterResult/* — entering
 * a result on a KPI target and optionally advancing the workflow.
 *
 * Backed by Mobile.spMobile_PMS_KPITarget_SaveResult, which gates the action
 * server-side based on the per-KPI Responsible / DataEntry / Approver identity
 * (or a blanket Admin / CPP override).
 *
 * Route params:
 *   - kpiId         : number (required) — to load all targets and pick one
 *   - kpiTargetId   : number | null (optional, defaults to most recent target)
 *   - name          : string — KPI display name
 *   - measuringUnit : string — KPI unit label
 */
const PmsKpiEnterResultScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { colors, shadows } = useTheme();

  const kpiId: number = route?.params?.kpiId;
  const initialTargetId: number | null | undefined = route?.params?.kpiTargetId;
  const kpiName: string = route?.params?.name ?? '';
  const measuringUnit: string | undefined = route?.params?.measuringUnit;

  const targetsQ = useGetKPITargetsQuery(kpiId);
  const targets = useMemo(() => asArray<PmsKpiTarget>(targetsQ.data), [targetsQ.data]);

  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(initialTargetId ?? null);
  useEffect(() => {
    if (selectedTargetId == null && targets.length > 0) {
      setSelectedTargetId(targets[0].id);
    }
  }, [targets, selectedTargetId]);

  const selected = useMemo<PmsKpiTarget | undefined>(
    () => targets.find((t1) => t1.id === selectedTargetId),
    [targets, selectedTargetId],
  );

  // Form state — pre-fill from the existing target row.
  const [actualValue, setActualValue] = useState('');
  const [mainHighlights, setMainHighlights] = useState('');
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState('');
  const [nextActions, setNextActions] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [challenges, setChallenges] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (selected) {
      setActualValue(selected.actual ?? '');
      setMainHighlights(selected.mainHighlights ?? '');
      setReason(selected.reason ?? '');
      setImpact(selected.impact ?? '');
      setNextActions(selected.nextActions ?? '');
      setAnalysis(selected.analysis ?? '');
      setRecommendation(selected.recommendation ?? '');
      setChallenges(selected.challenges ?? '');
    }
  }, [selected]);

  const [saveTargetResult, saveState] = useSaveKpiTargetResultMutation();
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const isBusy = saveState.isLoading;

  const peelEnvelope = (resp: any): PmsWriteResponse => {
    if (resp && typeof resp === 'object' && 'data' in resp && resp.data && typeof resp.data === 'object') {
      const d = resp.data as Record<string, unknown>;
      if ('success' in d || 'message' in d) return d as unknown as PmsWriteResponse;
    }
    return resp as PmsWriteResponse;
  };

  const submit = async (action: Action) => {
    if (!selected) {
      setSubmitErr(t('pms.pickTarget', 'Pick a KPI target first'));
      return;
    }
    setSubmitErr(null);
    try {
      const resp = await saveTargetResult({
        kpiTargetId: selected.id,
        action,
        actualValue: actualValue.trim() || undefined,
        mainHighlights: mainHighlights.trim() || undefined,
        reason: reason.trim() || undefined,
        impact: impact.trim() || undefined,
        nextActions: nextActions.trim() || undefined,
        analysis: analysis.trim() || undefined,
        recommendation: recommendation.trim() || undefined,
        challenges: challenges.trim() || undefined,
        comments: comments.trim() || undefined,
      }).unwrap();
      const env = peelEnvelope(resp);
      if (env?.success === false) {
        setSubmitErr(env.message || t('pms.actionFailed', 'Action failed'));
        return;
      }
      Alert.alert(
        t('pms.success', 'Success'),
        env?.message || actionLabel(action, t),
        [{ text: t('common.ok', 'OK'), onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      setSubmitErr(e?.data?.message || e?.error || String(e));
    }
  };

  const step = selected?.workflowStepId ?? 1;
  const canSubmit = step <= 3;
  const canApprove = step >= 1 && step <= 3;
  const canReject = step >= 2;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, shadows.card, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroLabel}>{t('pms.enterResult', 'Enter Result')}</Text>
          <Text style={styles.heroName} numberOfLines={3}>{kpiName || `KPI #${kpiId}`}</Text>
          {!!selected && (
            <Text style={styles.heroSub}>
              {selected.code} · {t('pms.workflowStep', 'Step')} {step}/4
            </Text>
          )}
        </View>

        {/* Target picker (when there are multiple) */}
        {targets.length > 1 && (
          <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('pms.targetPeriod', 'Target Period')}
            </Text>
            <View style={styles.pillRow}>
              {targets.map((trg) => (
                <TouchableOpacity
                  key={trg.id}
                  onPress={() => setSelectedTargetId(trg.id)}
                  activeOpacity={0.8}
                  style={[
                    styles.pill,
                    {
                      backgroundColor:
                        trg.id === selectedTargetId ? colors.primary : colors.background,
                      borderColor:
                        trg.id === selectedTargetId ? colors.primary : colors.divider,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: trg.id === selectedTargetId ? '#FFF' : colors.text },
                    ]}
                  >
                    {trg.code || `T-${trg.id}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {targetsQ.isLoading && (
          <View style={{ alignItems: 'center', padding: 20 }}>
            <ThemedActivityIndicator color={colors.primary} />
          </View>
        )}

        {/* Target target / actual */}
        {!!selected && (
          <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            <View style={styles.rowSpread}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.target', 'Target')}</Text>
                <Text style={[styles.targetValueText, { color: colors.text }]}>{selected.target || '—'}</Text>
              </View>
              {!!measuringUnit && (
                <View style={{ flex: 0 }}>
                  <Text style={[styles.miniLabel, { color: colors.textMuted }]}>{t('pms.unit', 'Unit')}</Text>
                  <Text style={[styles.targetValueText, { color: colors.text }]}>{measuringUnit}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Actual value input */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('pms.actualValue', 'Actual Value')} *
          </Text>
          <TextInput
            value={actualValue}
            onChangeText={setActualValue}
            placeholder={t('pms.actualPlaceholder', 'Enter the measured value for this period')}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={[
              styles.inputSingle,
              { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider },
            ]}
            editable={!isBusy}
          />
        </View>

        {/* Narrative fields — match legacy EnterResult and Yearly_NoChildren views */}
        <NarrativeField
          label={t('pms.highlights', 'Highlights')}
          value={mainHighlights}
          onChange={setMainHighlights}
          colors={colors}
          shadows={shadows}
          editable={!isBusy}
          textAlign={isAr ? 'right' : 'left'}
        />
        <NarrativeField
          label={t('pms.reason', 'Reason / Variance')}
          value={reason}
          onChange={setReason}
          colors={colors}
          shadows={shadows}
          editable={!isBusy}
          textAlign={isAr ? 'right' : 'left'}
        />
        <NarrativeField
          label={t('pms.impact', 'Impact')}
          value={impact}
          onChange={setImpact}
          colors={colors}
          shadows={shadows}
          editable={!isBusy}
          textAlign={isAr ? 'right' : 'left'}
        />
        <NarrativeField
          label={t('pms.nextActions', 'Next actions')}
          value={nextActions}
          onChange={setNextActions}
          colors={colors}
          shadows={shadows}
          editable={!isBusy}
          textAlign={isAr ? 'right' : 'left'}
        />
        <NarrativeField
          label={t('pms.analysis', 'Analysis')}
          value={analysis}
          onChange={setAnalysis}
          colors={colors}
          shadows={shadows}
          editable={!isBusy}
          textAlign={isAr ? 'right' : 'left'}
        />
        <NarrativeField
          label={t('pms.recommendation', 'Recommendation')}
          value={recommendation}
          onChange={setRecommendation}
          colors={colors}
          shadows={shadows}
          editable={!isBusy}
          textAlign={isAr ? 'right' : 'left'}
        />
        <NarrativeField
          label={t('pms.challenges', 'Challenges')}
          value={challenges}
          onChange={setChallenges}
          colors={colors}
          shadows={shadows}
          editable={!isBusy}
          textAlign={isAr ? 'right' : 'left'}
        />
        <NarrativeField
          label={t('pms.commentsOptional', 'Comments (optional)')}
          value={comments}
          onChange={setComments}
          colors={colors}
          shadows={shadows}
          editable={!isBusy}
          textAlign={isAr ? 'right' : 'left'}
        />

        {!!submitErr && (
          <View style={[styles.errorCard, { backgroundColor: `${colors.danger}18`, borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{submitErr}</Text>
          </View>
        )}

        {/* Actions — Save (no advance) | Submit (advance to next step) | Approve | Reject */}
        <View style={[styles.actionWrap, shadows.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            onPress={() => submit('Save')}
            disabled={isBusy || !selected}
            style={[styles.btn, { backgroundColor: colors.primary, opacity: isBusy ? 0.6 : 1 }]}
            activeOpacity={0.85}
          >
            {isBusy && saveState.originalArgs?.action === 'Save' ? (
              <ThemedActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('common.save', 'Save')}</Text>
            )}
          </TouchableOpacity>

          {canSubmit && (
            <TouchableOpacity
              onPress={() => submit('Submit')}
              disabled={isBusy || !selected}
              style={[styles.btn, { backgroundColor: colors.success, opacity: isBusy ? 0.6 : 1 }]}
              activeOpacity={0.85}
            >
              {isBusy && saveState.originalArgs?.action === 'Submit' ? (
                <ThemedActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>{t('pms.submit', 'Submit')}</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.actionDivider} />

          {canApprove && (
            <TouchableOpacity
              onPress={() => submit('Approve')}
              disabled={isBusy || !selected}
              style={[styles.btn, { backgroundColor: colors.success, opacity: isBusy ? 0.6 : 1 }]}
              activeOpacity={0.85}
            >
              {isBusy && saveState.originalArgs?.action === 'Approve' ? (
                <ThemedActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>✓ {t('pms.approve', 'Approve')}</Text>
              )}
            </TouchableOpacity>
          )}

          {canReject && (
            <TouchableOpacity
              onPress={() => submit('Reject')}
              disabled={isBusy || !selected}
              style={[styles.btn, { backgroundColor: colors.danger, opacity: isBusy ? 0.6 : 1 }]}
              activeOpacity={0.85}
            >
              {isBusy && saveState.originalArgs?.action === 'Reject' ? (
                <ThemedActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>✕ {t('pms.reject', 'Reject')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const NarrativeField: React.FC<{
  label: string;
  value: string;
  onChange: (s: string) => void;
  colors: any;
  shadows: any;
  editable: boolean;
  textAlign?: 'left' | 'right';
}> = ({ label, value, onChange, colors, shadows, editable, textAlign }) => (
  <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={label}
      placeholderTextColor={colors.textMuted}
      multiline
      numberOfLines={4}
      editable={editable}
      style={[
        styles.input,
        {
          color: colors.text,
          backgroundColor: colors.background,
          borderColor: colors.divider,
          textAlign,
        },
      ]}
    />
  </View>
);

function actionLabel(a: Action, t: (k: string, def: string) => string): string {
  switch (a) {
    case 'Submit':  return t('pms.submitted', 'Submitted');
    case 'Approve': return t('pms.approved', 'Approved');
    case 'Reject':  return t('pms.rejected', 'Rejected');
    default:        return t('pms.saved', 'Saved');
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },

  hero: { borderRadius: 14, padding: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 6, lineHeight: 22 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 6 },

  card: { borderRadius: 12, padding: 14 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  miniLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  rowSpread: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  targetValueText: { fontSize: 16, fontWeight: '800', marginTop: 4 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },

  inputSingle: {
    height: 46, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, fontSize: 16, fontWeight: '700',
  },
  input: {
    minHeight: 90, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlignVertical: 'top',
  },

  errorCard: { borderRadius: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  errorText: { fontSize: 13, fontWeight: '600' },

  actionWrap: { borderRadius: 12, padding: 12, gap: 8 },
  actionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 4 },
  btn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});

export default PmsKpiEnterResultScreen;
