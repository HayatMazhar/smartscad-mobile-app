/**
 * Tiny iOS-first haptic feedback wrapper around `expo-haptics`.
 *
 * Why iOS-first: the user wants Android UX to remain as-is for now;
 * Taptic Engine on iPhones is the primary "premium feel" gain. Android
 * vibration is intentionally a no-op so we don't accidentally trigger
 * coarse buzz on Android devices that don't support fine haptics.
 *
 * Every call is best-effort (`.catch(() => {})`) so a missing native
 * module on web / older devices never throws.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const enabled = Platform.OS === 'ios';

/** Light tap — selection changed (tab switch, list-row tap, segmented control). */
export function selectionTap(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

/** Light impact — minor button presses, navigation chevrons, toggles. */
export function lightImpact(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Medium impact — primary action button (Login, Submit, Apply). */
export function mediumImpact(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Heavy impact — destructive confirm (Delete, Reject). */
export function heavyImpact(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

/** Success notification — task completed (Approve done, Login success, Submit OK). */
export function notifySuccess(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Warning notification — non-fatal issue (validation warning). */
export function notifyWarning(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Error notification — failure (Login failed, API error, Reject confirmed). */
export function notifyError(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

const haptics = {
  selectionTap,
  lightImpact,
  mediumImpact,
  heavyImpact,
  notifySuccess,
  notifyWarning,
  notifyError,
};

export default haptics;
