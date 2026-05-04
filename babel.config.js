module.exports = function (api) {
  api.cache(true);
  return {
    // Drop-in replacement for @react-native/babel-preset; required for Expo async-require,
    // Hermes transform profile, EXPO_OS inlining, and Reanimated/Worklets plugins.
    presets: ['babel-preset-expo'],
  };
};
