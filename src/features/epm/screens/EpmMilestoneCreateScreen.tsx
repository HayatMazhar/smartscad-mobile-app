import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useToast } from '../../../shared/components/Toast';
import { asObject } from '../../../shared/utils/apiNormalize';
import { useCreateEPMMilestoneMutation, useGetProjectQuery } from '../services/epmApi';
import { useAssignableReportingUsers } from '../../../shared/hooks/useAssignableReportingUsers';
import AssignableUserPicker from '../../../shared/components/AssignableUserPicker';
import DateField from '../../../shared/components/DateField';

/** Top-level milestone — `spMobile_EPM_CreateMilestone` wraps `spMobile_EPM_CreateTask` with IsMilestone=1 (web parity). */
const EpmMilestoneCreateScreen: React.FC<{ route: any }> = ({ route }) => {
  const { projectId } = route.params as { projectId: number };
  const navigation = useNavigation();
  const { colors, shadows } = useTheme();
  const toast = useToast();

  const { data: projRaw } = useGetProjectQuery(projectId);
  const project = useMemo(() => asObject<any>(projRaw) ?? projRaw ?? {}, [projRaw]);

  const defaultAssignee = useMemo(() => {
    const pm =
      project?.managerId ||
      project?.projectManagerId ||
      project?.projectManager ||
      project?.ownerId;
    return pm ? String(pm) : '';
  }, [project]);

  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weight, setWeight] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const { people, isLoading: assigneesLoading } = useAssignableReportingUsers(projectId);

  useEffect(() => {
    if (defaultAssignee && !assignedTo) setAssignedTo(defaultAssignee);
  }, [defaultAssignee, assignedTo]);

  const [create, { isLoading }] = useCreateEPMMilestoneMutation();

  const handleSubmit = async () => {
    if (!name.trim() || !startDate || !endDate) {
      Alert.alert('Required', 'Name, start date, and end date are required.');
      return;
    }
    if (!assignedTo.trim()) {
      Alert.alert('Required', 'Choose Assigned To.');
      return;
    }
    try {
      await create({
        projectId,
        body: {
          name: name.trim(), nameAr: nameAr.trim(),
          startDate, endDate,
          weight: weight ? Number(weight) : 0,
          assignedTo: assignedTo.trim(),
          isMilestone: true,
        },
      }).unwrap();
      toast.success('Created', 'Milestone created.');
      navigation.goBack();
    } catch {
      toast.error('Failed', 'Could not create milestone.');
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Name (EN) *</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]} value={name} onChangeText={setName} placeholder="Milestone name" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Name (AR)</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, textAlign: 'right' }]} value={nameAr} onChangeText={setNameAr} placeholder="الاسم" placeholderTextColor={colors.textMuted} />

        <AssignableUserPicker
          label="Assigned To *"
          value={assignedTo}
          onChange={setAssignedTo}
          people={people}
          isLoading={assigneesLoading}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Start Date *</Text>
        <DateField value={startDate} onChange={setStartDate} label="Start Date" />

        <Text style={[styles.label, { color: colors.textMuted }]}>End Date *</Text>
        <DateField value={endDate} onChange={setEndDate} label="End Date" />

        <Text style={[styles.label, { color: colors.textMuted }]}>Weight (%)</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: isLoading ? colors.textMuted : colors.primary }]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? <ThemedActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Milestone</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default EpmMilestoneCreateScreen;
