import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppSelector } from '../../../store/store';
import { useHomeScreenModel } from './home/useHomeScreenModel';
import HomeScadClassicLayout from './home/HomeScadClassicLayout';
import HomeGovSoftLayout from './home/HomeGovSoftLayout';
import HomeExecutiveCockpit from './home/HomeExecutiveCockpit';
import PersonaDebugBadge from '../../auth/components/PersonaDebugBadge';

/**
 * Home hub: one data model, multiple layouts.
 *  - isExecutive=true → Executive Cockpit layout
 *  - scadVibrant       → original SCAD classic layout
 *  - govSoft / govAbuDhabi → soft government layout (same JSX, palette swaps colour)
 *
 * In __DEV__ builds we overlay a PersonaDebugBadge so QA can see what
 * persona the API derived (and self-heal it with one tap if a stale
 * token is missing the field). The overlay is invisible in release.
 */
const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const m = useHomeScreenModel(navigation);
  const colorPaletteId = useAppSelector((s) => s.uiPreferences.colorPaletteId);
  const isExecutive = useAppSelector((s) => s.auth.user?.isExecutive ?? false);

  let body: React.ReactNode;
  if (isExecutive) {
    body = <HomeExecutiveCockpit m={m} />;
  } else {
    switch (colorPaletteId) {
      case 'govSoft':
      case 'govAbuDhabi':
        body = <HomeGovSoftLayout m={m} />;
        break;
      case 'scadVibrant':
      default:
        body = <HomeScadClassicLayout m={m} />;
        break;
    }
  }

  if (!__DEV__) {
    return <View testID="screen.home" style={styles.fill}>{body}</View>;
  }

  return (
    <View style={styles.root} testID="screen.home">
      {body}
      <View pointerEvents="box-none" style={styles.debugOverlay}>
        <PersonaDebugBadge compact />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: {
    flex: 1,
  },
  debugOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 9999,
  },
});

export default HomeScreen;
