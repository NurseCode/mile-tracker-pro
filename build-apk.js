#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Build configuration for standalone APK
const buildConfig = {
  platform: 'android',
  buildType: 'apk',
  profile: 'production'
};

console.log('🔨 Building standalone Android APK...');
console.log('📱 This will create a real app that installs like Play Store apps');

// Check if Android project exists
const androidDir = path.join(__dirname, 'android');
if (!fs.existsSync(androidDir)) {
  console.error('❌ Android project not found. Run "npx expo prebuild" first.');
  process.exit(1);
}

// Build using EAS local build
const buildCommand = `npx eas build --platform android --profile preview --local --non-interactive`;

console.log('⚡ Starting build process...');
exec(buildCommand, { cwd: __dirname }, (error, stdout, stderr) => {
  if (error) {
    console.log('🔄 Trying alternative build method...');
    
    // Alternative: Direct Gradle build
    const gradleBuild = `cd android && ./gradlew assembleRelease`;
    exec(gradleBuild, { cwd: __dirname }, (gradleError, gradleStdout, gradleStderr) => {
      if (gradleError) {
        console.log('📋 Build requires manual setup. Creating instructions...');
        
        const instructions = `
# MileTracker Pro - APK Build Instructions

## Quick Build (5 minutes)

1. Download Android Studio: https://developer.android.com/studio
2. Open this project folder in Android Studio
3. Click "Build" → "Build Bundle(s)/APK(s)" → "Build APK(s)"
4. APK will be created in: android/app/build/outputs/apk/release/

## Alternative: Command Line Build

1. Install Java 17+
2. Set ANDROID_HOME environment variable
3. Run: cd android && ./gradlew assembleRelease

## Ready for Play Store

The built APK can be:
- Installed directly on Android devices
- Uploaded to Google Play Console
- Distributed independently

## App Features
- Works completely offline
- GPS tracking with receipt capture
- Professional CSV export
- Real navigation integration
- No internet connection required after install
        `;
        
        fs.writeFileSync('BUILD_INSTRUCTIONS.md', instructions);
        console.log('✅ Created BUILD_INSTRUCTIONS.md');
        console.log('📋 Follow the instructions to build your standalone APK');
      } else {
        console.log('✅ APK built successfully!');
        console.log('📱 Check android/app/build/outputs/apk/release/ for your APK');
      }
    });
  } else {
    console.log('✅ EAS build completed!');
    console.log(stdout);
  }
});