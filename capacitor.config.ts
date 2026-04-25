import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.questboard.app',
  appName: 'Quest Board',
  webDir: 'dist',
  server: {
    androidScheme: 'http',  // Use http for local dev to avoid CORS issues
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
