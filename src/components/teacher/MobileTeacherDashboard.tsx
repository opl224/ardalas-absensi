'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Home, History, User as UserIcon, ArrowLeft } from 'lucide-react';
import { TeacherHome } from './TeacherHome';
import { AttendanceHistory } from './AttendanceHistory';
import { TeacherProfile } from './TeacherProfile';
import { CheckinCard } from '@/components/check-in/CheckinCard';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLottieLoader } from '@/components/ui/lottie-loader';
import { motion, AnimatePresence } from 'framer-motion';

type MainViewID = 'home' | 'history' | 'profile';
type SubViewID = 'checkin';
type ViewID = MainViewID | SubViewID;

const mainViews: MainViewID[] = ['home', 'history', 'profile'];

const viewComponents: { [key in ViewID]: React.FC<any> } = {
  home: TeacherHome,
  history: AttendanceHistory,
  profile: TeacherProfile,
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
  label,
}: {
  activePageIndex: number;
  index: number;
  setView: (viewId: ViewID) => void;
  children: React.ReactNode;
  label: string;
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


export function MobileTeacherDashboard() {
  const [view, setView] = useState<ViewID>('home');
  const [direction, setDirection] = useState(0);
  const { userProfile, loading } = useAuth();
  
  const viewIndexRef = useRef(mainViews.indexOf(view as MainViewID));
  const [activePageIndex, setActivePageIndex] = useState(0);

  useEffect(() => {
    const newIndex = mainViews.indexOf(view as MainViewID);
    if(newIndex !== -1) {
      viewIndexRef.current = newIndex;
      setActivePageIndex(newIndex);
    }
  }, [view]);

  if (loading) {
      return <CenteredLottieLoader />;
  }
  if (!userProfile) {
      return <div>Data pengguna tidak ditemukan.</div>
  }
  
  const changeView = (newView: ViewID) => {
    const oldIndex = viewIndexRef.current;
    const newIndex = mainViews.indexOf(newView as MainViewID);
    
    if (newIndex !== -1) {
      let d = newIndex > oldIndex ? 1 : -1;
      setDirection(d);
    } else {
      setDirection(1); // subview
    }

    setView(newView);
  };
  
  const handleDragEnd = (e: any, { offset, velocity }: { offset: { x: number, y: number }, velocity: { x: number, y: number } }) => {
    const swipeThreshold = 50;
    const swipePower = (offset: number, velocity: number) => {
      return Math.abs(offset) * velocity;
    };

    if (swipePower(offset.x, velocity.x) < -swipeThreshold * 100) {
      const newIndex = Math.min(viewIndexRef.current + 1, mainViews.length - 1);
      if (newIndex !== viewIndexRef.current) {
        changeView(mainViews[newIndex]);
      }
    } else if (swipePower(offset.x, velocity.x) > swipeThreshold * 100) {
      const newIndex = Math.max(viewIndexRef.current - 1, 0);
      if (newIndex !== viewIndexRef.current) {
        changeView(mainViews[newIndex]);
      }
    }
  };


  const isSubView = !mainViews.includes(view);
  let ComponentToRender: React.FC<any>;
  let props: any = { setActiveView: changeView };

  if (view === 'checkin') {
      ComponentToRender = CheckinWrapper;
      props = { onBack: () => changeView('home'), onSuccess: () => changeView('home') };
  } else {
      ComponentToRender = viewComponents[view];
  }


  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
       <main className="flex-grow relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={view}
              className="absolute w-full h-full overflow-y-auto pb-20"
              custom={direction}
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

      {view !== 'checkin' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-1 flex justify-around z-10">
          <NavLink activePageIndex={activePageIndex} index={0} setView={changeView} label="Beranda">
            <Home className="h-6 w-6" />
          </NavLink>
          <NavLink activePageIndex={activePageIndex} index={1} setView={changeView} label="Riwayat">
            <History className="h-6 w-6" />
          </NavLink>
          <NavLink activePageIndex={activePageIndex} index={2} setView={changeView} label="Profil">
            <UserIcon className="h-6 w-6" />
          </NavLink>
        </nav>
      )}
    </div>
  );
}
