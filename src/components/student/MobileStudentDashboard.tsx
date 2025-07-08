'use client';

import React, { useState } from 'react';
import { Home, History, User as UserIcon, ArrowLeft } from 'lucide-react';
import { StudentHome } from './StudentHome';
import { AttendanceHistory } from './AttendanceHistory';
import { StudentProfile } from './StudentProfile';
import { CheckinCard } from '@/components/check-in/CheckinCard';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLottieLoader } from '@/components/ui/lottie-loader';
import { motion, AnimatePresence } from 'framer-motion';

type MainViewID = 'home' | 'history' | 'profile';
type SubViewID = 'checkin';
type ViewID = MainViewID | SubViewID;

const mainViews: MainViewID[] = ['home', 'history', 'profile'];

const viewComponents: { [key in ViewID]: React.FC<any> } = {
  home: StudentHome,
  history: AttendanceHistory,
  profile: StudentProfile,
  checkin: CheckinCard,
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


const NavLink = ({
  activePageIndex,
  index,
  setView,
  children,
  label
}: {
  activePageIndex: number,
  index: number,
  setView: (viewId: ViewID) => void,
  children: React.ReactNode,
  label: string,
}) => {
  const isActive = activePageIndex === index;
  return (
    <button
      onClick={() => setView(mainViews[index])}
      className={`flex flex-col items-center justify-center w-1/3 pt-2 pb-1 transition-colors duration-200 ${
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
      }`}
    >
      {children}
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );
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


export function MobileStudentDashboard() {
  const [page, setPage] = useState<{ view: ViewID; direction: number; index: number }>({
    view: 'home',
    direction: 0,
    index: 0,
  });
  const { userProfile, loading } = useAuth();

  if (loading) {
      return <CenteredLottieLoader />;
  }
  if (!userProfile) {
      return <div>Data pengguna tidak ditemukan.</div>
  }

  const changeView = (newView: ViewID) => {
    setPage(prevPage => {
      if (prevPage.view === newView) return prevPage;

      const newIndex = mainViews.indexOf(newView as MainViewID);
      let direction = 0;
      let finalIndex = prevPage.index;

      if (newIndex !== -1) { // It's a main view
        if (newIndex !== prevPage.index) {
          direction = newIndex > prevPage.index ? 1 : -1;
        }
        finalIndex = newIndex;
      } else { // It's a subview
        direction = 1; // Always slide in from right
        // Keep the last main view index
      }
      
      return { view: newView, direction, index: finalIndex };
    });
  };
  
  const handleDragEnd = (e: any, { offset }: { offset: { x: number } }) => {
    const swipeThreshold = 50;
    
    setPage(currentPage => {
        const currentIndex = currentPage.index;
        let newIndex = currentIndex;

        if (offset.x < -swipeThreshold) { // Swiped left
            newIndex = Math.min(currentIndex + 1, mainViews.length - 1);
        } else if (offset.x > swipeThreshold) { // Swiped right
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

  const isSubView = !mainViews.includes(page.view);
  let ComponentToRender: React.FC<any>;
  let props: any;

  if (page.view === 'checkin') {
      ComponentToRender = CheckinWrapper;
      props = { onBack: () => changeView('home'), onSuccess: () => changeView('home') };
  } else {
      ComponentToRender = viewComponents[page.view];
      props = { setActiveView: changeView };
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
          <NavLink activePageIndex={page.index} index={0} setView={changeView} label="Beranda">
            <Home className="h-6 w-6" />
          </NavLink>
          <NavLink activePageIndex={page.index} index={1} setView={changeView} label="Riwayat">
            <History className="h-6 w-6" />
          </NavLink>
          <NavLink activePageIndex={page.index} index={2} setView={changeView} label="Profil">
            <UserIcon className="h-6 w-6" />
          </NavLink>
        </nav>
      )}
    </div>
  );
}
