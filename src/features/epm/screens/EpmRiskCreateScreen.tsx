import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../app/theme/ThemeContext';
import { useToast } from '../../../shared/components/Toast';
import { useCreateEPMRiskMutation } from '../services/epmApi';

const LEVELS = [1, 2, 3, 4, 5];

const EpmRiskCreateScreen: React.FC<{ route: any }> = ({ route }) => {
  const { projectId } = route.params as { projectId: number };
  const navigation = useNavigation();
  const { colors, shadows } = useTheme();
  const toast = useToast();

  const [description, setDescription] = useState('');
  const [likelihood, setLikelihood] = useState(3);
  const [consequence, setConsequence] = useState(3);
  const [consequenceImpact, setConsequenceImpact] = useState('');
  const [mitigation, setMitigation] = useState('');
  const [responsible, setResponsible] = useState('');

  const [create, { isLoading }] = useCreateEPMRiskMutation();

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Risk description is required.');
      return;
    }
    try {
      await create({
        projectId,
        body: {
          projectId, description: description.trim(),
          likelihood, consequence,
          consequenceImpact: consequenceImpact.trim(),
          mitigationMeasure: mitigation.trim(),
          responsible: responsible.trim(),
        },
      }).unwrap();
      toast.success('Created', 'Risk added.');
      navigation.goBack();
    } catch {
      toast.error('Failed', 'Could not create risk.');
    }
  };

  const ScaleSelector: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({ value, onChange, label }) => (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        {LEVELS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.scaleBtn, { backgroundColor: value === l ? colors.primary : colors.greyCard, borderColor: colors.divider }]}
            onPress={() => onChange(l)}
            activeOpacity={0.7}
          >
            <Text style={{ color: value === l ? '#fff' : colors.text, fontWeight: '700' }}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, shadows.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Risk Description *</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 90 }]} value={description} onChangeText={setDescription} multiline placeholder="Describe the risk" placeholderTextColor={colors.textMuted} />

        <ScaleSelector value={likelihood} onChange={setLikelihood} label="Likelihood (1=Low, 5=High)" />
        <ScaleSelector value={consequence} onChange={setConsequence} label="Consequence (1=Low, 5=High)" />

        <View style={[styles.ratingRow, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.label, { color: colors.primary }]}>Risk Score: {likelihood * consequence} (L×C)</Text>
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>Consequence Impact</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 72 }]} value={consequenceImpact} onChangeText={setConsequenceImpact} multiline placeholder="What is the impact if this risk materialises?" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Mitigation Measures</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard, height: 72 }]} value={mitigation} onChangeText={setMitigation} multiline placeholder="How will this risk be mitigated?" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.textMuted }]}>Responsible (login)</Text>
        <TextInput style={[styles.input, { borderColor: colors.divider, color: colors.text, backgroundColor: colors.greyCard }]} value={responsible} onChangeText={setResponsible} placeholder="e.g. scad\mqadir" placeholderTextColor={colors.textMuted} autoCapitalize="none" />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: isLoading ? colors.textMuted : colors.warning }]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? <ThemedActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Risk</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  scaleBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  ratingRow: { borderRadius: 10, padding: 12, marginTop: 14, alignItems: 'center' },
  submitBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default EpmRiskCreateScreen;
