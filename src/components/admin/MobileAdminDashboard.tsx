'use client'

import { useState } from "react";
import { Home, User as UserIcon, Users2, LineChart, CheckSquare } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { Reports } from "./Reports";
import { MobileHome } from "./MobileHome";
import { Profile } from "./Profile";
import { Attendance } from "./Attendance";
import { PushNotifications } from "./PushNotifications";
import { Privacy } from "./Privacy";

type ActiveView = 'home' | 'profile' | 'users' | 'reports' | 'attendance' | 'push-notifications' | 'privacy';

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
    return (
        <button
            onClick={() => setView(view)}
            className={`flex flex-col items-center w-1/5 pt-1 ${activeView === view ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
        >
            {children}
            <span className="text-xs mt-1 font-medium">{label}</span>
        </button>
    );
};


export function MobileAdminDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('home');

  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return <MobileHome setActiveView={setActiveView} />;
      case 'users':
        return <UserManagement />;
      case 'reports':
        return <Reports />;
      case 'profile':
        return <Profile setActiveView={setActiveView} />;
      case 'attendance':
        return <Attendance />;
      case 'push-notifications':
        return <PushNotifications onBack={() => setActiveView('profile')} />;
      case 'privacy':
        return <Privacy onBack={() => setActiveView('profile')} />;
      default:
        return <MobileHome setActiveView={setActiveView} />;
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen">
      <main className="pb-24">
        {renderContent()}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-2 flex justify-around">
        <NavLink activeView={activeView} view="home" setView={setActiveView} label="Beranda">
          <Home className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={activeView} view="users" setView={setActiveView} label="Pengguna">
          <Users2 className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={activeView} view="reports" setView={setActiveView} label="Laporan">
          <LineChart className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={activeView} view="attendance" setView={setActiveView} label="Kehadiran">
          <CheckSquare className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={activeView} view="profile" setView={setActiveView} label="Profil">
          <UserIcon className="h-6 w-6" />
        </NavLink>
      </nav>
    </div>
  );
}
