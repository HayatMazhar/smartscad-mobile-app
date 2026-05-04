import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList, MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asObject } from '../../../shared/utils/apiNormalize';
import { useToast } from '../../../shared/components/Toast';
import { pickOneDocumentForUpload } from '../../../shared/utils/pickDocument';
import {
  useGetProjectMilestoneDetailQuery,
  useGetMilestoneEvidenceQuery,
  useUploadMilestoneEvidenceMutation,
  useApproveMilestoneMutation,
} from '../services/epmApi';
import { useEpmProjectRights } from '../hooks/useEpmProjectRights';
import { asArray } from '../../../shared/utils/apiNormalize';

const EpmMilestoneDetailScreen: React.FC<{ route: RouteProp<MoreStackParamList, 'EpmMilestoneDetail'> }> = ({
  route,
}) => {
  const { projectId, milestoneId } = route.params;
  const navigation = useNavigation<MoreTabNavigation<'EpmMilestoneDetail'>>();
  const { colors, shadows } = useTheme();
  const toast = useToast();
  const rights = useEpmProjectRights();

  const { data, isLoading, isError, refetch } = useGetProjectMilestoneDetailQuery({ projectId, milestoneId });
  const { data: evData } = useGetMilestoneEvidenceQuery(milestoneId, { skip: milestoneId == null });
  const [uploadEvidence, { isLoading: upLoading }] = useUploadMilestoneEvidenceMutation();
  const [approveMil, { isLoading: approving }] = useApproveMilestoneMutation();

  const milestone = asObject<any>(data) ?? {};
  const evidence = asArray<any>(evData);
  const assignedLogin = milestone.assignedToLogin ?? milestone.assignedTo ?? '';

  const canEdit = rights.canEditThisMilestone(assignedLogin);
  const canUpload = rights.canUploadEvidence(assignedLogin);
  const canApprove = rights.canApproveMilestone;

  const pct = milestone.completionPercentage ?? 0;
  const statusCol = (st: string) => {
    if (st.includes('complete') || st.includes('approved')) return colors.success;
    if (st.includes('overdue') || st.includes('reject')) return colors.danger;
    if (st.includes('progress')) return colors.primary;
    return colors.warning;
  };
  const sc = statusCol((milestone.status ?? '').toLowerCase());

  if (isLoading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ThemedActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (isError || !milestone.milestoneName) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text }}>Could not load milestone.</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, marginTop: 12 }]} onPress={() => void refetch()}>
        <Text style={styles.btnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>{milestone.milestoneName}</Text>
        <View style={[styles.badge, { backgroundColor: `${sc}20`, alignSelf: 'flex-start' }]}>
          <Text style={[styles.badgeText, { color: sc }]}>{milestone.status ?? '—'}</Text>
        </View>
        <Text style={[styles.meta, { color: colors.textMuted }]}>{milestone.startDate} – {milestone.endDate}</Text>
        {milestone.assignedToName && <Text style={[styles.meta, { color: colors.textSecondary }]}>Assignee: {milestone.assignedToName}</Text>}
        {milestone.weight > 0 && <Text style={[styles.meta, { color: colors.textSecondary }]}>Weight: {milestone.weight}%</Text>}

        <View style={{ marginTop: 14 }}>
          <Text style={{ color: sc, fontWeight: '700', fontSize: 12 }}>{pct}% complete</Text>
          <View style={{ height: 8, backgroundColor: colors.greyCard, borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: 8, backgroundColor: sc, borderRadius: 4 }} />
          </View>
        </View>
      </View>

      {/* Evidence list */}
      {evidence.length > 0 && (
        <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>Evidence Files</Text>
          {evidence.map((ev: any, i: number) => (
            <View key={ev.id ?? i} style={{ paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }}>
              <Text style={[styles.meta, { color: colors.text }]}>{ev.fileName}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{ev.uploadedDate}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Upload evidence */}
      {canUpload && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.success, flexDirection: 'row', gap: 8 }]}
          onPress={async () => {
            try {
              const file = await pickOneDocumentForUpload();
              if (!file) return;
              await uploadEvidence({ milestoneId, file }).unwrap();
              toast.success('Uploaded', 'Evidence saved.');
            } catch {
              toast.error('Failed', 'Upload failed.');
            }
          }}
          disabled={upLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{upLoading ? 'Uploading…' : '📎 Upload Evidence'}</Text>
        </TouchableOpacity>
      )}

      {/* Edit */}
      {canEdit && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('EpmMilestoneEdit', { projectId, milestoneId })}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>✏️ Edit Milestone</Text>
        </TouchableOpacity>
      )}

      {/* Approve */}
      {canApprove && milestone.status !== 'Completed' && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.success }]}
          onPress={async () => {
            try {
              await approveMil({ milestoneId, body: { approved: true } }).unwrap();
              toast.success('Approved', 'Milestone marked as approved.');
              void refetch();
            } catch {
              toast.error('Failed', 'Could not approve milestone.');
            }
          }}
          disabled={approving}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{approving ? 'Approving…' : '✅ Approve Milestone'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 8 },
  meta: { fontSize: 12, marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default EpmMilestoneDetailScreen;
