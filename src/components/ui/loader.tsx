
'use client';

import { cn } from '@/lib/utils';

export function Loader({ className }: { className?: string }) {
  // Simple div loader instead of CSS grid one
  return <div className={cn('h-5 w-5 border-4 border-primary border-t-transparent rounded-full animate-spin', className)} />;
}

export function CenteredLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-screen w-full items-center justify-center bg-background', className)}>
      <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
