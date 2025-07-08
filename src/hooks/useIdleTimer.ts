
'use client';

import { useEffect, useRef, useCallback } from 'react';

const useIdleTimer = (onIdle: () => void, timeout: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(onIdle, timeout);
  }, [onIdle, timeout]);

  const handleEvent = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    // Set up event listeners
    events.forEach(event => {
      window.addEventListener(event, handleEvent, { passive: true });
    });

    // Initialize the timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [handleEvent, resetTimer]);
};

export default useIdleTimer;
