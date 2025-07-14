
'use client';

import React, { useState, useCallback } from "react";
import { Home, User as UserIcon, Users2, LineChart, CheckSquare } from "lucide-react";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { ExitAppDialog } from "../ExitAppDialog";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";
import dynamic from 'next/dynamic';
import { CenteredLoader } from "../ui/loader";
import { motion, AnimatePresence } from 'framer-motion';

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

const viewComponents: { [key in ViewID]: React.FC<any> } = {
  home: DashboardHome,
  users: UserManagement,
  reports: Reports,
  attendance: Attendance,
  profile: Profile,
  privacy: Privacy,
};

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0
  })
};

const transition = {
  x: { type: "tween", ease: "easeInOut", duration: 0.3 },
  opacity: { duration: 0.2 }
};

export function MobileAdminDashboard() {
  const [page, setPage] = useState<{ view: ViewID; direction: number; index: number }>({
    view: 'home',
    direction: 0,
    index: 0,
  });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const isSubView = !mainViews.includes(page.view as MainViewID) || isEditingUser;
  
  const changeView = useCallback((newView: ViewID, newIndex?: number) => {
    setPage(prevPage => {
      if (prevPage.view === newView) return prevPage;

      const isSub = !mainViews.includes(newView as MainViewID);
      const currentIndex = prevPage.index;
      const finalIndex = isSub ? currentIndex : (newIndex !== undefined ? newIndex : mainViews.indexOf(newView as MainViewID));
      
      let direction = 0;
      if (!isSub) {
        direction = finalIndex > currentIndex ? 1 : -1;
      } else {
        direction = 1; // Subviews always slide in from the right
      }
      
      return { view: newView, direction, index: finalIndex };
    });
  }, []);
  
  const handleDragEnd = (e: any, { offset }: { offset: { x: number } }) => {
    const swipeThreshold = 50;
    
    if (isSubView) return;

    const currentIndex = page.index;
    let newIndex = currentIndex;

    if (offset.x < -swipeThreshold) {
        newIndex = Math.min(currentIndex + 1, mainViews.length - 1);
    } else if (offset.x > swipeThreshold) {
        newIndex = Math.max(currentIndex - 1, 0);
    }

    if (newIndex !== currentIndex) {
        changeView(mainViews[newIndex], newIndex);
    }
  };

  const onBack = useCallback(() => {
    if (page.view === 'privacy') {
      changeView('profile', mainViews.indexOf('profile'));
    }
  }, [page.view, changeView]);

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
    currentView: page.view,
    isSubView,
    onBack,
    onDialogClose,
    homeViewId: 'home',
    changeView: (viewId: ViewID) => changeView(viewId, mainViews.indexOf(viewId as MainViewID)),
  });

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

  let ComponentToRender: React.FC<any>;
  let props: any;

  if (page.view === 'privacy') {
    ComponentToRender = Privacy;
    props = { onBack };
  } else {
    ComponentToRender = viewComponents[page.view];
    props = { 
      setActiveView: changeView,
      onBack, 
      setShowSettingsDialog,
      setIsEditingUser 
    };
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
       <main className="flex-grow relative overflow-hidden">
        <AnimatePresence initial={false} custom={page.direction}>
            <motion.div
              key={page.view}
              className="absolute w-full h-full overflow-y-auto pb-24"
              custom={page.direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              drag={!isSubView ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
            >
              <ComponentToRender {...props} />
            </motion.div>
        </AnimatePresence>
      </main>

      {!isSubView && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-1 flex justify-around z-10">
          <NavLink icon={Home} label="Beranda" isActive={page.index === 0} onClick={() => changeView('home', 0)} />
          <NavLink icon={Users2} label="Pengguna" isActive={page.index === 1} onClick={() => changeView('users', 1)} />
          <NavLink icon={LineChart} label="Laporan" isActive={page.index === 2} onClick={() => changeView('reports', 2)} />
          <NavLink icon={CheckSquare} label="Kehadiran" isActive={page.index === 3} onClick={() => changeView('attendance', 3)} />
          <NavLink icon={UserIcon} label="Profil" isActive={page.index === 4} onClick={() => changeView('profile', 4)} />
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
