# GitHub Setup Instructions for APK Build

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click "New repository" (green button)
3. Name it: `miletracker-pro`
4. Make it **Public** (required for free Actions)
5. Click "Create repository"

## Step 2: Upload Your Code

### Option A: GitHub Web Interface (Easiest)
1. In your new repository, click "uploading an existing file"
2. Drag and drop all files from your MileTrackerPro folder
3. Write commit message: "Initial MileTracker Pro upload"
4. Click "Commit changes"

### Option B: Git Commands
```bash
cd MileTrackerPro
git init
git add .
git commit -m "Initial MileTracker Pro upload"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/miletracker-pro.git
git push -u origin main
```

## Step 3: Add Expo Token Secret

1. In your GitHub repository, go to **Settings**
2. Click **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `EXPO_TOKEN`
5. Value: Your Expo access token (from your Replit environment)
6. Click **Add secret**

## Step 4: Trigger Build

1. Go to **Actions** tab in your repository
2. You should see "Build Android APK" workflow
3. Click **Run workflow** → **Run workflow**
4. Wait 15-30 minutes for build to complete

## Step 5: Download APK

### From Actions (Immediate)
1. Go to **Actions** tab
2. Click the completed build
3. Scroll down to **Artifacts**
4. Download **MileTracker-Pro-Android-APK**

### From Releases (Automatic)
1. Go to **Releases** section
2. Download the latest APK file
3. Install on your Android device

## What Happens During Build

The GitHub servers will:
- Install Node.js and Expo tools
- Download all your app dependencies
- Compile React Native code to native Android
- Generate a standalone APK with all features
- Package it for download

## Expected Timeline

- **Upload code**: 2-5 minutes
- **Build process**: 15-30 minutes  
- **Download APK**: 1 minute
- **Install on phone**: 1 minute

Total time from start to working app: ~30-40 minutes

## Troubleshooting

If build fails:
1. Check the Actions logs for error details
2. Ensure EXPO_TOKEN secret is set correctly
3. Verify all files uploaded properly
4. Repository must be public for free builds

Your APK will have identical functionality to the development version running in Replit, but as a standalone installable Android app.