import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import ThemedActivityIndicator from '../../../shared/components/ThemedActivityIndicator';
import { useToast } from '../../../shared/components/Toast';
import { useTranslation } from 'react-i18next';
import { useGetServiceDetailsQuery, useCreateTicketMutation } from '../services/ticketApi';
import { useTheme } from '../../../app/theme/ThemeContext';
import { asArray } from '../../../shared/utils/apiNormalize';
import ResourcePicker from '../../../shared/components/ResourcePicker';

function stripHtml(html: string): string {
  return (html ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

const ATTR_TYPE = {
  TextBox: 1, TextArea: 2, Date: 3, RadioButtons: 4, CheckBoxs: 5,
  ADUsers: 6, ComboBox: 7, HeaderLabel: 8, Spliter: 9, Label: 10,
  Time: 11, DateTime: 12, Numeric: 13, HiddenField: 30,
};

const DISPLAY_ONLY_TYPES = [8, 9, 10]; // HeaderLabel, Spliter, Label — not form inputs

const SubmitTicketScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const onStackLight = colors.stackStatusBar === 'dark-content';
  const headerSubColor = onStackLight ? colors.textSecondary : 'rgba(255,255,255,0.5)';
  const serviceId = route?.params?.serviceId;
  const serviceName = route?.params?.serviceName ?? 'Service';

  const toast = useToast();
  const { data, isLoading } = useGetServiceDetailsQuery(serviceId, { skip: !serviceId });
  const [createTicket, { isLoading: submitting }] = useCreateTicketMutation();

  const [description, setDescription] = useState('');
  const [attrValues, setAttrValues] = useState<Record<number, string>>({});

  const detail = useMemo(() => {
    if (!data) return null;
    const d = data as any;
    return {
      service: d.service ?? d,
      attributes: asArray<any>(d.attributes ?? []),
    };
  }, [data]);

  const service = detail?.service;
  const attributes = detail?.attributes ?? [];

  const visibleAttrs = useMemo(() =>
    attributes.filter((a: any) =>
      a.type !== ATTR_TYPE.HiddenField && !DISPLAY_ONLY_TYPES.includes(a.type)),
  [attributes]);

  const displayLabels = useMemo(() =>
    attributes.filter((a: any) => DISPLAY_ONLY_TYPES.includes(a.type)),
  [attributes]);

  const setAttrValue = (id: number, value: string) => {
    setAttrValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    const missing = visibleAttrs.filter((a: any) => a.isRequired && !attrValues[a.id]?.trim());
    if (service?.descriptionRequired && !description.trim()) {
      toast.warning('Required', 'Please enter a description.');
      return;
    }
    if (missing.length > 0) {
      toast.warning('Required Fields', `Please fill: ${missing.map((a: any) => a.name).join(', ')}`);
      return;
    }

    const attributeJson = Object.keys(attrValues).length > 0
      ? JSON.stringify(Object.entries(attrValues).map(([k, v]) => ({ key: Number(k), value: v })))
      : null;

    try {
      const result = await createTicket({
        serviceId,
        description,
        entityId: 1,
        attributes: attributeJson,
      }).unwrap();

      const ticketId = result?.ticketId ?? result?.[0]?.ticketId;
      toast.success('Request Submitted', ticketId ? `Ticket #${ticketId} created successfully.` : 'Your request has been submitted.');
      setTimeout(() => navigation.navigate('TicketList'), 1500);
    } catch {
      toast.error('Submission Failed', 'Could not submit your request. Please try again.');
    }
  };

  if (isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ThemedActivityIndicator size="large" color={colors.primary} /></View>;

  if (!serviceId) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
      <Text style={{ color: colors.textMuted, fontSize: 16, marginBottom: 20 }}>No service selected</Text>
      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, marginHorizontal: 40 }]}
        onPress={() => navigation.navigate('ServiceCatalog')} activeOpacity={0.7}>
        <Text style={styles.submitText}>Browse Services</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[{ flex: 1, backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.stackHeaderBackground }]}>
          <Text style={styles.headerEmoji}>📋</Text>
          <Text style={[styles.headerTitle, { color: colors.stackHeaderText }]}>{serviceName}</Text>
          {service?.categoryName ? <Text style={[styles.headerSub, { color: headerSubColor }]}>{service.groupName} › {service.categoryName}</Text> : null}
        </View>

        {/* Service info */}
        {service?.formNotes ? (
          <View style={[styles.noteCard, { backgroundColor: `${colors.warning}14`, borderColor: colors.warning }]}>
            <Text style={[styles.noteText, { color: colors.text }]}>{stripHtml(service.formNotes)}</Text>
          </View>
        ) : null}

        {/* Description field */}
        {service?.showDescription !== false && (
          <View style={[styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Description {service?.descriptionRequired ? <Text style={{ color: colors.danger }}>*</Text> : null}
            </Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Describe your request..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        {/* Section headers (display-only labels) */}
        {displayLabels.length > 0 && displayLabels.map((lbl: any) => (
          <View key={lbl.id} style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <Text style={[styles.sectionHeader, { color: colors.primary }]}>{lbl.name}</Text>
          </View>
        ))}

        {/* Dynamic attributes */}
        {visibleAttrs.map((attr: any) => (
          <View key={attr.id} style={[styles.fieldCard, shadows.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {attr.name} {attr.isRequired ? <Text style={{ color: colors.danger }}>*</Text> : null}
            </Text>
            {attr.nameAr && attr.nameAr !== attr.name ? (
              <Text style={[styles.fieldLabelAr, { color: colors.textMuted }]}>{attr.nameAr}</Text>
            ) : null}
            {renderAttributeField(attr, attrValues[attr.id] ?? '', (v: string) => setAttrValue(attr.id, v), colors)}
          </View>
        ))}

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
          onPress={handleSubmit} activeOpacity={0.7} disabled={submitting}
        >
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : '📨  Submit Request'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function renderAttributeField(attr: any, value: string, onChange: (v: string) => void, colors: any) {
  const type = attr.type;
  const options = parseOptions(attr.values);

  // TextBox or Numeric
  if (type === ATTR_TYPE.TextBox || type === ATTR_TYPE.Numeric) {
    return (
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value} onChangeText={onChange}
        keyboardType={type === ATTR_TYPE.Numeric ? 'numeric' : 'default'}
        placeholder={`Enter ${attr.name}`} placeholderTextColor={colors.textMuted}
      />
    );
  }

  // TextArea
  if (type === ATTR_TYPE.TextArea) {
    return (
      <TextInput
        style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value} onChangeText={onChange}
        multiline numberOfLines={3} textAlignVertical="top"
        placeholder={`Enter ${attr.name}`} placeholderTextColor={colors.textMuted}
      />
    );
  }

  // Date
  if (type === ATTR_TYPE.Date) {
    return (
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value} onChangeText={onChange}
        placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted}
      />
    );
  }

  // Time
  if (type === ATTR_TYPE.Time) {
    return (
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value} onChangeText={onChange}
        placeholder="HH:MM (e.g. 09:30)" placeholderTextColor={colors.textMuted}
      />
    );
  }

  // DateTime
  if (type === ATTR_TYPE.DateTime) {
    return (
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value} onChangeText={onChange}
        placeholder="YYYY-MM-DD HH:MM" placeholderTextColor={colors.textMuted}
      />
    );
  }

  // RadioButtons or ComboBox with options
  if ((type === ATTR_TYPE.RadioButtons || type === ATTR_TYPE.ComboBox) && options.length > 0) {
    return (
      <View style={styles.optionsWrap}>
        {options.map((opt, i) => {
          const selected = value === opt;
          return (
            <TouchableOpacity key={i} onPress={() => onChange(opt)}
              style={[styles.optionBtn, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}14` : 'transparent' }]}
              activeOpacity={0.7}>
              <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Checkboxes with options
  if (type === ATTR_TYPE.CheckBoxs && options.length > 0) {
    const selectedVals = value ? value.split(',') : [];
    return (
      <View style={styles.optionsWrap}>
        {options.map((opt, i) => {
          const checked = selectedVals.includes(opt);
          const toggle = () => {
            const next = checked ? selectedVals.filter((v) => v !== opt) : [...selectedVals, opt];
            onChange(next.join(','));
          };
          return (
            <TouchableOpacity key={i} onPress={toggle}
              style={[styles.optionBtn, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? `${colors.primary}14` : 'transparent' }]}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>{checked ? '☑️' : '⬜'}</Text>
              <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ADUsers — global resource picker (replaces raw "scad\username" text input)
  if (type === ATTR_TYPE.ADUsers) {
    return (
      <ResourcePicker
        variant="employee"
        value={value}
        onChange={(v) => onChange(v)}
        placeholder="Select employee…"
        emptyHint="No resources available from your team."
        hideHint
      />
    );
  }

  // Specialized types (208=AppAssets, 209=AppClassifications, 202=MyProject, 28=CashFlowProject,
  // 218=Survey, 219=OpinionPoll, 21=ConfigItems, 22=MyJobs, etc.) — text fallback with type hint
  const typeHints: Record<number, string> = {
    28: 'Enter project name', 202: 'Enter project name', 208: 'Enter application name',
    209: 'Enter classification', 218: 'Select survey', 219: 'Select opinion poll',
    21: 'Enter asset/CI name', 22: 'Enter job reference', 229: 'Enter asset name(s)',
    240: 'Enter software name', 260: 'Enter previous ticket reference',
  };

  return (
    <TextInput
      style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      value={value} onChangeText={onChange}
      placeholder={typeHints[type] ?? `Enter ${attr.name}`} placeholderTextColor={colors.textMuted}
    />
  );
}

function parseOptions(valuesStr?: string): string[] {
  if (!valuesStr) return [];
  return valuesStr.split('\n').map((v: string) => v.replace('\r', '').trim()).filter(Boolean);
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 28, alignItems: 'center' },
  headerEmoji: { fontSize: 36, marginBottom: 8, opacity: 0.6 },
  headerTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6, lineHeight: 24 },
  headerSub: { fontSize: 12, fontWeight: '600' },
  noteCard: { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 10, padding: 12 },
  noteText: { fontSize: 13, lineHeight: 19 },
  sectionHeader: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  fieldCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 14 },
  fieldLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  fieldLabelAr: { fontSize: 12, marginBottom: 8, marginTop: -4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textArea: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 80 },
  optionsWrap: { gap: 6 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { fontSize: 14, flex: 1 },
  submitBtn: { marginHorizontal: 16, marginTop: 24, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default SubmitTicketScreen;
