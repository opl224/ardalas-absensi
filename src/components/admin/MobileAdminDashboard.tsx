
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Home, History, User as UserIcon, Users2, LineChart, CheckSquare, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLoader } from '@/components/ui/loader';
import { motion, AnimatePresence } from 'framer-motion';
import { useAndroidBackHandler } from '@/hooks/useAndroidBackHandler';
import { ExitAppDialog } from '../ExitAppDialog';
import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/use-mobile';
import type { User } from './UserManagement';

const MobileHome = dynamic(() => import('./MobileHome').then(mod => mod.MobileHome), {
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

type MainViewID = 'home' | 'users' | 'attendance' | 'reports' | 'profile';
type SubViewID = 'privacy' | 'editUser';
type ViewID = MainViewID | SubViewID;

const mainViews: MainViewID[] = ['home', 'users', 'attendance', 'reports', 'profile'];

const viewComponents: { [key in ViewID]: React.FC<any> } = {
  home: MobileHome,
  users: UserManagement,
  attendance: Attendance,
  reports: Reports,
  profile: Profile,
  privacy: Privacy,
  editUser: () => null, // Placeholder, rendering is handled inside UserManagement
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { userProfile, logout } = useAuth();
  
  useEffect(() => {
    if (editingUser) {
      changeView('editUser', mainViews.indexOf('users'));
    } else {
      if (page.view === 'editUser') {
        changeView('users', mainViews.indexOf('users'));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingUser]);

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
        className={`flex flex-col items-center justify-center w-1/5 pt-2 pb-1 transition-colors duration-200 ${
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
        direction = 1; 
      }
      
      return { view: newView, direction, index: finalIndex };
    });
  }, []);

  const onBack = useCallback(() => {
    if (page.view === 'privacy') {
      changeView('profile', mainViews.indexOf('profile'));
    } else if (page.view === 'editUser') {
      setEditingUser(null); // This will trigger the useEffect to change view
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
      if (!mainViews.includes(currentPage.view as MainViewID)) return currentPage;
  
      const currentIndex = mainViews.indexOf(currentPage.view as MainViewID);
      let newIndex = currentIndex;
  
      if (offset.x < -swipeThreshold) {
        newIndex = Math.min(currentIndex + 1, mainViews.length - 1);
      } else if (offset.x > swipeThreshold) {
        newIndex = Math.max(currentIndex - 1, 0);
      }
  
      if (newIndex !== currentIndex) {
        const newView = mainViews[newIndex];
        const direction = newIndex > currentIndex ? 1 : -1;
        return { view: newView, direction, index: newIndex };
      }
  
      return currentPage;
    });
  };

  const isSubView = !mainViews.includes(page.view as MainViewID);
  
  const renderView = () => {
    const viewToRender = isSubView ? mainViews[page.index] : page.view;
    const ComponentToRender = viewComponents[viewToRender];
    let props: any = { setActiveView: changeView };

    if (viewToRender === 'users') {
      props.isMobile = true;
      props.isEditing = page.view === 'editUser';
      props.editingUser = editingUser;
      props.setEditingUser = setEditingUser;
    } else if (viewToRender === 'profile' && page.view === 'privacy') {
        return <Privacy onBack={onBack} />;
    } else if (page.view === 'privacy') {
        return <Privacy onBack={onBack} />;
    }

    return <ComponentToRender {...props} />;
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
              {renderView()}
            </motion.div>
        </AnimatePresence>
      </main>

      {page.view !== 'editUser' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-1 flex justify-around z-10">
          <NavLink index={0} setView={changeView} label="Beranda">
            <Home className="h-6 w-6" />
          </NavLink>
          <NavLink index={1} setView={changeView} label="Pengguna">
            <Users2 className="h-6 w-6" />
          </NavLink>
          <NavLink index={2} setView={changeView} label="Kehadiran">
            <CheckSquare className="h-6 w-6" />
          </NavLink>
          <NavLink index={3} setView={changeView} label="Laporan">
            <LineChart className="h-6 w-6" />
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
    </div>
  );
}
