// Metro configuration for an Expo SDK 55 project on RN 0.83.
//
// We MUST use `expo/metro-config` here (not `@react-native/metro-config`)
// because `app/build.gradle` invokes Expo CLI's `export:embed` to produce the
// release JS bundle. That CLI relies on the custom serializer that
// `expo/metro-config` installs; if the bare RN serializer is used, the build
// fails with: "Serializer did not return expected format. The project copy of
// `expo/metro-config` may be out of date."
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Avoid package-exports resolution edge cases that can interact badly with Hermes + Metro (see community reports on SDK 53+).
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = config;
