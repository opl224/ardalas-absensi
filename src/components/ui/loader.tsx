'use client';

import { cn } from '@/lib/utils';

interface LoaderProps {
  className?: string;
  scale?: number;
}

export function Loader({ className, scale = 1 }: LoaderProps) {
  // The base size of the CSS loader is 50px. We use scale to adjust it.
  return <div className={cn('loader', className)} style={{ transform: `scale(${scale})` }} />;
}

export function CenteredLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-screen w-full items-center justify-center bg-background', className)}>
      {/* Scale to 2x for a 100px equivalent loader */}
      <Loader scale={2} />
    </div>
  );
}
