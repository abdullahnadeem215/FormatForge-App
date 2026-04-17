import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maahhha.formatforge',
  appName: 'FormatForge Pro',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#08080A",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: false,
      showSpinner: true,
      iosSpinnerStyle: "large",
      androidSpinnerStyle: "large",
      spinnerColor: "#ffffff"
    }
  }
};

export default config;
