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
 */
export function fallbackStackHeaderLeft(
  stackRootRouteName: string,
): (args: StackOptsArgs) => Pick<NativeStackNavigationOptions, 'headerLeft'> {
  return ({ navigation, route }) => ({
    headerLeft: ({ tintColor, canGoBack, label }: HeaderLeftProps) => {
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
