import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sekolah.absensi',
  appName: 'Absensi Sekolah',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  android: {
    // Variables are now defined here to be injected into gradle files
    buildToolsVersion: '34.0.0',
    compileSdkVersion: 34,
    targetSdkVersion: 34,
    minSdkVersion: 22,
    androidXCoreVersion: '1.13.1',
    androidXAppCompatVersion: '1.7.0',
    androidXBrowserVersion: '1.8.0',
    androidXActivityVersion: '1.9.1',
    googlePlayServicesLocationVersion: '21.3.0',
    firebaseMessagingVersion: '24.0.0',
    androidxCoordinatorLayoutVersion: '1.2.0',
  }
};

export default config;
