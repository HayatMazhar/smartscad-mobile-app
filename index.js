// Required at the very top, BEFORE any React Native imports, so the
// gesture handler native module is wired in early. Needed for Swipeable
// (notifications swipe-to-mark-read), long-press gestures, and any other
// gesture-handler use throughout the app.
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './src/app/App';

// Use Expo's registerRootComponent so the JS bundle registers under the same
// component name ("main") that expo-prebuild's MainActivity.kt expects.
// Bare AppRegistry.registerComponent(appName, ...) would register under
// "SmartSCADMobile" and crash with `Invariant Violation: "main" has not been registered`.
registerRootComponent(App);
