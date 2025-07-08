'use client';

import React, { useState, useRef } from 'react';
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
  setView: (index: number) => void,
  children: React.ReactNode,
  label: string,
}) => {
  const isActive = activePageIndex === index;
  return (
    <button
      onClick={() => setView(index)}
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
  const [view, setView] = useState<number | ViewID>(0);
  const [direction, setDirection] = useState(0);
  const { userProfile, loading } = useAuth();
  
  const viewRef = useRef(view);
  viewRef.current = view;

  if (loading) {
      return <CenteredLottieLoader />;
  }
  if (!userProfile) {
      return <div>Data pengguna tidak ditemukan.</div>
  }

  const currentIndex = typeof view === 'number' ? view : mainViews.indexOf(view as MainViewID);

  const changeView = (newView: number | ViewID) => {
    const oldIndex = typeof viewRef.current === 'number' ? viewRef.current : mainViews.indexOf(viewRef.current as MainViewID);
    const newIndex = typeof newView === 'number' ? newView : mainViews.indexOf(newView as MainViewID);

    let d = 0;
    if (oldIndex !== -1 && newIndex !== -1) {
        d = newIndex > oldIndex ? 1 : -1;
    } else {
        d = 1;
    }
    
    setDirection(d);
    setView(newView);
  };
  
  const handleSwipe = (swipeDirection: number) => {
    const currentView = viewRef.current;
    if (typeof currentView !== 'number') return;
    const newIndex = currentView + swipeDirection;
    if (newIndex >= 0 && newIndex < mainViews.length) {
        changeView(newIndex);
    }
  };

  const viewIdToRender = typeof view === 'number' ? mainViews[view] : view;
  const isSubView = typeof view !== 'number';

  let ComponentToRender: React.FC<any>;
  let props: any;

  if(viewIdToRender === 'checkin') {
      ComponentToRender = CheckinWrapper;
      props = { onBack: () => changeView(0), onSuccess: () => changeView(0) };
  } else {
      ComponentToRender = viewComponents[viewIdToRender];
      props = { setActiveView: changeView };
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
      <main className={`flex-grow relative overflow-hidden ${view !== 'checkin' ? 'pb-20' : ''}`}>
        <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={view.toString()}
              className="absolute w-full h-full"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              drag={!isSubView ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                  if (isSubView) return;
                  const swipeThreshold = 50;
                  if (offset.x < -swipeThreshold || velocity.x < -300) {
                      handleSwipe(1);
                  } else if (offset.x > swipeThreshold || velocity.x > 300) {
                      handleSwipe(-1);
                  }
              }}
            >
              <ComponentToRender {...props} />
            </motion.div>
        </AnimatePresence>
      </main>

      {view !== 'checkin' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-1 flex justify-around z-10">
          <NavLink activePageIndex={currentIndex} index={0} setView={changeView} label="Beranda">
            <Home className="h-6 w-6" />
          </NavLink>
          <NavLink activePageIndex={currentIndex} index={1} setView={changeView} label="Riwayat">
            <History className="h-6 w-6" />
          </NavLink>
          <NavLink activePageIndex={currentIndex} index={2} setView={changeView} label="Profil">
            <UserIcon className="h-6 w-6" />
          </NavLink>
        </nav>
      )}
    </div>
  );
}
