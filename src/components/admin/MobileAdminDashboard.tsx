
'use client';

import React, { useState, useCallback } from "react";
import { Home, User as UserIcon, Users2, LineChart, CheckSquare } from "lucide-react";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { ExitAppDialog } from "../ExitAppDialog";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";
import dynamic from 'next/dynamic';
import { CenteredLoader } from "../ui/loader";

const DashboardHome = dynamic(() => import('./DashboardHome').then(mod => mod.DashboardHome), {
  loading: () => <CenteredLoader />,
});
const UserManagement = dynamic(() => import('./UserManagement'), {
  loading: () => <CenteredLoader />,
});
const Reports = dynamic(() => import('./Reports'), {
  loading: () => <CenteredLoader />,
});
const Attendance = dynamic(() => import('./Attendance'), {
  loading: () => <CenteredLoader />,
});
const Profile = dynamic(() => import('./Profile').then(mod => mod.Profile), {
  loading: () => <CenteredLoader />,
});
const Privacy = dynamic(() => import('./Privacy').then(mod => mod.Privacy), {
  loading: () => <CenteredLoader />,
});

type MainViewID = 'home' | 'users' | 'reports' | 'attendance' | 'profile';
type SubViewID = 'privacy';
type ViewID = MainViewID | SubViewID;

const mainViews: MainViewID[] = ['home', 'users', 'reports', 'attendance', 'profile'];

const NavLink = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-1/5 pt-2 pb-1 transition-colors duration-200 ${
      isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
    }`}
  >
    <Icon className="h-6 w-6" />
    <span className="text-xs mt-1 font-medium">{label}</span>
  </button>
);

export function MobileAdminDashboard() {
  const [activeView, setActiveView] = useState<ViewID>('home');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const isSubView = !mainViews.includes(activeView as MainViewID) || isEditingUser;

  const onBack = useCallback(() => {
    if (activeView === 'privacy') {
      setActiveView('profile');
    }
  }, [activeView]);

  const onDialogClose = useCallback(() => {
    const openDialogs = document.querySelectorAll('[data-state="open"]');
    if (openDialogs.length > 0) {
      const closeButton = document.querySelector('[data-state="open"] [aria-label="Close"], [data-state="open"] [type="button"][aria-label="Close"], [data-state="open"] [data-radix-collection-item] > [role="menuitem"]') as HTMLElement | null;
      if (closeButton) {
        closeButton.click();
        return true;
      }
    }
    if (showSettingsDialog) {
      setShowSettingsDialog(false);
      return true;
    }
    return false;
  }, [showSettingsDialog]);

  const { showExitDialog, setShowExitDialog, handleConfirmExit } = useAndroidBackHandler({
    currentView: activeView,
    isSubView,
    onBack,
    onDialogClose,
    homeViewId: 'home',
    changeView: (viewId: ViewID) => setActiveView(viewId),
  });

  const renderContent = () => {
    const props = {
      setActiveView,
      onBack,
      setShowSettingsDialog,
      setIsEditingUser,
    };

    switch (activeView) {
      case 'home':
        return <DashboardHome />;
      case 'users':
        return <UserManagement {...props} />;
      case 'reports':
        return <Reports />;
      case 'attendance':
        return <Attendance />;
      case 'profile':
        return <Profile {...props} />;
      case 'privacy':
        return <Privacy onBack={() => setActiveView('profile')} />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
      <main className="flex-grow overflow-y-auto pb-20">{renderContent()}</main>

      {!isSubView && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-1 flex justify-around z-10">
          <NavLink icon={Home} label="Beranda" isActive={activeView === 'home'} onClick={() => setActiveView('home')} />
          <NavLink icon={Users2} label="Pengguna" isActive={activeView === 'users'} onClick={() => setActiveView('users')} />
          <NavLink icon={LineChart} label="Laporan" isActive={activeView === 'reports'} onClick={() => setActiveView('reports')} />
          <NavLink icon={CheckSquare} label="Kehadiran" isActive={activeView === 'attendance'} onClick={() => setActiveView('attendance')} />
          <NavLink icon={UserIcon} label="Profil" isActive={activeView === 'profile'} onClick={() => setActiveView('profile')} />
        </nav>
      )}

      <ExitAppDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirm={handleConfirmExit}
      />
      
      <AttendanceSettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
    </div>
  );
}
