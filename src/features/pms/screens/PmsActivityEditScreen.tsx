import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import DateField from '../../../shared/components/DateField';
import { useSaveActivityMutation } from '../services/pmsApi';
import { usePmsRoles } from '../hooks/usePmsRoles';
import type { PmsWriteResponse } from '../types';

/**
 * Insert / edit a PMS Activity under an ObjectiveDetail.
 * Mirrors legacy SmartHelp/PMS/Views/Activities/Create.cshtml + Edit.cshtml.
 * Backed by Mobile.spMobile_PMS_Activity_Save.
 *
 * Server-side rules (Mobile.spMobile_PMS_Activity_Save):
 *  - Cross-entity check: activity.OD.EntityID must match the user's EntityID
 *  - If parent OD is NOT yet approved → owner of OD (Responsible) can save
 *  - Otherwise → only PMSRole.Admin or StrategyTeam can save
 *
 * Route params:
 *   { activityId?, objectiveDetailId, name?, nameAr?, description?, descriptionAr?,
 *     responsible?, startDate?, endDate? }
 */
const PmsActivityEditScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const params = route?.params ?? {};
  const isEdit = !!params.activityId;

  const objectiveDetailId: number = params.objectiveDetailId;

  const { hasAnyPmsRole } = usePmsRoles();

  const [name, setName] = useState<string>(params.name ?? '');
  const [nameAr, setNameAr] = useState<string>(params.nameAr ?? '');
  const [description, setDescription] = useState<string>(params.description ?? '');
  const [descriptionAr, setDescriptionAr] = useState<string>(params.descriptionAr ?? '');
  const [responsible, setResponsible] = useState<string>(params.responsible ?? '');
  const [startDate, setStartDate] = useState<string>(params.startDate ?? '');
  const [endDate, setEndDate] = useState<string>(params.endDate ?? '');

  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [saveActivity, saveState] = useSaveActivityMutation();

  const peelEnvelope = (resp: any): PmsWriteResponse => {
    if (resp && typeof resp === 'object' && 'data' in resp && resp.data && typeof resp.data === 'object') {
      const d = resp.data as Record<string, unknown>;
      if ('success' in d || 'message' in d) return d as unknown as PmsWriteResponse;
    }
    return resp as PmsWriteResponse;
  };

  const validate = (): string | null => {
    if (!name.trim() || !nameAr.trim() || !description.trim() || !descriptionAr.trim()) {
      return t('pms.activityNameDescRequired', 'Name and description are required in both English and Arabic');
    }
    if (!responsible.trim()) {
      return t('pms.activityResponsibleRequired', 'Responsible user (LoginID) is required');
    }
    if (!startDate || !endDate) {
      return t('pms.datesRequired', 'Start and End dates are required');
    }
    if (startDate > endDate) {
      return t('pms.dateRangeInvalid', 'Start date must be on or before End date');
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
      const resp = await saveActivity({
        activityId: params.activityId ?? null,
        objectiveDetailId,
        name: name.trim(),
        nameAr: nameAr.trim(),
        description: description.trim(),
        descriptionAr: descriptionAr.trim(),
        responsible: responsible.trim(),
        startDate,
        endDate,
        projectId: params.projectId ?? null,
        templateTaskId: params.templateTaskId ?? null,
      }).unwrap();
      const env = peelEnvelope(resp);
      if (env?.success === false) {
        setSubmitErr(env.message || t('pms.actionFailed', 'Action failed'));
        return;
      }
      Alert.alert(t('pms.success', 'Success'), env?.message || t('pms.activitySaved', 'Activity saved'));
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
            {isEdit ? t('pms.editActivity', 'Edit Activity') : t('pms.newActivity', 'New Activity')}
          </Text>
          {!!params.parentName && (
            <Text style={styles.heroName} numberOfLines={2}>{params.parentName}</Text>
          )}
        </View>

        {!hasAnyPmsRole && (
          <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {t('pms.activityNoRoleNote', 'You may only save an activity if you are the Responsible of the parent service / program (and it is not yet approved), or have the Admin / Strategy Team role. The server will reject unauthorized writes.')}
            </Text>
          </View>
        )}

        {/* Name (EN) */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.nameEn', 'Name (English)')}</Text>
          <TextInput
            value={name} onChangeText={setName}
            placeholder={t('pms.nameEnPlaceholder', 'Activity name in English')}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
            editable={!isBusy}
          />
        </View>

        {/* Name (AR) */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.nameAr', 'Name (Arabic)')}</Text>
          <TextInput
            value={nameAr} onChangeText={setNameAr}
            placeholder={t('pms.nameArPlaceholder', 'اسم النشاط بالعربية')}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider, textAlign: 'right' }]}
            editable={!isBusy}
          />
        </View>

        {/* Description EN */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.descriptionEn', 'Description (English)')}</Text>
          <TextInput
            value={description} onChangeText={setDescription}
            multiline numberOfLines={3}
            placeholder={t('pms.descriptionEnPlaceholder', 'What does this activity cover?')}
            placeholderTextColor={colors.textMuted}
            style={[styles.inputMulti, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
            editable={!isBusy}
          />
        </View>

        {/* Description AR */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.descriptionAr', 'Description (Arabic)')}</Text>
          <TextInput
            value={descriptionAr} onChangeText={setDescriptionAr}
            multiline numberOfLines={3}
            placeholder={t('pms.descriptionArPlaceholder', 'وصف النشاط')}
            placeholderTextColor={colors.textMuted}
            style={[styles.inputMulti, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider, textAlign: 'right' }]}
            editable={!isBusy}
          />
        </View>

        {/* Responsible */}
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('pms.responsible', 'Responsible (LoginID)')}</Text>
          <TextInput
            value={responsible} onChangeText={setResponsible}
            placeholder={t('pms.responsiblePlaceholder', 'e.g. scad\\username')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
            editable={!isBusy}
          />
        </View>

        {/* Dates */}
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
            disabled={isBusy}
            style={[styles.btn, { backgroundColor: colors.primary, opacity: isBusy ? 0.6 : 1 }]}
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

export default PmsActivityEditScreen;
