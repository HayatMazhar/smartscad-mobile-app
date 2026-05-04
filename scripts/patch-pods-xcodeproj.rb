#!/usr/bin/env ruby
# Comprehensive Pods.xcodeproj patcher.
# Run AFTER `pod install`, BEFORE `xcodebuild archive`.
#
# Sets on EVERY pod target's EVERY build configuration:
#   - IPHONEOS_DEPLOYMENT_TARGET = 15.1   (required by expo-modules-core 55.x @MainActor)
#   - SWIFT_VERSION = 5.0                  (required for @MainActor recognition)
#   - GCC_TREAT_WARNINGS_AS_ERRORS = NO   (so deprecation warnings don't fail the build)
#   - SWIFT_TREAT_WARNINGS_AS_ERRORS = NO

require 'xcodeproj'

PODS_PROJECT_PATH = File.join(__dir__, '..', 'ios', 'Pods', 'Pods.xcodeproj')
MIN_TARGET = '15.1'
MIN_TARGET_F = MIN_TARGET.to_f
SWIFT_VER = '5.0'

unless File.exist?(PODS_PROJECT_PATH)
  abort "[patch] ERROR: Pods.xcodeproj not found at #{PODS_PROJECT_PATH}"
end

project = Xcodeproj::Project.open(PODS_PROJECT_PATH)
puts "[patch] Loaded Pods.xcodeproj (#{project.targets.length} targets)"

deploy_changed = 0
swift_changed = 0
warn_changed = 0

project.targets.each do |target|
  target.build_configurations.each do |config|
    bs = config.build_settings

    current_dt = bs['IPHONEOS_DEPLOYMENT_TARGET']
    if current_dt.nil? || current_dt.to_f < MIN_TARGET_F
      bs['IPHONEOS_DEPLOYMENT_TARGET'] = MIN_TARGET
      deploy_changed += 1
    end

    current_sv = bs['SWIFT_VERSION']
    if current_sv.nil? || current_sv.to_f < SWIFT_VER.to_f
      bs['SWIFT_VERSION'] = SWIFT_VER
      swift_changed += 1
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
puts "[patch]   SWIFT_VERSION set on #{swift_changed} configs"
puts "[patch]   Warnings-as-errors disabled on #{warn_changed} configs"

puts ""
puts "[patch] Verification — sample of pod targets after patch:"
project.targets.first(5).each do |target|
  cfg = target.build_configurations.find { |c| c.name == 'Release' } || target.build_configurations.first
  next unless cfg
  bs = cfg.build_settings
  puts "  #{target.name}: deployment=#{bs['IPHONEOS_DEPLOYMENT_TARGET'].inspect} swift=#{bs['SWIFT_VERSION'].inspect}"
end
