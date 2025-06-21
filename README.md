# MileTracker Pro - Professional Mileage Tracking App

A comprehensive mileage tracking application competing with MileIQ at $4.99/month vs $9.99/month.

## Features

### Core Tracking
- **Automatic Trip Detection** - GPS-based driving detection
- **Manual Trip Control** - Precise start/stop controls
- **Real-time Tracking** - Live distance and duration updates
- **Background Monitoring** - Continues tracking when minimized

### Receipt Management
- **Camera Capture** - Photo receipts for gas, parking, maintenance
- **Smart Cropping** - Optimize storage with flexible photo cropping
- **Trip Association** - Attach receipts to specific trips
- **Bulk Export** - Send all receipts for tax periods

### Professional Export
- **CSV Generation** - Excel-compatible professional reports
- **Email Integration** - Direct sending from app
- **Custom Date Ranges** - Weekly, monthly, quarterly, annual
- **IRS Calculations** - Automatic tax deduction calculations

### Navigation & Maps
- **Route Display** - Visual trip paths on interactive maps
- **Navigation Launch** - One-tap Google Maps/Apple Maps integration
- **Address Conversion** - GPS coordinates to readable addresses
- **Location History** - Track frequently visited destinations

## Technical Architecture

- **Framework**: React Native with Expo SDK 53
- **Database**: Local storage with optional cloud sync
- **Maps**: React Native Maps with native performance
- **Camera**: Expo Camera with advanced photo controls
- **Location**: Expo Location with background tracking
- **Export**: Native file system with email composer

## Build Instructions

### Automatic Build (Recommended)
This repository uses GitHub Actions to automatically build APK files:

1. Fork this repository
2. Add `EXPO_TOKEN` secret in repository settings
3. Push changes to trigger build
4. Download APK from Actions artifacts or Releases

### Manual Build
```bash
npm install
eas build --platform android --profile preview
```

## Installation

1. Download the latest APK from [Releases](../../releases)
2. Enable "Install unknown apps" in Android settings
3. Install the APK file
4. Grant location and camera permissions

## Business Model

- **Free Tier**: 40 automatic trips/month
- **Premium**: $4.99/month unlimited tracking
- **Annual**: $39.99/year (33% discount)
- **Lifetime**: $149.99 one-time purchase

## Competitive Advantage

- 50% cheaper than MileIQ ($4.99 vs $9.99/month)
- Historical IRS rate accuracy
- Professional receipt management
- API access for business integrations
- Privacy-first local storage

## Ready for Production

This app is production-ready for Google Play Store deployment with:
- Professional UI/UX matching commercial standards
- Comprehensive feature set competing with established apps
- Scalable architecture supporting thousands of users
- Revenue model with multiple pricing tiers