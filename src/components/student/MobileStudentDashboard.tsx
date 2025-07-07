'use client';

import { useState } from 'react';
import { Home, History, User as UserIcon, ArrowLeft } from 'lucide-react';
import { StudentHome } from './StudentHome';
import { AttendanceHistory } from './AttendanceHistory';
import { StudentProfile } from './StudentProfile';
import { CheckinCard } from '@/components/check-in/CheckinCard';

interface MobileStudentDashboardProps {
  user: {
    name: string;
    role: 'Student';
    avatar: string;
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

export function MobileStudentDashboard({ user }: MobileStudentDashboardProps) {
  const [activeView, setActiveView] = useState<ActiveView>('home');

  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return <StudentHome user={user} setActiveView={setActiveView} />;
      case 'history':
        return <AttendanceHistory user={user} />;
      case 'profile':
        return <StudentProfile user={user} />;
      case 'checkin':
        return (
          <div className="p-4 h-full flex flex-col">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={() => setActiveView('home')} className="p-1">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-foreground">Attendance</h1>
            </header>
            <div className="flex-grow flex items-center justify-center">
              <CheckinCard user={user} onSuccess={() => setActiveView('home')} />
            </div>
          </div>
        );
      default:
        return <StudentHome user={user} setActiveView={setActiveView} />;
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
