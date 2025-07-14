
'use client';

import React, { useState, useCallback } from 'react';
import { Home, History, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLoader } from '@/components/ui/loader';
import { motion, AnimatePresence } from 'framer-motion';
import { useAndroidBackHandler } from '@/hooks/useAndroidBackHandler';
import { ExitAppDialog } from '../ExitAppDialog';
import dynamic from 'next/dynamic';

const TeacherHome = dynamic(() => import('./TeacherHome').then(mod => mod.TeacherHome), {
  loading: () => <CenteredLoader />,
});
const AttendanceHistory = dynamic(() => import('./AttendanceHistory').then(mod => mod.AttendanceHistory), {
  loading: () => <CenteredLoader />,
});
const TeacherProfile = dynamic(() => import('./TeacherProfile').then(mod => mod.TeacherProfile), {
  loading: () => <CenteredLoader />,
});
const CheckinCard = dynamic(() => import('@/components/check-in/CheckinCard').then(mod => mod.CheckinCard), {
  loading: () => <CenteredLoader />,
});
const Privacy = dynamic(() => import('./Privacy').then(mod => mod.Privacy), {
  loading: () => <CenteredLoader />,
});

type MainViewID = 'home' | 'history' | 'profile';
type SubViewID = 'checkin' | 'privacy';
type ViewID = MainViewID | SubViewID;

const mainViews: MainViewID[] = ['home', 'history', 'profile'];

const viewComponents: { [key in ViewID]: React.FC<any> } = {
  home: TeacherHome,
  history: AttendanceHistory,
  profile: TeacherProfile,
  checkin: CheckinCard,
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


const CheckinWrapper = ({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) => (
    <div className="bg-background h-full flex flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <button onClick={onBack} className="p-1">
                <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Kehadiran</h1>
        </header>
        <div className="flex-grow overflow-y-auto p-4 flex flex-col items-center">
            <CheckinCard onSuccess={onSuccess} />
        </div>
    </div>
);


export function MobileTeacherDashboard() {
  const [page, setPage] = useState<{ view: ViewID; direction: number; index: number }>({
    view: 'home',
    direction: 0,
    index: 0,
  });
  const { userProfile, logout } = useAuth();
  
  const NavLink = ({
    index,
    setView,
    children,
    label,
  }: {
    index: number;
    setView: (viewId: ViewID, index: number) => void;
    children: React.ReactNode;
    label: string;
  }) => {
    const isActive = page.index === index;
    const Icon = children as React.ReactElement;
  
    return (
      <button
        onClick={() => setView(mainViews[index], index)}
        className={`flex flex-col items-center justify-center w-1/3 pt-2 pb-1 transition-colors duration-200 ${
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
        }`}
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

  const onBack = useCallback(() => {
    if (page.view === 'checkin') {
      changeView('home', 0);
    } else if (page.view === 'privacy') {
      changeView('profile', mainViews.indexOf('profile'));
    }
  }, [page.view, changeView]);

  const onDialogClose = useCallback(() => {
    // This function will be called by the back button handler.
    // If we find an open dialog, we close it and return true.
    // This stops the back button handler from doing anything else.
    const openDialogs = document.querySelectorAll('[data-state="open"]');
    if (openDialogs.length > 0) {
      // Radix dialogs/popovers often have a close button. We can "click" it.
      const closeButton = document.querySelector('[data-state="open"] [aria-label="Close"], [data-state="open"] [type="button"][aria-label="Close"], [data-state="open"] [data-radix-collection-item] > [role="menuitem"]') as HTMLElement | null;
      if (closeButton) {
        closeButton.click();
        return true;
      }
    }
    return false;
  }, []);
  
  const { showExitDialog, setShowExitDialog, handleConfirmExit } = useAndroidBackHandler({
    currentView: page.view,
    isSubView: !mainViews.includes(page.view as MainViewID),
    onBack,
    onDialogClose,
    homeViewId: 'home',
    changeView: (viewId: ViewID) => changeView(viewId, mainViews.indexOf(viewId as MainViewID)),
    logout
  });

  const handleDragEnd = (e: any, { offset }: { offset: { x: number } }) => {
    const swipeThreshold = 50;
    
    setPage(currentPage => {
        const isSubView = !mainViews.includes(currentPage.view as MainViewID);
        if (isSubView) return currentPage;

        const currentIndex = currentPage.index;
        let newIndex = currentIndex;

        if (offset.x < -swipeThreshold) {
            newIndex = Math.min(currentIndex + 1, mainViews.length - 1);
        } 
        else if (offset.x > swipeThreshold) {
            newIndex = Math.max(currentIndex - 1, 0);
        }

        if (newIndex !== currentIndex) {
            const newView = mainViews[newIndex];
            const direction = newIndex > currentIndex ? 1 : -1;
            return { view: newView, index: newIndex, direction };
        }
        
        return currentPage;
    });
  };


  const isSubView = !mainViews.includes(page.view as MainViewID);
  let ComponentToRender: React.FC<any>;
  let props: any;

  if (page.view === 'checkin') {
      ComponentToRender = CheckinWrapper;
      props = { onBack, onSuccess: () => changeView('history', mainViews.indexOf('history')) };
  } else {
      ComponentToRender = viewComponents[page.view];
      props = { setActiveView: changeView };
  }
  
  if (!userProfile) {
    return <CenteredLoader />
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
          <NavLink index={0} setView={changeView} label="Beranda">
            <Home className="h-6 w-6" />
          </NavLink>
          <NavLink index={1} setView={changeView} label="Riwayat">
            <History className="h-6 w-6" />
          </NavLink>
          <NavLink index={2} setView={changeView} label="Profil">
            <UserIcon className="h-6 w-6" />
          </NavLink>
        </nav>
      )}

       <ExitAppDialog
        open={showExitDialog}
        onOpenChange={setShowExitDialog}
        onConfirm={handleConfirmExit}
      />
    </div>
  );
}
