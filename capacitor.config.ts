import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sekolah.absensi',
  appName: 'Absensi Sekolah',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
