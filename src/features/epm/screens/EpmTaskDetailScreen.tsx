import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList, MoreTabNavigation } from '../../../app/navigation/mainNavigationTypes';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asObject } from '../../../shared/utils/apiNormalize';
import { useToast } from '../../../shared/components/Toast';
import {
  useGetEPMTaskQuery,
  useUpdateEPMTaskProgressMutation,
  useEditEPMTaskMutation,
} from '../services/epmApi';
import { useEpmProjectRights } from '../hooks/useEpmProjectRights';
import { useAppSelector } from '../../../store/store';

const EpmTaskDetailScreen: React.FC<{ route: RouteProp<MoreStackParamList, 'EpmTaskDetail'> }> = ({ route }) => {
  const { projectId, taskId } = route.params;
  const navigation = useNavigation<MoreTabNavigation<'EpmTaskDetail'>>();
  const { colors, shadows } = useTheme();
  const toast = useToast();
  const userId = useAppSelector((s) => s.auth.user?.userId ?? '');

  const { data, isLoading, isError, refetch } = useGetEPMTaskQuery(taskId);
  const task = asObject<any>(data) ?? {};
  const rights = useEpmProjectRights();

  const [newPct, setNewPct] = useState<string>('');
  const [pctComments, setPctComments] = useState<string>('');
  const [updateProgress, { isLoading: updating }] = useUpdateEPMTaskProgressMutation();

  const assignedLogin = task.assignedToLogin ?? task.assignedTo ?? '';
  const canUpdatePct = rights.canUpdateTaskProgress(assignedLogin);
  const canEdit = rights.canEditThisTask(assignedLogin);

  const handleUpdateProgress = async () => {
    const pct = Number(newPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert('Invalid', 'Percentage must be between 0 and 100.');
      return;
    }
    try {
      await updateProgress({ taskId, percentage: pct, comments: pctComments }).unwrap();
      toast.success('Updated', `Task progress set to ${pct}%.`);
      void refetch();
      setNewPct('');
      setPctComments('');
    } catch {
      toast.error('Failed', 'Could not update task progress.');
    }
  };

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ThemedActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (isError || !task.taskName) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Could not load task.</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary, marginTop: 12 }]} onPress={() => void refetch()}>
          <Text style={s.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pct = task.completionPercentage ?? 0;
  const statusColor = (s: string) => {
    if (s.includes('complete') || s.includes('approved')) return colors.success;
    if (s.includes('overdue') || s.includes('reject')) return colors.danger;
    if (s.includes('progress') || s.includes('plan')) return colors.primary;
    return colors.warning;
  };
  const sc = statusColor((task.status ?? '').toLowerCase());

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[s.title, { color: colors.text }]}>{task.taskName}</Text>
        <View style={[s.badge, { backgroundColor: `${sc}20` }]}>
          <Text style={[s.badgeText, { color: sc }]}>{task.status ?? '—'}</Text>
        </View>
        <Text style={[s.sub, { color: colors.textMuted }]}>{task.startDate} – {task.endDate}</Text>
        {task.assignedToName && <Text style={[s.sub, { color: colors.textSecondary }]}>Assignee: {task.assignedToName}</Text>}
        {task.description ? <Text style={[s.desc, { color: colors.textSecondary }]}>{task.description}</Text> : null}

        {/* Progress bar */}
        <View style={{ marginTop: 14 }}>
          <Text style={{ color: sc, fontWeight: '700', fontSize: 12 }}>{pct}% complete</Text>
          <View style={{ height: 8, backgroundColor: colors.greyCard, borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: 8, backgroundColor: sc, borderRadius: 4 }} />
          </View>
        </View>
      </View>

      {/* Update progress */}
      {canUpdatePct && (
        <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Update Progress</Text>
          <TextInput
            style={[s.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]}
            placeholder="New percentage (0-100)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={newPct}
            onChangeText={setNewPct}
          />
          <TextInput
            style={[s.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 72 }]}
            placeholder="Comments (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            value={pctComments}
            onChangeText={setPctComments}
          />
          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.primary }]}
            onPress={handleUpdateProgress}
            disabled={updating || !newPct}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>{updating ? 'Saving…' : 'Save Progress'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit button */}
      {canEdit && (
        <TouchableOpacity
          style={[s.card, shadows.card, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 10 }]}
          onPress={() => navigation.navigate('EpmTaskEdit', { projectId, taskId })}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 20 }}>✏️</Text>
          <Text style={[s.sectionTitle, { color: colors.primary }]}>Edit Task</Text>
        </TouchableOpacity>
      )}

      {/* Request change */}
      {canEdit && (
        <TouchableOpacity
          style={[s.card, shadows.card, { backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 10 }]}
          onPress={() => navigation.navigate('EpmTaskRequestChange', { projectId, taskId })}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 20 }}>🔄</Text>
          <Text style={[s.sectionTitle, { color: colors.warning }]}>Request Change</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 8 },
  sub: { fontSize: 12, marginTop: 3 },
  desc: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, fontSize: 14 },
  btn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default EpmTaskDetailScreen;
