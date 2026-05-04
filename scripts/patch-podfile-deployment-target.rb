#!/usr/bin/env ruby
# Patches ios/Podfile to inject IPHONEOS_DEPLOYMENT_TARGET = 15.1
# into the existing post_install block.
# Run AFTER expo prebuild, BEFORE pod install.

MARKER = '# CI_DEPLOYMENT_TARGET_PATCH'
MIN_TARGET = '15.1'
PODFILE_PATH = File.join(__dir__, '..', 'ios', 'Podfile')

content = File.read(PODFILE_PATH)

if content.include?(MARKER)
  puts "[patch-podfile] Already patched, skipping."
  exit 0
end

inject = <<~RUBY

  #{MARKER}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      v = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '#{MIN_TARGET}' if v.nil? || v.to_f < #{MIN_TARGET}.to_f
    end
  end
RUBY

if content =~ /post_install do \|installer\|/
  patched = content.sub(/post_install do \|installer\|/, "post_install do |installer|#{inject}")
  File.write(PODFILE_PATH, patched)
  puts "[patch-podfile] Injected deployment target fix into existing post_install block."
else
  # No post_install at all — append one
  File.open(PODFILE_PATH, 'a') do |f|
    f.write("\npost_install do |installer|#{inject}\nend\n")
  end
  puts "[patch-podfile] Appended new post_install block with deployment target fix."
end

puts "[patch-podfile] Done. Verifying..."
puts File.read(PODFILE_PATH).lines.last(20).join
