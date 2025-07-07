'use client'

import { useState, useRef } from "react";
import { Home, User as UserIcon, Users2, LineChart, CheckSquare } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { Reports } from "./Reports";
import { MobileHome } from "./MobileHome";
import { Profile } from "./Profile";
import { Attendance } from "./Attendance";
import { PushNotifications } from "./PushNotifications";
import { Privacy } from "./Privacy";
import { motion, AnimatePresence } from "framer-motion";

type ActiveView = 'home' | 'profile' | 'users' | 'reports' | 'attendance' | 'push-notifications' | 'privacy';

const mainViews: ActiveView[] = ['home', 'users', 'reports', 'attendance', 'profile'];

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
    label: string
}) => {
    const isActive = activeView === view;
    return (
        <button
            onClick={() => setView(view)}
            className={`flex flex-col items-center w-1/5 pt-1 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
        >
            {children}
            <span className="text-xs mt-1 font-medium">{label}</span>
        </button>
    );
};


export function MobileAdminDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [direction, setDirection] = useState(0);

  const currentIndex = mainViews.indexOf(activeView);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const isSubView = currentIndex === -1;

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
    const newIndex = currentIndexRef.current + newDirection;
    if (newIndex >= 0 && newIndex < mainViews.length) {
        changeView(mainViews[newIndex]);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return <MobileHome setActiveView={changeView} />;
      case 'users':
        return <UserManagement />;
      case 'reports':
        return <Reports />;
      case 'profile':
        return <Profile setActiveView={changeView} />;
      case 'attendance':
        return <Attendance />;
      case 'push-notifications':
        return <PushNotifications onBack={() => changeView('profile')} />;
      case 'privacy':
        return <Privacy onBack={() => changeView('profile')} />;
      default:
        return <MobileHome setActiveView={changeView} />;
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
      <main className="flex-grow pb-24 relative overflow-hidden">
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
                        handleSwipe(1); // Swipe left
                    } else if (offset.x > swipeThreshold || velocity.x > 500) {
                        handleSwipe(-1); // Swipe right
                    }
                }}
            >
                {renderContent()}
            </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-2 flex justify-around z-10">
        <NavLink activeView={mainViews[currentIndex]} view="home" setView={changeView} label="Beranda">
          <Home className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={mainViews[currentIndex]} view="users" setView={changeView} label="Pengguna">
          <Users2 className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={mainViews[currentIndex]} view="reports" setView={changeView} label="Laporan">
          <LineChart className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={mainViews[currentIndex]} view="attendance" setView={changeView} label="Kehadiran">
          <CheckSquare className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={mainViews[currentIndex]} view="profile" setView={changeView} label="Profil">
          <UserIcon className="h-6 w-6" />
        </NavLink>
      </nav>
    </div>
  );
}
