import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useToast } from '../../../shared/components/Toast';
import { useRequestEPMTaskChangeMutation } from '../services/epmApi';
import DateField from '../../../shared/components/DateField';

const EpmTaskRequestChangeScreen: React.FC<{ route: any }> = ({ route }) => {
  const { projectId, taskId } = route.params as { projectId: number; taskId: number };
  const navigation = useNavigation();
  const { colors, shadows } = useTheme();
  const toast = useToast();

  const [reason, setReason] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newProgress, setNewProgress] = useState('');

  const [request, { isLoading }] = useRequestEPMTaskChangeMutation();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Reason for change is required.');
      return;
    }
    try {
      await request({
        taskId,
        body: {
          projectId,
          reason: reason.trim(),
          requestedEndDate: newEndDate || undefined,
          requestedPercentage: newProgress ? Number(newProgress) : undefined,
        },
      }).unwrap();
      toast.success('Submitted', 'Change request submitted successfully.');
      navigation.goBack();
    } catch {
      toast.error('Failed', 'Could not submit change request.');
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 8 }}>
          Use this form to request changes to this task's timeline or progress. Your request will be submitted to the project manager for approval.
        </Text>

        <Text style={[styles.label, { color: colors.textMuted }]}>Reason for Change *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 90 }]}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Explain why this change is needed"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Requested New End Date</Text>
        <DateField value={newEndDate} onChange={setNewEndDate} label="New End Date (optional)" />

        <Text style={[styles.label, { color: colors.textMuted }]}>Requested Completion %</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]}
          value={newProgress}
          onChangeText={setNewProgress}
          keyboardType="numeric"
          placeholder="e.g. 75"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: isLoading ? colors.textMuted : colors.warning }]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? <ThemedActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Change Request</Text>}
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

export default EpmTaskRequestChangeScreen;
