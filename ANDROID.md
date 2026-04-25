# Quest Board - Android Build Guide

This guide covers building the Quest Board app for Android using Capacitor.

## Prerequisites

- Node.js 18+
- Android Studio (latest stable)
- Android SDK (API 33+)
- Java JDK 17

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build for Android

```bash
# Build static export for Capacitor
npm run cap:build

# Sync web assets to Android project
npm run cap:sync

# Open in Android Studio
npm run cap:open:android
```

### 3. Build APK in Android Studio

1. Android Studio opens automatically
2. Wait for Gradle sync to complete
3. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
4. Find APK at `android/app/build/outputs/apk/debug/app-debug.apk`

## Development Workflow

### Live Reload (Development)

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run on device/emulator
npx cap run android --livereload --external
```

### Production Build

```bash
# Full production build
npm run cap:build
npm run cap:sync
npm run cap:open:android

# In Android Studio:
# Build > Generate Signed Bundle/APK
```

## Project Structure

```
quest-board/
├── android/              # Native Android project (auto-generated)
│   ├── app/src/main/     # Android source + web assets
│   └── ...
├── capacitor.config.ts   # Capacitor configuration
├── next.config.mjs       # Next.js config (handles CAPACITOR_BUILD env)
└── dist/                 # Static export output
```

## Configuration

### capacitor.config.ts

| Option | Description |
|--------|-------------|
| `appId` | Android package identifier (`com.questboard.app`) |
| `appName` | Display name in launcher |
| `webDir` | Output directory (`dist` for static export) |

### Environment Variables

Create `.env.local` for local development:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Troubleshooting

### "dist directory not found"

Run `npm run cap:build` first to generate the static export.

### Android Studio: "Gradle sync failed"

1. File → Invalidate Caches / Restart
2. Try again with stable internet connection

### Capacitor plugins not working

```bash
npm run cap:sync
```

### Web app works, Android app doesn't

Check browser console in Android Studio:
1. Open Chrome → `chrome://inspect`
2. Find your device → Inspect

## Publishing to Google Play

1. Generate signed release build in Android Studio
2. Create Google Play Console account ($25 one-time fee)
3. Upload AAB (Android App Bundle)
4. Complete store listing

## Supabase CORS Configuration

For Capacitor to communicate with Supabase, add these origins to your Supabase project:

1. Go to **Supabase Dashboard → Project Settings → API**
2. Under "CORS Origins", add:
   - `http://localhost` (for development)
   - `capacitor://localhost` (for production builds)
   - `https://*.vercel.app` (for web preview)

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Download](https://developer.android.com/studio)
