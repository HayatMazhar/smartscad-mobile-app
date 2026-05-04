import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Platform,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray, asObject } from '../../../shared/utils/apiNormalize';
import {
  useGetOshadFormQuery,
  useSubmitNearMissMutation,
} from '../services/safetyApi';

// Plan: legacy_api_parity_rollout 2.2
// Mobile incident reporter â€” equivalent to legacy
// Governance2/Oshad/NearMissReportCreateMobile. Uses v2 SP
// Mobile.spMobile_v2_Oshad_SubmitNearMiss which writes to
// [SMARTHELP_BETA].[ADSIC].[OshadIncidence].

type Lookup = { id: number; name: string };
type LocationItem = Lookup & { code: string; parentID: number | null; level: number };

const IncidentReportScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { colors, shadows } = useTheme();
  const lang = (i18n.language || 'en-us').toLowerCase().startsWith('ar') ? 'ar-ae' : 'en-us';

  const { data, isFetching, isError, refetch } = useGetOshadFormQuery(lang);
  const [submit, { isLoading: submitting }] = useSubmitNearMissMutation();

  const form = useMemo(() => {
    const env = asObject<any>(data) ?? {};
    const payload = asObject<any>(env.data) ?? env;
    return {
      locations: asArray<LocationItem>(payload.locations),
      accidentTypes: asArray<Lookup>(payload.accidentTypes),
      incidenceTypes: asArray<Lookup>(payload.incidenceTypes),
      severities: asArray<Lookup>(payload.severities),
    };
  }, [data]);

  // Regions are level=1; sub-locations (villas/floors etc.) level >= 2.
  const regions = form.locations.filter((l) => l.level === 1);
  const subLocations = form.locations.filter((l) => l.level >= 2);

  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [accidentTypeId, setAccidentTypeId] = useState<number>(2); // default Near-miss
  const [incidenceTypeId, setIncidenceTypeId] = useState<number | null>(null);
  const [severityId, setSeverityId] = useState<number>(1); // Minor
  const [description, setDescription] = useState<string>('');
  const [areaId, setAreaId] = useState<string>('');

  const canSubmit =
    selectedLocation != null &&
    incidenceTypeId != null &&
    description.trim().length > 5;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const env = await submit({
        description: description.trim(),
        locationId: selectedLocation!,
        floorId: selectedFloor,
        areaId: areaId || null,
        accidentTypeId,
        statusConditionId: severityId,
        incidenceTypeId: incidenceTypeId!,
        lang,
      }).unwrap();
      const result = (env?.data ?? env) as any;
      if (result?.isSuccess) {
        Alert.alert(
          t('safety.submitted', 'Report submitted'),
          (result.message as string) ||
            t('safety.submittedDetail', 'Report number: {{no}}', { no: result.reportNo }),
          [{ text: 'OK', onPress: () => navigation?.goBack?.() }],
        );
      } else {
        Alert.alert(t('common.error', 'Error'), (result?.message as string) || t('common.tryAgain', 'Please try again'));
      }
    } catch (e: any) {
      Alert.alert(t('common.error', 'Error'), e?.data?.message ?? e?.message ?? String(e));
    }
  };

  if (isFetching) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ThemedActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>{t('common.failedToLoad', 'Failed to load')}</Text>
        <TouchableOpacity onPress={refetch} style={[styles.retry, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff' }}>{t('common.retry', 'Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.card]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('safety.reportIncident', 'Report Incident')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {t('safety.reportIncidentSubtitle', 'Help keep SCAD safe â€” file a near-miss or hazard report.')}
        </Text>

        <Field label={t('safety.region', 'Region / Building')} required>
          <ChipPicker
            items={regions.map((r) => ({ id: r.id, label: r.name }))}
            value={selectedLocation}
            onChange={(id) => { setSelectedLocation(id); setSelectedFloor(null); }}
            colors={colors}
          />
        </Field>

        {selectedLocation != null && subLocations.length > 0 && (
          <Field label={t('safety.subLocation', 'Sub-location / Floor')}>
            <ChipPicker
              items={subLocations.map((r) => ({ id: r.id, label: r.name }))}
              value={selectedFloor}
              onChange={setSelectedFloor}
              colors={colors}
            />
          </Field>
        )}

        <Field label={t('safety.area', 'Area / Room (optional)')}>
          <TextInput
            value={areaId}
            onChangeText={setAreaId}
            placeholder={t('safety.areaHint', 'e.g. Reception, Pantry') as string}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          />
        </Field>

        <Field label={t('safety.accidentType', 'Type')} required>
          <ChipPicker
            items={form.accidentTypes.map((r) => ({ id: r.id, label: r.name }))}
            value={accidentTypeId}
            onChange={(id) => setAccidentTypeId(id ?? 2)}
            colors={colors}
          />
        </Field>

        <Field label={t('safety.incidenceType', 'Incident Category')} required>
          <ChipPicker
            items={form.incidenceTypes.map((r) => ({ id: r.id, label: r.name }))}
            value={incidenceTypeId}
            onChange={setIncidenceTypeId}
            colors={colors}
          />
        </Field>

        <Field label={t('safety.severity', 'Severity')} required>
          <ChipPicker
            items={form.severities.map((r) => ({ id: r.id, label: r.name }))}
            value={severityId}
            onChange={(id) => setSeverityId(id ?? 1)}
            colors={colors}
          />
        </Field>

        <Field label={t('safety.description', 'Description')} required>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('safety.descriptionHint', 'What happened? Be specific so HSE can investigate.') as string}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            style={[styles.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          />
        </Field>

        <TouchableOpacity
          disabled={!canSubmit || submitting}
          onPress={handleSubmit}
          style={[
            styles.submit,
            { backgroundColor: !canSubmit || submitting ? colors.textMuted : colors.primary },
          ]}
        >
          {submitting ? (
            <ThemedActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t('safety.submitReport', 'Submit Report')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {label}{required ? ' *' : ''}
      </Text>
      {children}
    </View>
  );
};

const ChipPicker: React.FC<{
  items: { id: number; label: string }[];
  value: number | null;
  onChange: (id: number | null) => void;
  colors: any;
}> = ({ items, value, onChange, colors }) => (
  <View style={styles.chipWrap}>
    {items.map((it) => {
      const active = value === it.id;
      return (
        <TouchableOpacity
          key={it.id}
          onPress={() => onChange(active ? null : it.id)}
          style={[
            styles.chip,
            { borderColor: colors.border, backgroundColor: active ? colors.primary : colors.surface },
          ]}
        >
          <Text style={{ color: active ? '#fff' : colors.text, fontSize: 12 }}>{it.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
  textarea: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 96, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  submit: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  retry: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
});

export default IncidentReportScreen;

