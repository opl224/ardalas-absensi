import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sekolah.absensi',
  appName: 'Absensi Sekolah',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  android: {
    // Variables are now defined in android/gradle.properties
  }
};

export default config;
