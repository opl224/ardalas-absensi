
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The default Next.js image optimization is disabled because it's not compatible with `output: 'export'`.
  // Capacitor requires a static export of the app.
  images: {
    unoptimized: true,
  },
  devIndicators: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1751889612116.cluster-ubrd2huk7jh6otbgyei4h62ope.cloudworkstations.dev',
    ],
  },
};

export default nextConfig;
