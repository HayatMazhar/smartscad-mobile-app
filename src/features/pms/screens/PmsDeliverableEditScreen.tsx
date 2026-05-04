import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import DateField from '../../../shared/components/DateField';
import { useSaveDeliverableMutation } from '../services/pmsApi';
import { usePmsRoles } from '../hooks/usePmsRoles';
import type { PmsWriteResponse } from '../types';

/**
 * Insert / edit a PMS ProjectDeliverable.
 * Mirrors legacy SmartHelp/PMS/Views/Deliverables/Create.cshtml + Edit.cshtml.
 * Backed by Mobile.spMobile_PMS_Deliverable_Save.
 *
 * Server-side rules (Mobile.spMobile_PMS_Deliverable_Save):
 *  - Cross-entity check: parent ObjectiveDetail.EntityID must match user's
 *  - Role gate: PMSRole.Admin OR DeliverableAdmin
 *  - Already-approved deliverables cannot be edited (must revoke first)
 *
 * Route params:
 *   { deliverableId?, objectiveId, nameEn?, nameAr?, description?,
 *     startDate?, endDate?, performance?, assignedTo?, parentName? }
 */
const PmsDeliverableEditScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const params = route?.params ?? {};
  const isEdit = !!params.deliverableId;

  const objectiveId: number = params.objectiveId;

  const { canEditDeliverable } = usePmsRoles();

  const [nameEn, setNameEn] = useState<string>(params.nameEn ?? '');
  const [nameAr, setNameAr] = useState<string>(params.nameAr ?? '');
  const [description, setDescription] = useState<string>(params.description ?? '');
  const [assignedTo, setAssignedTo] = useState<string>(params.assignedTo ?? '');
  const [startDate, setStartDate] = useState<string>(params.startDate ?? '');
  const [endDate, setEndDate] = useState<string>(params.endDate ?? '');
  const [performance, setPerformance] = useState<string>(
    params.performance != null ? String(params.performance) : '0',
  );

  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [saveDeliverable, saveState] = useSaveDeliverableMutation();

  const peelEnvelope = (resp: any): PmsWriteResponse => {
    if (resp && typeof resp === 'object' && 'data' in resp && resp.data && typeof resp.data === 'object') {
      const d = resp.data as Record<string, unknown>;
      if ('success' in d || 'message' in d) return d as unknown as PmsWriteResponse;
    }
    return resp as PmsWriteResponse;
  };

  const validate = (): string | null => {
    if (!nameEn.trim() || !nameAr.trim()) {
      return t('pms.deliverableNameRequired', 'Name is required in both English and Arabic');
    }
    if (!assignedTo.trim()) {
      return t('pms.assignedToRequired', 'Assigned To (LoginID) is required');
    }
    if (!startDate || !endDate) {
      return t('pms.datesRequired', 'Start and End dates are required');
    }
    if (startDate > endDate) {
      return t('pms.dateRangeInvalid', 'Start date must be on or before End date');
    }
    if (performance.trim() !== '') {
      const n = Number(performance);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return t('pms.performanceRange', 'Performance must be a number between 0 and 100');
      }
    }
    return null;
  };

  const onSubmit = async () => {
    const err = validate();
    if (err) {
      setSubmitErr(err);
      return;
    }
    setSubmitErr(null);
    try {
      const perfNum = performance.trim() === '' ? null : Number(performance);
      const resp = await saveDeliverable({
        deliverableId: params.deliverableId ?? null,
        objectiveId,
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        performance: perfNum,
        assignedTo: assignedTo.trim(),
      }).unwrap();
      const env = peelEnvelope(resp);
      if (env?.success === false) {
        setSubmitErr(env.message || t('pms.actionFailed', 'Action failed'));
        return;
      }
      Alert.alert(t('pms.success', 'Success'), env?.message || t('pms.deliverableSaved', 'Deliverable saved'));
      navigation.goBack();
    } catch (e: any) {
      setSubmitErr(e?.data?.message || e?.error || String(e));
    }
  };

  const isBusy = saveState.isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, shadows.card, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroLabel}>
            {isEdit ? t('pms.editDeliverable', 'Edit Deliverable') : t('pms.newDeliverable', 'New Deliverable')}
          </Text>
          {!!params.parentName && (
            <Text style={styles.heroName} numberOfLines={2}>{params.parentName}</Text>
          )}
        </View>

        {!canEditDeliverable && (
          <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {t(
                'pms.deliverableNoRole',
                'Only PMS Admin or Deliverable Admin can save deliverables. The server will reject unauthorized writes.',
              )}
            </Text>
          </View>
        )}

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.nameEn', 'Name (English)')}</Text>
          <TextInput
            value={nameEn} onChangeText={setNameEn}
            placeholder={t('pms.deliverableNameEnPlaceholder', 'Deliverable name in English')}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
            editable={!isBusy}
          />
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.nameAr', 'Name (Arabic)')}</Text>
          <TextInput
            value={nameAr} onChangeText={setNameAr}
            placeholder={t('pms.deliverableNameArPlaceholder', 'اسم التسليم بالعربية')}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider, textAlign: 'right' }]}
            editable={!isBusy}
          />
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.descriptionEn', 'Description')}</Text>
          <TextInput
            value={description} onChangeText={setDescription}
            multiline numberOfLines={3}
            placeholder={t('pms.deliverableDescPlaceholder', 'Optional description')}
            placeholderTextColor={colors.textMuted}
            style={[styles.inputMulti, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
            editable={!isBusy}
          />
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.assignedTo', 'Assigned To (LoginID)')}</Text>
          <TextInput
            value={assignedTo} onChangeText={setAssignedTo}
            placeholder={t('pms.responsiblePlaceholder', 'e.g. scad\\username')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
            editable={!isBusy}
          />
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <DateField
            label={t('pms.startDate', 'Start Date')}
            value={startDate}
            onChange={setStartDate}
            disabled={isBusy}
          />
          <View style={{ height: 10 }} />
          <DateField
            label={t('pms.endDate', 'End Date')}
            value={endDate}
            onChange={setEndDate}
            min={startDate || undefined}
            disabled={isBusy}
          />
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.performancePct', 'Performance (%)')}</Text>
          <TextInput
            value={performance} onChangeText={setPerformance}
            placeholder="0 - 100"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
            editable={!isBusy}
          />
        </View>

        {!!submitErr && (
          <View style={[styles.errorCard, { backgroundColor: `${colors.danger}18`, borderColor: colors.danger }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{submitErr}</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={isBusy}
            style={[styles.btn, styles.btnSecondary, { borderColor: colors.divider, opacity: isBusy ? 0.5 : 1 }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: colors.text }]}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSubmit}
            disabled={isBusy || !canEditDeliverable}
            style={[
              styles.btn,
              {
                backgroundColor: canEditDeliverable ? colors.primary : colors.divider,
                opacity: isBusy ? 0.6 : 1,
              },
            ]}
            activeOpacity={0.85}
          >
            {isBusy ? (
              <ThemedActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('common.save', 'Save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  hero: { borderRadius: 14, padding: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 6, lineHeight: 20 },
  card: { borderRadius: 12, padding: 14 },
  bodyText: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  input: {
    minHeight: 44, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  inputMulti: {
    minHeight: 88, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlignVertical: 'top',
  },
  errorCard: { borderRadius: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  errorText: { fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1 },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  btnSecondaryText: { fontWeight: '700', fontSize: 14 },
});

export default PmsDeliverableEditScreen;
