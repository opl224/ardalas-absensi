
'use client';

import { useEffect, useState, useCallback } from 'react';
import { App, BackButtonListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface UseAndroidBackHandlerProps {
  currentView: string;
  isSubView: boolean;
  onBack: () => void;
  homeViewId: string;
  changeView: (view: any, index?: number) => void;
  onDialogClose?: () => boolean; // Return true if a dialog was closed, false otherwise
  logout?: (message?: string) => void;
}

export const useAndroidBackHandler = ({
  currentView,
  isSubView,
  onBack,
  homeViewId,
  changeView,
  onDialogClose,
  logout
}: UseAndroidBackHandlerProps) => {
  const [showExitDialog, setShowExitDialog] = useState(false);

  const handleBackButton = useCallback(
    (e: BackButtonListenerEvent) => {
      e.canGoBack = false; // Prevent default webview behavior

      // If a dialog is open and the callback closes it, stop further processing.
      if (onDialogClose && onDialogClose()) {
        return;
      }
      
      // If the exit dialog is open, the back button should close it.
      if (showExitDialog) {
        setShowExitDialog(false);
        return;
      }

      if (isSubView) {
        onBack();
      } else if (currentView !== homeViewId) {
        changeView(homeViewId, 0); // Always go to the first tab
      } else {
        setShowExitDialog(true);
      }
    },
    [currentView, isSubView, onBack, homeViewId, changeView, showExitDialog, onDialogClose]
  );

  useEffect(() => {
    let listener: any;
    if (Capacitor.isNativePlatform()) {
        const addListener = async () => {
           listener = await App.addListener('backButton', handleBackButton);
        }
        addListener();
    
        return () => {
          if (listener) {
            listener.remove();
          }
        };
    }
  }, [handleBackButton]);

  const handleConfirmExit = () => {
    // If a logout function is provided, call it.
    // Otherwise, just exit.
    if (logout) {
      logout(); // This will clear the session
    }
    // After logging out (or if no logout function is available), exit the app.
    App.exitApp();
  };

  return {
    showExitDialog,
    setShowExitDialog,
    handleConfirmExit,
  };
};
