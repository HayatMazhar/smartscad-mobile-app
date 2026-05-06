import React, { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';
import haptics from '../utils/haptics';

/**
 * Cross-platform action sheet / "context menu" used for long-press menus on
 * cards (news, employees, tickets) and for any 3-way action picker.
 *
 * Imperative API:
 *
 * ```ts
 * showContextMenu({
 *   title: 'News article',
 *   message: 'Choose an action',
 *   items: [
 *     { label: 'Open',       onPress: () => openItem(...) },
 *     { label: 'Share',      onPress: () => share(...) },
 *     { label: 'Copy link',  onPress: () => copyLink(...) },
 *     { label: 'Delete',     destructive: true, onPress: () => delete(...) },
 *   ],
 * });
 * ```
 *
 * On iOS: renders the native UIAlertController action sheet via
 * `ActionSheetIOS.showActionSheetWithOptions` — system look & feel.
 *
 * On Android: renders a custom bottom sheet via a host component. To enable
 * Android support you must mount `<ContextMenuHost />` once at the app root
 * (already wired in `App.tsx`).
 *
 * Always adds a "Cancel" row at the bottom (configurable label).
 */

export interface ContextMenuItem {
  label: string;
  /** Optional emoji / glyph rendered to the left of the label on Android. */
  icon?: string;
  /** Renders the label in red and marks as destructive on iOS. */
  destructive?: boolean;
  /** Called when this row is selected. Light haptic fires before this. */
  onPress: () => void;
}

export interface ContextMenuOptions {
  title?: string;
  message?: string;
  items: ContextMenuItem[];
  cancelLabel?: string;
}

// ---------------------------------------------------------------------------
// Module-level pub/sub so the API can stay imperative while the Android host
// stays declarative. iOS bypasses this entirely.
// ---------------------------------------------------------------------------
type Listener = (opts: ContextMenuOptions) => void;
const listeners: Set<Listener> = new Set();

function emit(opts: ContextMenuOptions) {
  for (const l of listeners) l(opts);
}

export function showContextMenu(opts: ContextMenuOptions): void {
  if (!opts.items || opts.items.length === 0) return;
  // Light selection haptic when the menu opens — matches the iOS feel.
  haptics.selectionTap();

  if (Platform.OS === 'ios') {
    const cancelLabel = opts.cancelLabel ?? 'Cancel';
    const buttons = [...opts.items.map((i) => i.label), cancelLabel];
    const cancelButtonIndex = buttons.length - 1;
    const destructiveButtonIndex = opts.items.findIndex((i) => i.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: opts.title,
        message: opts.message,
        options: buttons,
        cancelButtonIndex,
        ...(destructiveButtonIndex >= 0
          ? { destructiveButtonIndex }
          : {}),
        userInterfaceStyle: undefined,
      },
      (selected) => {
        if (selected === cancelButtonIndex) return;
        const item = opts.items[selected];
        if (!item) return;
        // Slight delay so the dismiss animation completes before any
        // navigation kicks off — feels native.
        setTimeout(() => item.onPress(), 60);
      },
    );
    return;
  }

  // Android (+ web for safety): broadcast to the mounted host.
  if (listeners.size === 0) {
    // Fallback if nobody mounted the host — execute the first non-destructive
    // option directly so the user doesn't end up with a no-op.
    if (__DEV__) {
      console.warn(
        '[ContextMenu] No <ContextMenuHost /> mounted; long-press menus will be no-ops on Android.',
      );
    }
    return;
  }
  emit(opts);
}

// ---------------------------------------------------------------------------
// Host component — mount once at the app root. iOS users can mount it too;
// it just stays inert.
// ---------------------------------------------------------------------------
export const ContextMenuHost: React.FC = () => {
  const { colors, shadows } = useTheme();
  const [opts, setOpts] = useState<ContextMenuOptions | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => setOpts(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (Platform.OS === 'ios') return null;

  const close = () => setOpts(null);
  const handlePick = (item: ContextMenuItem) => {
    close();
    setTimeout(() => item.onPress(), 60);
  };

  return (
    <Modal
      transparent
      visible={!!opts}
      animationType="fade"
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable
          style={[styles.sheet, shadows?.card, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          {(opts?.title || opts?.message) ? (
            <View style={styles.head}>
              {opts?.title ? (
                <Text style={[styles.title, { color: colors.text }]}>{opts.title}</Text>
              ) : null}
              {opts?.message ? (
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {opts.message}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.list}>
            {opts?.items.map((item, idx) => {
              const isLast = idx === (opts?.items.length ?? 0) - 1;
              return (
                <TouchableOpacity
                  key={`${item.label}-${idx}`}
                  onPress={() => handlePick(item)}
                  activeOpacity={0.7}
                  style={[
                    styles.row,
                    !isLast && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  {item.icon ? (
                    <Text style={styles.rowIcon}>{item.icon}</Text>
                  ) : null}
                  <Text
                    style={[
                      styles.rowLabel,
                      {
                        color: item.destructive ? colors.danger : colors.text,
                        fontWeight: item.destructive ? '700' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={close}
            activeOpacity={0.7}
            style={[styles.cancel, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.cancelText, { color: colors.primary }]}>
              {opts?.cancelLabel ?? 'Cancel'}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  head: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  title: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  list: { paddingHorizontal: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowIcon: { fontSize: 18, width: 22, textAlign: 'center' },
  rowLabel: { fontSize: 15, flex: 1 },
  cancel: {
    marginHorizontal: 12,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700' },
});

export default ContextMenuHost;
