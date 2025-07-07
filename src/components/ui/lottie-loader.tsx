'use client';

import Lottie from 'lottie-react';
import animationData from '@/lib/lottie/loader-animation.json';
import { cn } from '@/lib/utils';

interface LottieLoaderProps {
  className?: string;
  size?: number;
}

export function LottieLoader({ className, size = 50 }: LottieLoaderProps) {
  return (
    <Lottie
      animationData={animationData}
      loop={true}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}

export function CenteredLottieLoader({ className }: { className?: string }) {
    return (
        <div className={cn("flex items-center justify-center w-full h-full min-h-screen bg-background", className)}>
            <LottieLoader size={100} />
        </div>
    )
}
