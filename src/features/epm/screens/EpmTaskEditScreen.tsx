import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asObject } from '../../../shared/utils/apiNormalize';
import { useToast } from '../../../shared/components/Toast';
import { useGetEPMTaskQuery, useEditEPMTaskMutation } from '../services/epmApi';
import DateField from '../../../shared/components/DateField';
import { useAssignableReportingUsers } from '../../../shared/hooks/useAssignableReportingUsers';
import AssignableUserPicker from '../../../shared/components/AssignableUserPicker';

const EpmTaskEditScreen: React.FC<{ route: any }> = ({ route }) => {
  const { projectId, taskId } = route.params as { projectId: number; taskId: number };
  const navigation = useNavigation();
  const { colors, shadows } = useTheme();
  const toast = useToast();

  const { data, isLoading } = useGetEPMTaskQuery(taskId);
  const task = asObject<any>(data) ?? {};

  const { people, isLoading: assigneesLoading } = useAssignableReportingUsers(projectId);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (task.taskName) {
      setName(task.taskName ?? '');
      setNameAr(task.taskNameAr ?? '');
      setDescription(task.description ?? '');
      setAssignedTo(task.assignedToLogin ?? task.assignedTo ?? '');
      setStartDate(task.startDate ?? '');
      setEndDate(task.endDate ?? '');
      setWeight(String(task.weight ?? ''));
    }
  }, [task.taskName]);

  const [save, { isLoading: saving }] = useEditEPMTaskMutation();

  const handleSave = async () => {
    if (!name.trim() || !startDate || !endDate) {
      Alert.alert('Required', 'Name, start date, and end date are required.');
      return;
    }
    try {
      await save({
        taskId,
        body: {
          projectId,
          name: name.trim(), nameAr: nameAr.trim(),
          description: description.trim(),
          assignedTo: assignedTo.trim(),
          startDate, endDate,
          weight: weight ? Number(weight) : 0,
        },
      }).unwrap();
      toast.success('Saved', 'Task updated.');
      navigation.goBack();
    } catch {
      toast.error('Failed', 'Could not save task.');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ThemedActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Name (EN) *</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]} value={name} onChangeText={setName} placeholder="Task name" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Name (AR)</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, textAlign: 'right' }]} value={nameAr} onChangeText={setNameAr} placeholder="اسم المهمة" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 80 }]} value={description} onChangeText={setDescription} multiline placeholder="Task description" placeholderTextColor={colors.textMuted} />

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
        style={[styles.submitBtn, { backgroundColor: saving ? colors.textMuted : colors.primary }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? <ThemedActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Changes</Text>}
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

export default EpmTaskEditScreen;
