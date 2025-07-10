
'use client'

import React, { useState, useCallback } from "react";
import { Home, User as UserIcon, Users2, LineChart, CheckSquare } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { Reports } from "./Reports";
import { MobileHome } from "./MobileHome";
import { Profile } from "./Profile";
import { Attendance } from "./Attendance";
import { Privacy } from "./Privacy";
import { motion, AnimatePresence } from "framer-motion";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { ExitAppDialog } from "../ExitAppDialog";
import { AttendanceSettingsDialog } from "./AttendanceSettingsDialog";


type MainViewID = 'home' | 'users' | 'reports' | 'attendance' | 'profile';
type SubViewID = 'privacy';
type ViewID = MainViewID | SubViewID;

const mainViews: MainViewID[] = ['home', 'users', 'reports', 'attendance', 'profile'];

const viewComponents: { [key in ViewID]: React.FC<any> } = {
    home: MobileHome,
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
  const [dialogStates, setDialogStates] = useState<{[key: string]: boolean}>({
    delete: false,
    view: false,
    edit: false,
    detail: false,
    logout: false,
    settings: false,
    avatar: false,
  });

  const setDialogState = useCallback((dialog: string, isOpen: boolean) => {
    setDialogStates(prev => ({...prev, [dialog]: isOpen}));
  }, []);

  const NavLink = ({
      index,
      setView,
      children,
      label
  }: {
      index: number,
      setView: (viewId: ViewID) => void,
      children: React.ReactNode,
      label: string
  }) => {
      const isActive = page.index === index;
      const Icon = children as React.ReactElement;
      
      return (
          <button
              onClick={() => setView(mainViews[index])}
              className={`flex flex-col items-center justify-center w-1/5 pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
          >
              <motion.div
                  animate={{ scale: isActive ? 1.2 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                  {Icon}
              </motion.div>
              <span className="text-xs mt-1 font-medium">{label}</span>
          </button>
      );
  };
  
  const changeView = (newView: ViewID) => {
    setPage(prevPage => {
      if (prevPage.view === newView) return prevPage;

      const currentIndex = mainViews.indexOf(prevPage.view as MainViewID);
      const newPageIndex = mainViews.indexOf(newView as MainViewID);

      let direction = 0;
      if (newPageIndex !== -1 && currentIndex !== -1) {
        direction = newPageIndex > currentIndex ? 1 : -1;
      } else {
        direction = 1; // for subviews
      }
      
      const finalIndex = newPageIndex !== -1 ? newPageIndex : prevPage.index;
      return { view: newView, direction, index: finalIndex };
    });
  };
  
  const handleDragEnd = (e: any, { offset }: { offset: { x: number } }) => {
    const swipeThreshold = 50;
    
    setPage(currentPage => {
        // Base the swipe on the currently VISIBLE page (view), not the (potentially stale) active index.
        const currentIndex = mainViews.indexOf(currentPage.view as MainViewID);
        if (currentIndex === -1) return currentPage;

        let newIndex = currentIndex;

        // A left swipe (negative offset) moves to the next page (index + 1).
        if (offset.x < -swipeThreshold) {
            newIndex = Math.min(currentIndex + 1, mainViews.length - 1);
        } 
        // A right swipe (positive offset) moves to the previous page (index - 1).
        else if (offset.x > swipeThreshold) {
            newIndex = Math.max(currentIndex - 1, 0);
        }

        if (newIndex !== currentIndex) {
            const newView = mainViews[newIndex];
            const direction = newIndex > currentIndex ? 1 : -1;
            // On swipe, update everything: the view, the direction, AND the active index.
            return { view: newView, index: newIndex, direction };
        }
        
        return currentPage;
    });
  };
  
  const isSubView = !mainViews.includes(page.view);
  const ComponentToRender = viewComponents[page.view];
  const onBack = () => changeView('profile');

  const onDialogClose = useCallback(() => {
    const openDialogKey = Object.keys(dialogStates).find(key => dialogStates[key]);
    if (openDialogKey) {
        setDialogState(openDialogKey, false);
        return true;
    }
    return false;
  }, [dialogStates, setDialogState]);

  const { showExitDialog, setShowExitDialog, handleConfirmExit } = useAndroidBackHandler({
    currentView: page.view,
    isSubView,
    onBack,
    onDialogClose,
    homeViewId: 'home',
    changeView,
  });

  const props = {
      setActiveView: changeView,
      onBack: onBack,
      setDialogState: setDialogState,
      dialogStates: dialogStates,
  };

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

      {/* Bottom Nav */}
      {!isSubView && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-2 flex justify-around z-10">
          <NavLink index={0} setView={changeView} label="Beranda">
            <Home className="h-6 w-6" />
          </NavLink>
          <NavLink index={1} setView={changeView} label="Pengguna">
            <Users2 className="h-6 w-6" />
          </NavLink>
          <NavLink index={2} setView={changeView} label="Laporan">
            <LineChart className="h-6 w-6" />
          </NavLink>
          <NavLink index={3} setView={changeView} label="Kehadiran">
            <CheckSquare className="h-6 w-6" />
          </NavLink>
          <NavLink index={4} setView={changeView} label="Profil">
            <UserIcon className="h-6 w-6" />
          </NavLink>
        </nav>
      )}

      <ExitAppDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirm={handleConfirmExit}
      />
      
      {/* Settings Dialog is controlled at the dashboard level for back button handling */}
      <AttendanceSettingsDialog open={dialogStates.settings} onOpenChange={(isOpen) => setDialogState('settings', isOpen)} />

    </div>
  );
}
