/**
 * Expo config plugin: force IPHONEOS_DEPLOYMENT_TARGET = 15.1 on ALL pod targets.
 *
 * Why: expo-build-properties sets the deployment target on the main app target,
 * but Pods targets (ExpoModulesCore, etc.) may retain a lower minimum which causes
 * Swift compiler errors like "unknown attribute 'MainActor'" on Xcode 16.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MIN_IOS = '15.1';

const POST_INSTALL = `
  # injected by plugins/with-pods-deployment-target.js
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${MIN_IOS}.to_f
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS}'
      end
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
      if (podfile.includes('with-pods-deployment-target')) return cfg;
      // Inject into existing post_install block, or append one
      if (/post_install do \|installer\|/.test(podfile)) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${POST_INSTALL}`
        );
      } else {
        podfile += `\npost_install do |installer|${POST_INSTALL}\nend\n`;
      }
      fs.writeFileSync(podfilePath, podfile);
      return cfg;
    },
  ]);
};
