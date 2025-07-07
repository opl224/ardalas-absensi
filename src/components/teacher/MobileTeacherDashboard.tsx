'use client';

import { useState } from 'react';
import { Home, History, User as UserIcon } from 'lucide-react';
import { TeacherHome } from './TeacherHome';
import { AttendanceHistory } from './AttendanceHistory';
import { TeacherProfile } from './TeacherProfile';
import { CheckinCard } from '@/components/check-in/CheckinCard';

interface MobileTeacherDashboardProps {
  user: {
    name: string;
    role: 'Teacher';
    avatar: string;
    subject: string;
  };
}

type ActiveView = 'home' | 'history' | 'profile' | 'checkin';

const NavLink = ({
  activeView,
  view,
  setView,
  children,
}: {
  activeView: ActiveView;
  view: ActiveView;
  setView: (view: ActiveView) => void;
  children: React.ReactNode;
}) => {
  return (
    <button
      onClick={() => setView(view)}
      className={`flex flex-col items-center justify-center w-1/3 pt-2 pb-1 ${
        activeView === view ? 'text-primary' : 'text-muted-foreground hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
};

export function MobileTeacherDashboard({ user }: MobileTeacherDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('home');

  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return <TeacherHome user={user} setActiveView={setActiveView} />;
      case 'history':
        return <AttendanceHistory user={user} />;
      case 'profile':
        return <TeacherProfile user={user} />;
      case 'checkin':
        return (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <CheckinCard user={user} onSuccess={() => setActiveView('home')} />
          </div>
        );
      default:
        return <TeacherHome user={user} setActiveView={setActiveView} />;
    }
  };

  if (activeView === 'checkin') {
    return (
      <div className="bg-background min-h-screen flex flex-col">
          {renderContent()}
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 min-h-screen flex flex-col">
      <main className="flex-grow pb-20">{renderContent()}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-1 flex justify-around">
        <NavLink activeView={activeView} view="home" setView={setActiveView}>
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">Home</span>
        </NavLink>
        <NavLink activeView={activeView} view="history" setView={setActiveView}>
          <History className="h-6 w-6" />
          <span className="text-xs mt-1">History</span>
        </NavLink>
        <NavLink activeView={activeView} view="profile" setView={setActiveView}>
          <UserIcon className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
