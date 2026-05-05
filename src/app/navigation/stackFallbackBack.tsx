import React from 'react';
import { Platform } from 'react-native';
import { HeaderBackButton } from '@react-navigation/elements';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

type StackOptsArgs = {
  navigation: { goBack: () => void; navigate: (name: string) => void };
  route: { name: string };
};

type HeaderLeftProps = {
  tintColor?: string;
  canGoBack?: boolean;
  label?: string;
};

/**
 * Merge into stack `screenOptions`. Used to render a deep-link-friendly back
 * button: if a non-root screen has no `canGoBack` (deep linked into mid-stack),
 * we still show a back affordance that navigates to the stack root.
 *
 * iOS callers should NOT spread the result of this function — UIKit's native
 * back chevron + interactive swipe gesture provide the correct iOS feel and
 * any custom `headerLeft` overrides them. We intentionally keep this opt-in
 * for the JS header path used on Android (where `ModernHeader` replaces the
 * native header entirely and reads `back` directly anyway).
 */
export function fallbackStackHeaderLeft(
  stackRootRouteName: string,
): (args: StackOptsArgs) => Partial<NativeStackNavigationOptions> {
  // iOS — return empty options so the system chevron is preserved everywhere.
  if (Platform.OS === 'ios') {
    return () => ({});
  }
  return ({ navigation, route }) => ({
    headerLeft: ({ tintColor, canGoBack }: HeaderLeftProps) => {
      if (canGoBack) {
        return (
          <HeaderBackButton
            tintColor={tintColor}
            label={undefined}
            onPress={() => navigation.goBack()}
            displayMode="minimal"
          />
        );
      }
      if (route.name === stackRootRouteName) {
        return null;
      }
      return (
        <HeaderBackButton
          tintColor={tintColor}
          label={undefined}
          displayMode="minimal"
          accessibilityLabel="Go back"
          onPress={() => navigation.navigate(stackRootRouteName)}
        />
      );
    },
  });
}
