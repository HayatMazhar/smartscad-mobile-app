import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ThemedActivityIndicator from '../../shared/components/ThemedActivityIndicator';
import Dropdown, { DropdownOption } from './Dropdown';
import { useTheme } from '../../app/theme/ThemeContext';
import { useMyResources, MyResource } from '../hooks/useMyResources';

export type ResourcePickerVariant =
  | 'assignee'    // "Assign To" — self + my reportees (icon 👤 for self, 👥 for others)
  | 'onBehalfOf'  // "On Behalf Of" — only owners I can act for
  | 'employee';   // Generic employee field — my reportees, no self pre-pended

type Props = {
  /** Selected LoginID (e.g. "scad\mqadir") */
  value: string;
  onChange: (userId: string, resource?: MyResource) => void;

  /** Optional label rendered above the control */
  label?: string;
  /** Optional required asterisk */
  required?: boolean;

  /** Drives which list is used + whether "Myself" appears on top */
  variant?: ResourcePickerVariant;

  /** Override for the empty-state string below the field */
  emptyHint?: string;
  /** Override placeholder shown in the trigger */
  placeholder?: string;
  /** Disable the control entirely */
  disabled?: boolean;
  /** Hide the helper/hint line under the field */
  hideHint?: boolean;

  /** Optional language for server-side labels ("en-US" | "ar-AE") */
  lang?: string;
};

/**
 * ResourcePicker — the single dropdown used across the app to choose a person
 * (aka "my resources"). Always backed by the role-aware list from
 * `useMyResources()`, which mirrors the UAT portal rules
 * (`UserInfo.ValidTaskAssignor` + `DelegateProfile.CanAssignTaskOnBehalf`).
 *
 * When the caller's role does not allow picking another person, the control
 * locks to self and shows a small note — never leaves the user typing a raw
 * `scad\username` string.
 */
const ResourcePicker: React.FC<Props> = ({
  value, onChange,
  label, required,
  variant = 'assignee',
  emptyHint, placeholder,
  disabled, hideHint,
  lang,
}) => {
  const { colors } = useTheme();
  const { permissions, reportees, onBehalfOf, selfId, selfName, isLoading } = useMyResources(lang);

  const canAssign = permissions.canAssign;

  const options = useMemo<DropdownOption<string>[]>(() => {
    if (variant === 'onBehalfOf') {
      return onBehalfOf.map((o) => ({
        value: o.userId,
        label: o.isSelf ? `${o.displayName} (Myself)` : o.displayName,
        icon: o.isSelf ? '👤' : '🤝',
      }));
    }

    const buildRow = (r: MyResource): DropdownOption<string> => ({
      value: r.userId,
      label: r.displayName,
      sublabel: [r.jobTitle, r.department].filter(Boolean).join(' • ') || undefined,
      icon: '👥',
    });

    if (variant === 'employee') {
      return reportees.map(buildRow);
    }

    // variant === 'assignee'
    const rows: DropdownOption<string>[] = [
      { value: selfId, label: `${selfName} (Myself)`, icon: '👤' },
      ...reportees.map(buildRow),
    ];
    return rows;
  }, [variant, reportees, onBehalfOf, selfId, selfName]);

  const lockedToSelf = !canAssign && variant !== 'onBehalfOf';

  // Loading skeleton
  if (isLoading) {
    return (
      <View style={styles.wrap}>
        {label ? (
          <Text style={[styles.label, { color: colors.text }]}>
            {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
          </Text>
        ) : null}
        <View style={[styles.skeleton, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <ThemedActivityIndicator color={colors.primary} />
          <Text style={[styles.skeletonText, { color: colors.textMuted }]}>Loading resources…</Text>
        </View>
      </View>
    );
  }

  // Locked-to-self notice (preserves the "CreateMyTask vs AssignTask" UAT rule)
  if (lockedToSelf) {
    return (
      <View style={styles.wrap}>
        {label ? (
          <Text style={[styles.label, { color: colors.text }]}>
            {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
          </Text>
        ) : null}
        <View style={[styles.lockedCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={styles.lockedIcon}>👤</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.lockedTitle, { color: colors.text }]}>
              {selfName || selfId}
            </Text>
            <Text style={[styles.lockedBody, { color: colors.textMuted }]}>
              {emptyHint ?? 'Only managers and delegates can pick another resource.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const helper = hideHint ? null : (() => {
    if (variant === 'onBehalfOf') {
      return onBehalfOf.length > 1
        ? `${onBehalfOf.length - 1} owner${onBehalfOf.length - 1 === 1 ? '' : 's'} available`
        : 'Acting as yourself';
    }
    if (variant === 'employee') {
      return reportees.length > 0
        ? `${reportees.length} ${reportees.length === 1 ? 'resource' : 'resources'} available`
        : (emptyHint ?? 'No resources found.');
    }
    return reportees.length > 0
      ? `${reportees.length} ${reportees.length === 1 ? 'resource' : 'resources'} available`
      : (emptyHint ?? 'Only yourself available.');
  })();

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}
      <Dropdown<string>
        value={value}
        onChange={(v, opt) => {
          const match = reportees.find((r) => r.userId === v);
          onChange(v, match);
          // "opt" preserved for call sites that need icon/label info later.
          void opt;
        }}
        options={options}
        placeholder={placeholder ?? (variant === 'onBehalfOf' ? 'Select owner…' : 'Select a resource…')}
        searchable
        disabled={disabled}
      />
      {helper ? <Text style={[styles.hint, { color: colors.textMuted }]}>{helper}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap:        {},
  label:       { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  hint:        { fontSize: 11, marginTop: 6 },

  skeleton:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 14,
                 flexDirection: 'row', alignItems: 'center', gap: 10 },
  skeletonText: { fontSize: 13 },

  lockedCard:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                 flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockedIcon:  { fontSize: 24 },
  lockedTitle: { fontSize: 14, fontWeight: '700' },
  lockedBody:  { fontSize: 11, marginTop: 2 },
});

export default ResourcePicker;
