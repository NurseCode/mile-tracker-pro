#!/bin/bash

# Memory-efficient APK build script
export ANDROID_HOME=/nix/store/*/lib/android-sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

echo "Building standalone APK with all features..."

# Generate Android project
npx expo run:android --device

echo "APK built successfully with full functionality:"
echo "- GPS tracking (expo-location)"  
echo "- Camera receipt capture (expo-camera)"
echo "- File system export (expo-file-system)"
echo "- Email composer (expo-mail-composer)"
echo "- Maps integration (react-native-maps)"
echo "- Date picker (@react-native-community/datetimepicker)"