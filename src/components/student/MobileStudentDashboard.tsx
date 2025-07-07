'use client';

import { useState } from 'react';
import { Home, History, User as UserIcon, ArrowLeft } from 'lucide-react';
import { StudentHome } from './StudentHome';
import { AttendanceHistory } from './AttendanceHistory';
import { StudentProfile } from './StudentProfile';
import { CheckinCard } from '@/components/check-in/CheckinCard';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLottieLoader } from '@/components/ui/lottie-loader';
import { motion, AnimatePresence } from 'framer-motion';

type ActiveView = 'home' | 'history' | 'profile' | 'checkin';

const mainViews: ActiveView[] = ['home', 'history', 'profile'];

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
  activeView,
  view,
  setView,
  children,
  label
}: {
  activeView: ActiveView,
  view: ActiveView,
  setView: (view: ActiveView) => void,
  children: React.ReactNode,
  label: string,
}) => {
  const isActive = activeView === view;
  return (
    <button
      onClick={() => setView(view)}
      className={`flex flex-col items-center justify-center w-1/3 pt-2 pb-1 ${
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
      }`}
    >
      {children}
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );
};

export function MobileStudentDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [direction, setDirection] = useState(0);
  const { userProfile, loading } = useAuth();

  const currentIndex = mainViews.indexOf(activeView);
  const isSubView = currentIndex === -1;

  if (loading) {
      return <CenteredLottieLoader />;
  }
  if (!userProfile) {
      return <div>Data pengguna tidak ditemukan.</div>
  }

  const changeView = (newView: ActiveView) => {
    const newIndex = mainViews.indexOf(newView);
    const oldIndex = mainViews.indexOf(activeView);

    if (oldIndex !== -1 && newIndex !== -1) {
        setDirection(newIndex > oldIndex ? 1 : -1);
    } else {
        setDirection(1); // sub-views always slide in from the right
    }
    setActiveView(newView);
  };
  
  const handleSwipe = (newDirection: number) => {
    if (isSubView) return;
    const newIndex = currentIndex + newDirection;
    if (newIndex >= 0 && newIndex < mainViews.length) {
        changeView(mainViews[newIndex]);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return <StudentHome setActiveView={changeView} />;
      case 'history':
        return <AttendanceHistory />;
      case 'profile':
        return <StudentProfile />;
      case 'checkin':
        return (
          <div className="bg-background min-h-full flex flex-col">
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <button onClick={() => changeView('home')} className="p-1">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-foreground">Kehadiran</h1>
            </header>
            <div className="flex-grow flex items-center justify-center p-4">
              <CheckinCard onSuccess={() => changeView('home')} />
            </div>
          </div>
        );
      default:
        return <StudentHome setActiveView={changeView} />;
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
      <main className="flex-grow pb-20 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={activeView}
              className="absolute w-full h-full"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              drag={!isSubView ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                  if (isSubView) return;
                  const swipeThreshold = 100;
                  if (offset.x < -swipeThreshold || velocity.x < -500) {
                      handleSwipe(1);
                  } else if (offset.x > swipeThreshold || velocity.x > 500) {
                      handleSwipe(-1);
                  }
              }}
            >
              {renderContent()}
            </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-1 flex justify-around z-10">
        <NavLink activeView={mainViews[currentIndex]} view="home" setView={changeView} label="Beranda">
          <Home className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={mainViews[currentIndex]} view="history" setView={changeView} label="Riwayat">
          <History className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={mainViews[currentIndex]} view="profile" setView={changeView} label="Profil">
          <UserIcon className="h-6 w-6" />
        </NavLink>
      </nav>
    </div>
  );
}
