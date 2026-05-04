import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useToast } from '../../../shared/components/Toast';
import { useCreateEPMIssueMutation } from '../services/epmApi';

const EpmIssueCreateScreen: React.FC<{ route: any }> = ({ route }) => {
  const { projectId } = route.params as { projectId: number };
  const navigation = useNavigation();
  const { colors, shadows } = useTheme();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [resolution, setResolution] = useState('');

  const [create, { isLoading }] = useCreateEPMIssueMutation();

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Issue title is required.');
      return;
    }
    try {
      await create({
        projectId,
        body: {
          projectId,
          title: title.trim(),
          description: description.trim(),
          responsible: responsible.trim(),
          resolution: resolution.trim(),
        },
      }).unwrap();
      toast.success('Created', 'Issue logged.');
      navigation.goBack();
    } catch {
      toast.error('Failed', 'Could not create issue.');
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Title *</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]} value={title} onChangeText={setTitle} placeholder="Issue title" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 90 }]} value={description} onChangeText={setDescription} multiline placeholder="Describe the issue" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Responsible (login)</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]} value={responsible} onChangeText={setResponsible} placeholder="e.g. scad\mqadir" placeholderTextColor={colors.textMuted} autoCapitalize="none" />

        <Text style={[styles.label, { color: colors.textMuted }]}>Proposed Resolution</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 72 }]} value={resolution} onChangeText={setResolution} multiline placeholder="How will this be resolved?" placeholderTextColor={colors.textMuted} />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: isLoading ? colors.textMuted : colors.danger }]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? <ThemedActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log Issue</Text>}
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

export default EpmIssueCreateScreen;
