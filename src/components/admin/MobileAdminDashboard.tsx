'use client'

import { useState } from "react";
import { Home, User as UserIcon, Users2, LineChart, CheckSquare } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { Reports } from "./Reports";
import { MobileHome } from "./MobileHome";

type ActiveView = 'home' | 'profile' | 'users' | 'reports' | 'attendance';

const NavLink = ({
    activeView,
    view,
    setView,
    children
}: {
    activeView: ActiveView,
    view: ActiveView,
    setView: (view: ActiveView) => void,
    children: React.ReactNode
}) => {
    return (
        <button
            onClick={() => setView(view)}
            className={`flex flex-col items-center w-1/5 pt-1 ${activeView === view ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
        >
            {children}
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
        return <div className="p-4 text-center">Profile Page (not implemented)</div>;
      case 'attendance':
        return <div className="p-4 text-center">Attendance Page (not implemented)</div>;
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
        <NavLink activeView={activeView} view="home" setView={setActiveView}>
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Home</span>
        </NavLink>
        <NavLink activeView={activeView} view="profile" setView={setActiveView}>
          <UserIcon className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </NavLink>
        <NavLink activeView={activeView} view="users" setView={setActiveView}>
          <Users2 className="h-6 w-6" />
          <span className="text-xs mt-1">Users</span>
        </NavLink>
        <NavLink activeView={activeView} view="reports" setView={setActiveView}>
          <LineChart className="h-6 w-6" />
          <span className="text-xs mt-1">Reports</span>
        </NavLink>
        <NavLink activeView={activeView} view="attendance" setView={setActiveView}>
          <CheckSquare className="h-6 w-6" />
          <span className="text-xs mt-1">Attendance</span>
        </NavLink>
      </nav>
    </div>
  );
}
