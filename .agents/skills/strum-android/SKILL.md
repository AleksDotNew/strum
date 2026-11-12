---
name: strum-android
description: >-
  Manage the Android toolchain (JDK 21, Android SDK 36, Pixel 9a AVD), sync and
  build Capacitor Android packages, capture device screenshots, and collect
  filtered WebView/Capacitor logcat logs. Use when setting up the Android
  environment, building APKs, or debugging on a Pixel emulator or device.
---

# Strum Android Toolchain & Debugging (`strum-android`)

## Overview
Provides environment diagnostics (`doctor`), Capacitor web-to-Android build/sync (`sync-build`), and filtered WebView `logcat` collection (`logcat`). Works alongside `android-cli` and `android-device-hub`.

## Dependencies
- **android-cli**: Official `android` CLI skill for installing SDK packages, creating/starting AVDs (`android emulator`), running APKs (`android run`), and capturing screenshots (`android screen capture`).
- **android-device-hub**: Sidecar instructions for mirroring and inspecting connected Android devices or emulators.

## Quick Start
```bash
python3 .agents/skills/strum-android/scripts/android_tool.py doctor --output tmp/android-doctor.json
```

## Utility Scripts

### 1. Environment diagnostics (`doctor`)
Checks JDK 21 (`java -version`), `ANDROID_HOME`, `android` CLI, `adb`, and connected devices/AVDs.
```bash
python3 .agents/skills/strum-android/scripts/android_tool.py doctor --output tmp/android-doctor.json
```

### 2. Sync & Gradle build (`sync-build`)
Runs `npm run build`, `npx cap sync android`, and `./gradlew assembleDebug` (or `assembleRelease`).
```bash
python3 .agents/skills/strum-android/scripts/android_tool.py sync-build --variant debug --output tmp/android-build.json
```

### 3. Capture WebView & Capacitor logs (`logcat`)
Dumps the last `--lines` lines from `adb logcat -d` filtered to `Capacitor`, `chromium`, `WebViewConsole`, and `AndroidRuntime`.
```bash
python3 .agents/skills/strum-android/scripts/android_tool.py logcat --lines 200 --output tmp/android-logcat.json
```

## Common Mistakes
- **Wrong Java version**: Capacitor 8 / Android Gradle Plugin requires **JDK 21**. Always run `doctor` first if Gradle fails with class file version errors.
- **Forgetting `cap sync android` after web changes**: Running Gradle alone packs stale assets from `android/app/src/main/assets/public`. Always use `sync-build`.

