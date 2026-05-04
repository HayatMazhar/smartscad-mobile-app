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
import { useCreateEPMTaskMutation, useGetProjectQuery } from '../services/epmApi';
import { useAssignableReportingUsers } from '../../../shared/hooks/useAssignableReportingUsers';
import AssignableUserPicker from '../../../shared/components/AssignableUserPicker';
import DateField from '../../../shared/components/DateField';

/**
 * Create EPM plan task. Hub task side-effects + assignor resolution match
 * `spMobile_EPM_CreateTask` (same as legacy `trgTask_INSERT` on web):
 * assignor = parent.AssignedTo else ProjectManager else current user.
 */
const EpmTaskCreateScreen: React.FC<{ route: any }> = ({ route }) => {
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
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weight, setWeight] = useState('');

  const { people, isLoading: assigneesLoading } = useAssignableReportingUsers(projectId);

  useEffect(() => {
    if (defaultAssignee && !assignedTo) setAssignedTo(defaultAssignee);
  }, [defaultAssignee, assignedTo]);

  const [create, { isLoading }] = useCreateEPMTaskMutation();

  const handleSubmit = async () => {
    if (!name.trim() || !startDate || !endDate) {
      Alert.alert('Required', 'Name, start date and end date are required.');
      return;
    }
    if (!assignedTo.trim()) {
      Alert.alert('Required', 'Choose Assigned To.');
      return;
    }
    try {
      await create({
        projectId,
        name: name.trim(),
        nameAr: nameAr.trim(),
        description: description.trim(),
        assignedTo: assignedTo.trim(),
        startDate,
        endDate,
        weight: weight ? Number(weight) : undefined,
      }).unwrap();
      toast.success('Created', 'Task created successfully.');
      navigation.goBack();
    } catch {
      toast.error('Failed', 'Could not create task. Check your input.');
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[s.label, { color: colors.textMuted }]}>Task Name (EN) *</Text>
        <TextInput style={[s.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]} value={name} onChangeText={setName} placeholder="Task name" placeholderTextColor={colors.textMuted} />

        <Text style={[s.label, { color: colors.textMuted }]}>Task Name (AR)</Text>
        <TextInput style={[s.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, textAlign: 'right' }]} value={nameAr} onChangeText={setNameAr} placeholder="اسم المهمة" placeholderTextColor={colors.textMuted} />

        <Text style={[s.label, { color: colors.textMuted }]}>Description</Text>
        <TextInput style={[s.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 80 }]} value={description} onChangeText={setDescription} placeholder="Task description" placeholderTextColor={colors.textMuted} multiline />

        <AssignableUserPicker
          label="Assigned To *"
          value={assignedTo}
          onChange={setAssignedTo}
          people={people}
          isLoading={assigneesLoading}
        />

        <Text style={[s.label, { color: colors.textMuted }]}>Start Date *</Text>
        <DateField value={startDate} onChange={setStartDate} label="Start Date" />

        <Text style={[s.label, { color: colors.textMuted }]}>End Date *</Text>
        <DateField value={endDate} onChange={setEndDate} label="End Date" />

        <Text style={[s.label, { color: colors.textMuted }]}>Weight (%)</Text>
        <TextInput style={[s.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]} value={weight} onChangeText={setWeight} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
      </View>

      <TouchableOpacity
        style={[s.submitBtn, { backgroundColor: isLoading ? colors.textMuted : colors.primary }]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? <ThemedActivityIndicator color="#fff" /> : <Text style={s.submitText}>Create Task</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default EpmTaskCreateScreen;
