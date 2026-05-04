#!/usr/bin/env ruby
# Patches ios/Pods/Pods.xcodeproj to set IPHONEOS_DEPLOYMENT_TARGET = 15.1
# on EVERY target's build configurations.
#
# Run this AFTER `pod install`. It modifies the generated Xcode project directly
# so it doesn't matter what the Podfile post_install hooks did.
#
# Why: Newer expo-modules-core (55.x) uses @MainActor / Swift concurrency that
# requires iOS 15.1 minimum. Xcode 16 + Swift 6 enforces this strictly.

require 'xcodeproj'

PODS_PROJECT_PATH = File.join(__dir__, '..', 'ios', 'Pods', 'Pods.xcodeproj')
MIN_TARGET = '15.1'
MIN_TARGET_F = MIN_TARGET.to_f

unless File.exist?(PODS_PROJECT_PATH)
  abort "[patch-pods-xcodeproj] ERROR: Pods.xcodeproj not found at #{PODS_PROJECT_PATH}. Did you run 'pod install'?"
end

project = Xcodeproj::Project.open(PODS_PROJECT_PATH)
patched_count = 0

project.targets.each do |target|
  target.build_configurations.each do |config|
    current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
    if current.nil? || current.to_f < MIN_TARGET_F
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = MIN_TARGET
      patched_count += 1
      puts "  patched #{target.name} (#{config.name}): was=#{current.inspect} -> #{MIN_TARGET}"
    end
  end
end

# Also patch the project-level build configurations
project.build_configurations.each do |config|
  current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
  if current.nil? || current.to_f < MIN_TARGET_F
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = MIN_TARGET
    patched_count += 1
    puts "  patched project (#{config.name}): was=#{current.inspect} -> #{MIN_TARGET}"
  end
end

project.save

puts "[patch-pods-xcodeproj] Done. Patched #{patched_count} build configurations."
