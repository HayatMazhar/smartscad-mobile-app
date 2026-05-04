import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useRevokeObjectiveDetailMutation } from '../services/pmsApi';
import { usePmsRoles } from '../hooks/usePmsRoles';
import type { PmsWriteResponse } from '../types';

/**
 * Revoke a previously approved Service / Program / Sub-service.
 * Mirrors legacy SmartHelp/PMS/Views/ObjectiveDetails/Details.cshtml — the
 * Revoke Approval action. Backed by Mobile.spMobile_PMS_ObjectiveDetail_Revoke
 * (Admin or RevokeApprovals).
 */
const PmsObjectiveDetailRevokeScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const objectiveDetailId: number = route?.params?.objectiveDetailId;
  const name: string = route?.params?.name ?? '';
  const typeLabel: string = route?.params?.typeLabel ?? t('pms.serviceOrProgram', 'Service / Program');

  const { canRevokeApproval } = usePmsRoles();

  const [comments, setComments] = useState('');
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [revokeOd, revokeState] = useRevokeObjectiveDetailMutation();

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
      const resp = await revokeOd({ objectiveDetailId, comments: comments.trim() || undefined }).unwrap();
      const env = peelEnvelope(resp);
      if (env?.success === false) {
        setSubmitErr(env.message || t('pms.actionFailed', 'Action failed'));
        return;
      }
      Alert.alert(t('pms.success', 'Success'), env?.message || t('pms.objectiveDetailRevoked', 'Approval revoked'));
      navigation.goBack();
    } catch (e: any) {
      setSubmitErr(e?.data?.message || e?.error || String(e));
    }
  };

  const isBusy = revokeState.isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, shadows.card, { backgroundColor: colors.warning }]}>
          <Text style={styles.heroLabel}>{t('pms.revokeApproval', 'Revoke Approval')} · {typeLabel}</Text>
          <Text style={styles.heroName} numberOfLines={3}>{name || `#${objectiveDetailId}`}</Text>
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {canRevokeApproval
              ? t(
                  'pms.revokeObjectiveDetailHint',
                  'Revoking will clear the Approved date and ApprovedBy user on this service / program.',
                )
              : t(
                  'pms.revokeObjectiveDetailNoRole',
                  'You do not have the role required to revoke approvals (Admin or Revoke Approvals).',
                )}
          </Text>
        </View>

        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('pms.commentsRequired', 'Comments')}
          </Text>
          <TextInput
            value={comments}
            onChangeText={setComments}
            placeholder={t('pms.revokeCommentsPlaceholder', 'Reason for revoking the approval (recommended for audit)')}
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
            disabled={isBusy || !canRevokeApproval}
            style={[
              styles.btn,
              {
                backgroundColor: canRevokeApproval ? colors.warning : colors.divider,
                opacity: isBusy ? 0.6 : 1,
              },
            ]}
            activeOpacity={0.85}
          >
            {isBusy ? (
              <ThemedActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('pms.revoke', 'Revoke')}</Text>
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

export default PmsObjectiveDetailRevokeScreen;
