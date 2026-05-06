import React from 'react';
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
 * Merge into stack `screenOptions`: back uses `goBack()` when there is a
 * previous screen; otherwise (e.g. deep link with a single stack route) shows
 * the same control and navigates to `stackRootRouteName`.
 *
 * Note: stacks in this app render their headers via `ModernHeader`, which
 * reads the `back` prop directly to decide whether to show the chevron, so
 * `headerLeft` is effectively ignored. We still provide it here so any
 * future screen that uses the native header gets a sensible deep-link
 * fallback.
 */
export function fallbackStackHeaderLeft(
  stackRootRouteName: string,
): (args: StackOptsArgs) => Pick<NativeStackNavigationOptions, 'headerLeft'> {
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
