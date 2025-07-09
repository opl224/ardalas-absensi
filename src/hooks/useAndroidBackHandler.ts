'use client';

import { useEffect, useState, useCallback } from 'react';
import { App, BackButtonListenerEvent } from '@capacitor/app';

interface UseAndroidBackHandlerProps {
  currentView: string;
  isSubView: boolean;
  onBack: () => void;
  profileViewId: string;
  homeViewId: string;
  changeView: (view: any) => void;
  mainViews: string[];
}

export const useAndroidBackHandler = ({
  currentView,
  isSubView,
  onBack,
  profileViewId,
  homeViewId,
  changeView,
  mainViews
}: UseAndroidBackHandlerProps) => {
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleBackButton = useCallback(
    (e: BackButtonListenerEvent) => {
      e.canGoBack = false; // Prevent default webview behavior

      if (isSubView) {
        onBack();
      } else if (currentView === profileViewId) {
        changeView(homeViewId);
      } else if (mainViews.includes(currentView)) {
        setShowExitDialog(true);
      } else {
        // Fallback for any other case, though it shouldn't be reached
        // with the current logic.
        changeView(homeViewId);
      }
    },
    [currentView, isSubView, onBack, profileViewId, homeViewId, changeView, mainViews]
  );

  useEffect(() => {
    // Only run on capacitor platform
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        const listener = App.addListener('backButton', handleBackButton);
    
        return () => {
          listener.remove();
        };
    }
  }, [handleBackButton]);

  const handleConfirmExit = () => {
    App.exitApp();
  };

  return {
    showExitDialog,
    setShowExitDialog,
    handleConfirmExit,
  };
};
