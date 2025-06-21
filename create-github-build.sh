#!/bin/bash

# Create GitHub Actions workflow for APK build
mkdir -p .github/workflows

cat > .github/workflows/build-apk.yml << 'EOF'
name: Build Android APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Setup Expo CLI
      run: npm install -g @expo/cli eas-cli
      
    - name: Install dependencies
      run: npm install
      
    - name: Build APK
      env:
        EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      run: eas build --platform android --profile preview --non-interactive
      
    - name: Upload APK
      uses: actions/upload-artifact@v3
      with:
        name: MileTracker-Pro-APK
        path: '*.apk'
EOF

echo "GitHub Actions workflow created!"
echo "1. Push this to GitHub"
echo "2. Add EXPO_TOKEN secret in GitHub repository settings"
echo "3. APK will build automatically on cloud servers"