#!/usr/bin/env ruby
# Pods.xcodeproj patcher — runs AFTER `pod install`, BEFORE `xcodebuild archive`.
#
# Sets ONLY:
#   - IPHONEOS_DEPLOYMENT_TARGET = 15.1   (required by ExpoModulesCore 55.x)
#   - GCC_TREAT_WARNINGS_AS_ERRORS = NO   (so deprecation warnings don't fail the build)
#   - SWIFT_TREAT_WARNINGS_AS_ERRORS = NO
#   - CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = NO
#
# IMPORTANT: We do NOT touch SWIFT_VERSION. Each pod's podspec declares its own
# required Swift version (e.g. ExpoModulesCore = 6.0 for @MainActor isolated
# conformances). Overriding SWIFT_VERSION globally breaks ExpoModulesCore which
# uses Swift 6 syntax like `extension UIView: @MainActor AnyArgument`.

require 'xcodeproj'

PODS_PROJECT_PATH = File.join(__dir__, '..', 'ios', 'Pods', 'Pods.xcodeproj')
MIN_TARGET = '15.1'
MIN_TARGET_F = MIN_TARGET.to_f

unless File.exist?(PODS_PROJECT_PATH)
  abort "[patch] ERROR: Pods.xcodeproj not found at #{PODS_PROJECT_PATH}"
end

project = Xcodeproj::Project.open(PODS_PROJECT_PATH)
puts "[patch] Loaded Pods.xcodeproj (#{project.targets.length} targets)"

deploy_changed = 0
warn_changed = 0

project.targets.each do |target|
  target.build_configurations.each do |config|
    bs = config.build_settings

    current_dt = bs['IPHONEOS_DEPLOYMENT_TARGET']
    if current_dt.nil? || current_dt.to_f < MIN_TARGET_F
      bs['IPHONEOS_DEPLOYMENT_TARGET'] = MIN_TARGET
      deploy_changed += 1
    end

    bs['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    bs['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    bs['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
    warn_changed += 1
  end
end

project.build_configurations.each do |config|
  bs = config.build_settings
  current_dt = bs['IPHONEOS_DEPLOYMENT_TARGET']
  if current_dt.nil? || current_dt.to_f < MIN_TARGET_F
    bs['IPHONEOS_DEPLOYMENT_TARGET'] = MIN_TARGET
    deploy_changed += 1
  end
end

project.save

puts "[patch] Done."
puts "[patch]   IPHONEOS_DEPLOYMENT_TARGET set on #{deploy_changed} configs"
puts "[patch]   Warnings-as-errors disabled on #{warn_changed} configs"
puts "[patch]   SWIFT_VERSION left UNTOUCHED — using each podspec's declared version"

puts ""
puts "[patch] Verification — SWIFT_VERSION on key pod targets after patch:"
key_targets = ['ExpoModulesCore', 'Expo', 'React-Core', 'RCTSwiftUI', 'ExpoLogBox']
project.targets.each do |target|
  next unless key_targets.include?(target.name)
  cfg = target.build_configurations.find { |c| c.name == 'Release' } || target.build_configurations.first
  next unless cfg
  bs = cfg.build_settings
  puts "  #{target.name}: deployment=#{bs['IPHONEOS_DEPLOYMENT_TARGET'].inspect} swift=#{bs['SWIFT_VERSION'].inspect}"
end
