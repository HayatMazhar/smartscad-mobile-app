import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';

export type ActionFieldRow = {
  serviceAttributeId: number;
  name?: string;
  nameAr?: string;
  fieldType: number;
  isRequired?: boolean;
  fieldValues?: string;
  fieldValuesAr?: string;
  flags?: string;
  currentValue?: string;
  isHidden?: boolean;
  /** RS7 (script 107): EditableOnWorkflowOrder matches current step */
  isEditable?: boolean;
};

function splitOptions(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface Props {
  field: ActionFieldRow;
  value: string;
  onChange: (v: string) => void;
  colors: any;
  lang?: string;
}

const TicketActionField: React.FC<Props> = ({ field, value, onChange, colors, lang }) => {
  const label = lang?.startsWith('ar') && field.nameAr ? field.nameAr : field.name ?? 'Field';
  const optSource = lang?.startsWith('ar') && field.fieldValuesAr ? field.fieldValuesAr : field.fieldValues;
  const options = useMemo(() => splitOptions(optSource), [optSource]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const req = field.isRequired ? (
    <Text style={{ color: colors.danger, marginLeft: 4 }}>*</Text>
  ) : null;

  switch (field.fieldType) {
    case 1:
      return (
        <View style={styles.wrap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {label}
            {req}
          </Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={label}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.divider, color: colors.text }]}
          />
        </View>
      );
    case 2:
      return (
        <View style={styles.wrap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {label}
            {req}
          </Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={label}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textArea, { borderColor: colors.divider, color: colors.text }]}
          />
        </View>
      );
    case 3:
      return (
        <View style={styles.wrap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {label}
            {req}
          </Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.divider, color: colors.text }]}
          />
        </View>
      );
    case 4:
      return (
        <View style={styles.wrap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {label}
            {req}
          </Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.radioRow, { borderColor: colors.divider }]}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, { borderColor: colors.primary }]}>
                {value === opt ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
              </View>
              <Text style={{ color: colors.text, flex: 1 }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    case 5: {
      const selected = new Set(
        value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
      const toggle = (opt: string) => {
        const next = new Set(selected);
        if (next.has(opt)) next.delete(opt);
        else next.add(opt);
        onChange([...next].join(','));
      };
      return (
        <View style={styles.wrap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {label}
            {req}
          </Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              onPress={() => toggle(opt)}
              style={[styles.radioRow, { borderColor: colors.divider }]}
              activeOpacity={0.7}
            >
              <View style={[styles.chk, { borderColor: colors.primary }]}>
                {selected.has(opt) ? <View style={[styles.chkOn, { backgroundColor: colors.primary }]} /> : null}
              </View>
              <Text style={{ color: colors.text, flex: 1 }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    case 7:
    case 16:
      return (
        <View style={styles.wrap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {label}
            {req}
          </Text>
          <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            style={[styles.input, { borderColor: colors.divider, justifyContent: 'center' }]}
            activeOpacity={0.75}
          >
            <Text style={{ color: value ? colors.text : colors.textMuted }}>{value || `Select ${label}`}</Text>
          </TouchableOpacity>
          <Modal visible={pickerOpen} transparent animationType="fade">
            <View style={styles.modalRoot}>
              <TouchableOpacity style={styles.modalBackdropFill} activeOpacity={1} onPress={() => setPickerOpen(false)} />
              <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
                <FlatList
                  data={options}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalRow}
                      onPress={() => {
                        onChange(item);
                        setPickerOpen(false);
                      }}
                    >
                      <Text style={{ color: colors.text }}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </View>
      );
    case 13:
      return (
        <View style={styles.wrap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            {label}
            {req}
          </Text>
          <TextInput
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            placeholder={label}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { borderColor: colors.divider, color: colors.text }]}
          />
        </View>
      );
    default:
      return (
        <View style={styles.wrap}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
          <Text style={[styles.ro, { color: colors.textSecondary }]}>{field.currentValue || value || '—'}</Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: { minHeight: 96, paddingTop: 10 },
  ro: { fontSize: 14, lineHeight: 20 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  chk: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chkOn: { width: 12, height: 12, borderRadius: 2 },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    maxHeight: '55%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', padding: 16 },
  modalRow: { paddingVertical: 14, paddingHorizontal: 16 },
});

export default TicketActionField;
