
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

      if (showExitDialog) {
        setShowExitDialog(false);
        return;
      }

      if (isSubView) {
        onBack();
      } else if (currentView !== homeViewId) {
        changeView(homeViewId);
      } else {
        setShowExitDialog(true);
      }
    },
    [currentView, isSubView, onBack, homeViewId, changeView, showExitDialog]
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
