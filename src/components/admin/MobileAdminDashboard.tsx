'use client'

import React, { useState, useRef } from "react";
import { Home, User as UserIcon, Users2, LineChart, CheckSquare } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { Reports } from "./Reports";
import { MobileHome } from "./MobileHome";
import { Profile } from "./Profile";
import { Attendance } from "./Attendance";
import { PushNotifications } from "./PushNotifications";
import { Privacy } from "./Privacy";
import { motion, AnimatePresence } from "framer-motion";

type MainViewID = 'home' | 'users' | 'reports' | 'attendance' | 'profile';
type SubViewID = 'push-notifications' | 'privacy';
type ViewID = MainViewID | SubViewID;

const mainViews: MainViewID[] = ['home', 'users', 'reports', 'attendance', 'profile'];

const viewComponents: { [key in ViewID]: React.FC<any> } = {
    home: MobileHome,
    users: UserManagement,
    reports: Reports,
    attendance: Attendance,
    profile: Profile,
    'push-notifications': PushNotifications,
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
    label: string
}) => {
    const isActive = activePageIndex === index;
    return (
        <button
            onClick={() => setView(index)}
            className={`flex flex-col items-center w-1/5 pt-1 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
        >
            {children}
            <span className="text-xs mt-1 font-medium">{label}</span>
        </button>
    );
};


export function MobileAdminDashboard() {
  const [view, setView] = useState<number | ViewID>(0);
  const [direction, setDirection] = useState(0);

  const viewRef = useRef(view);
  viewRef.current = view;

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
  const ComponentToRender = viewComponents[viewIdToRender];
  const isSubView = typeof view !== 'number';

  const props = {
      setActiveView: changeView,
      onBack: () => changeView(mainViews.indexOf('profile')),
  };

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
      <main className="flex-grow pb-24 relative overflow-hidden">
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-2 flex justify-around z-10">
        <NavLink activePageIndex={currentIndex} index={0} setView={changeView} label="Beranda">
          <Home className="h-6 w-6" />
        </NavLink>
        <NavLink activePageIndex={currentIndex} index={1} setView={changeView} label="Pengguna">
          <Users2 className="h-6 w-6" />
        </NavLink>
        <NavLink activePageIndex={currentIndex} index={2} setView={changeView} label="Laporan">
          <LineChart className="h-6 w-6" />
        </NavLink>
        <NavLink activePageIndex={currentIndex} index={3} setView={changeView} label="Kehadiran">
          <CheckSquare className="h-6 w-6" />
        </NavLink>
        <NavLink activePageIndex={currentIndex} index={4} setView={changeView} label="Profil">
          <UserIcon className="h-6 w-6" />
        </NavLink>
      </nav>
    </div>
  );
}
