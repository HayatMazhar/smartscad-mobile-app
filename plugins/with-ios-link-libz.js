/**
 * Expo config plugin: ensure libz (zlib) is linked into all iOS targets.
 *
 * Why we need this:
 *   react-native-mmkv 3.x calls zlib's crc32() from MMKV::checkFileCRCValid,
 *   but its podspec does not declare libz, and Xcode 16 stopped implicitly
 *   linking it. Without this fix EAS builds fail at the linker phase with:
 *     Undefined symbols for architecture arm64
 *       Symbol: _crc32
 *       Referenced from: MMKV::checkFileCRCValid(...)
 *
 * What this plugin does:
 *   Adds a post_install hook to the generated Podfile that appends `-lz` to
 *   OTHER_LDFLAGS for every target's build configurations, so the linker
 *   resolves crc32 against the system zlib.
 */

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const POST_INSTALL_HOOK = `

  # injected by plugins/with-ios-link-libz.js
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      existing = config.build_settings['OTHER_LDFLAGS'] || '$(inherited)'
      if existing.is_a?(Array)
        existing << '-lz' unless existing.include?('-lz')
        config.build_settings['OTHER_LDFLAGS'] = existing
      else
        unless existing.include?('-lz')
          config.build_settings['OTHER_LDFLAGS'] = existing + ' -lz'
        end
      end
    end
  end
`;

function injectIntoPodfile(podfileContents) {
  if (podfileContents.includes('plugins/with-ios-link-libz.js')) {
    return podfileContents;
  }
  // Find the post_install block
  const postInstallRegex = /post_install do \|installer\|/;
  if (postInstallRegex.test(podfileContents)) {
    return podfileContents.replace(
      postInstallRegex,
      (match) => `${match}${POST_INSTALL_HOOK}`
    );
  }
  // No post_install block; append one at the end
  return (
    podfileContents.trimEnd() +
    `\n\npost_install do |installer|${POST_INSTALL_HOOK}\nend\n`
  );
}

module.exports = function withIosLinkLibz(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile'
      );
      if (!fs.existsSync(podfilePath)) return cfg;
      const original = fs.readFileSync(podfilePath, 'utf8');
      const patched = injectIntoPodfile(original);
      if (patched !== original) {
        fs.writeFileSync(podfilePath, patched);
      }
      return cfg;
    },
  ]);
};
