/**
 * Expo config plugin: force IPHONEOS_DEPLOYMENT_TARGET = 15.1 on ALL pod targets.
 *
 * expo-build-properties sets the main app target but Pod targets (ExpoModulesCore etc.)
 * may retain a lower minimum, causing Swift @MainActor errors on Xcode 16.
 *
 * Strategy: always inject into the EXISTING post_install block that expo-build-properties
 * creates. Never append a second post_install (CocoaPods forbids it).
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# CI_DEPLOYMENT_TARGET_PATCH';
const MIN_IOS = '15.1';

const INJECT = `
  ${MARKER}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      v = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS}' if v.nil? || v.to_f < ${MIN_IOS}
    end
  end
`;

module.exports = function withPodsDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return cfg;
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Already patched - skip
      if (podfile.includes(MARKER)) return cfg;

      // Inject right after the opening of the existing post_install block
      if (/post_install do \|installer\|/.test(podfile)) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${INJECT}`
        );
        fs.writeFileSync(podfilePath, podfile);
        console.log('[with-pods-deployment-target] Patched existing post_install block.');
      } else {
        // No post_install at all - safe to append one
        podfile += `\npost_install do |installer|${INJECT}\nend\n`;
        fs.writeFileSync(podfilePath, podfile);
        console.log('[with-pods-deployment-target] Appended new post_install block.');
      }

      return cfg;
    },
  ]);
};
