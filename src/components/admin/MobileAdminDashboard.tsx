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
    setView: (viewId: ViewID) => void,
    children: React.ReactNode,
    label: string
}) => {
    const isActive = activePageIndex === index;
    return (
        <button
            onClick={() => setView(mainViews[index])}
            className={`flex flex-col items-center w-1/5 pt-1 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
        >
            {children}
            <span className="text-xs mt-1 font-medium">{label}</span>
        </button>
    );
};


export function MobileAdminDashboard() {
  const [view, setView] = useState<ViewID>('home');
  const [direction, setDirection] = useState(0);
  const pageIndexRef = useRef(0);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const changeView = (newView: ViewID) => {
    const newIndex = mainViews.indexOf(newView as MainViewID);
    const oldIndex = pageIndexRef.current;

    if (newIndex !== -1) { // It's a main view
      if (newIndex !== oldIndex) {
        setDirection(newIndex > oldIndex ? 1 : -1);
      }
      pageIndexRef.current = newIndex;
      setActivePageIndex(newIndex);
    } else { // It's a subview
      setDirection(1);
    }
    setView(newView);
  };
  
  const handleDragEnd = (e: any, { offset }: { offset: { x: number } }) => {
    const swipeThreshold = 50;
    const currentIndex = pageIndexRef.current;

    if (offset.x < -swipeThreshold) { // Swiped left
      const newIndex = Math.min(currentIndex + 1, mainViews.length - 1);
      if (newIndex !== currentIndex) {
        changeView(mainViews[newIndex]);
      }
    } else if (offset.x > swipeThreshold) { // Swiped right
      const newIndex = Math.max(currentIndex - 1, 0);
      if (newIndex !== currentIndex) {
        changeView(mainViews[newIndex]);
      }
    }
  };
  
  const isSubView = !mainViews.includes(view);
  const ComponentToRender = viewComponents[view];
  const props = {
      setActiveView: changeView,
      onBack: () => changeView('profile'),
  };

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
      <main className="flex-grow relative overflow-y-auto">
        <AnimatePresence initial={false} custom={direction}>
            <motion.div
                key={view}
                className="absolute w-full h-full overflow-y-auto pb-24"
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-2 flex justify-around z-10">
        <NavLink activePageIndex={activePageIndex} index={0} setView={changeView} label="Beranda">
          <Home className="h-6 w-6" />
        </NavLink>
        <NavLink activePageIndex={activePageIndex} index={1} setView={changeView} label="Pengguna">
          <Users2 className="h-6 w-6" />
        </NavLink>
        <NavLink activePageIndex={activePageIndex} index={2} setView={changeView} label="Laporan">
          <LineChart className="h-6 w-6" />
        </NavLink>
        <NavLink activePageIndex={activePageIndex} index={3} setView={changeView} label="Kehadiran">
          <CheckSquare className="h-6 w-6" />
        </NavLink>
        <NavLink activePageIndex={activePageIndex} index={4} setView={changeView} label="Profil">
          <UserIcon className="h-6 w-6" />
        </NavLink>
      </nav>
    </div>
  );
}
