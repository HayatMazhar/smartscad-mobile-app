import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useApproveObjectiveDetailMutation } from '../services/pmsApi';
import { usePmsRoles } from '../hooks/usePmsRoles';
import type { PmsWriteResponse } from '../types';

/**
 * Approve a Service / Program / Sub-service ObjectiveDetail.
 * Mirrors legacy SmartHelp/PMS/Views/ObjectiveDetails/Edit.cshtml when the user
 * clicks the "Approve" submit button. Backed by
 * Mobile.spMobile_PMS_ObjectiveDetail_Approve (Admin or Strategy Team).
 */
const PmsObjectiveDetailApproveScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const objectiveDetailId: number = route?.params?.objectiveDetailId;
  const name: string = route?.params?.name ?? '';
  const typeLabel: string = route?.params?.typeLabel ?? t('pms.serviceOrProgram', 'Service / Program');

  const { canEditObjectiveDetail } = usePmsRoles();

  const [comments, setComments] = useState('');
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [approveOd, approveState] = useApproveObjectiveDetailMutation();

  const peelEnvelope = (resp: any): PmsWriteResponse => {
    if (resp && typeof resp === 'object' && 'data' in resp && resp.data && typeof resp.data === 'object') {
      const d = resp.data as Record<string, unknown>;
      if ('success' in d || 'message' in d) return d as unknown as PmsWriteResponse;
    }
    return resp as PmsWriteResponse;
  };

  const onSubmit = async () => {
    setSubmitErr(null);
    try {
      const resp = await approveOd({ objectiveDetailId, comments: comments.trim() || undefined }).unwrap();
      const env = peelEnvelope(resp);
      if (env?.success === false) {
        setSubmitErr(env.message || t('pms.actionFailed', 'Action failed'));
        return;
      }
      Alert.alert(t('pms.success', 'Success'), env?.message || t('pms.objectiveDetailApproved', 'Service / Program approved'));
      navigation.goBack();
    } catch (e: any) {
      setSubmitErr(e?.data?.message || e?.error || String(e));
    }
  };

  const isBusy = approveState.isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, shadows.card, { backgroundColor: colors.success }]}>
          <Text style={styles.heroLabel}>{t('pms.approve', 'Approve')} · {typeLabel}</Text>
          <Text style={styles.heroName} numberOfLines={3}>{name || `#${objectiveDetailId}`}</Text>
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {canEditObjectiveDetail
              ? t(
                  'pms.approveObjectiveDetailHint',
                  'Approving locks the service / program. The parent service / program (if any) must be approved first.',
                )
              : t(
                  'pms.approveObjectiveDetailNoRole',
                  'You do not have the PMS Admin or Strategy Team role required to approve services / programs.',
                )}
          </Text>
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('pms.commentsOptional', 'Comments (optional)')}
          </Text>
          <TextInput
            value={comments}
            onChangeText={setComments}
            placeholder={t('pms.commentsPlaceholder', 'Add an approval note for the audit trail')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider },
            ]}
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
            disabled={isBusy || !canEditObjectiveDetail}
            style={[
              styles.btn,
              {
                backgroundColor: canEditObjectiveDetail ? colors.success : colors.divider,
                opacity: isBusy ? 0.6 : 1,
              },
            ]}
            activeOpacity={0.85}
          >
            {isBusy ? (
              <ThemedActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('pms.approve', 'Approve')}</Text>
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
  heroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 6, lineHeight: 22 },
  card: { borderRadius: 12, padding: 14 },
  bodyText: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  input: {
    minHeight: 110, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth,
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

export default PmsObjectiveDetailApproveScreen;
