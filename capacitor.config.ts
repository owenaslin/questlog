import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.questboard.app',
  appName: 'Quest Board',
  webDir: 'dist',
  server: {
    // http is required for live-reload against a local dev server. Release
    // builds must use https so the WebView origin doesn't allow cleartext.
    androidScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
  },
  // Splash screen config removed - add drawable/splash.png to enable
  // plugins: {
  //   SplashScreen: {
  //     launchShowDuration: 2000,
  //     launchAutoHide: true,
  //     backgroundColor: '#1a1a2e',
  //     androidSplashResourceName: 'splash',
  //     androidScaleType: 'CENTER_CROP',
  //   },
  // },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
