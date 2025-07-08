
'use client';

import React, { useState } from 'react';
import { Home, History, User as UserIcon, ArrowLeft } from 'lucide-react';
import { TeacherHome } from './TeacherHome';
import { AttendanceHistory } from './AttendanceHistory';
import { TeacherProfile } from './TeacherProfile';
import { CheckinCard } from '@/components/check-in/CheckinCard';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLottieLoader } from '@/components/ui/lottie-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { Privacy } from './Privacy';

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
  const { userProfile, loading } = useAuth();
  
  const NavLink = ({
    index,
    setView,
    children,
    label,
  }: {
    index: number;
    setView: (viewId: ViewID) => void;
    children: React.ReactNode;
    label: string;
  }) => {
    const isActive = page.index === index;
    const Icon = children as React.ReactElement;
  
    return (
      <button
        onClick={() => setView(mainViews[index])}
        className={`flex flex-col items-center justify-center w-1/3 pt-2 pb-1 transition-colors duration-200 ${
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <motion.div
          animate={{ scale: isActive ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {Icon}
        </motion.div>
        <span className="text-xs mt-1 font-medium">{label}</span>
      </button>
    );
  };

  if (loading) {
      return <CenteredLottieLoader />;
  }
  if (!userProfile) {
      return <div>Data pengguna tidak ditemukan.</div>
  }
  
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

      // If the new view is a main view, update the index. Otherwise, keep the last main view index.
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
  let ComponentToRender: React.FC<any>;
  let props: any;

  if (page.view === 'checkin') {
      ComponentToRender = CheckinWrapper;
      props = { onBack: () => changeView('home'), onSuccess: () => changeView('history') };
  } else {
      ComponentToRender = viewComponents[page.view];
      props = { setActiveView: changeView, onBack: () => changeView('profile') };
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

      {page.view !== 'checkin' && (
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
    </div>
  );
}
