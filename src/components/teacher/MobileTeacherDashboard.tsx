'use client';

import { useState } from 'react';
import { Home, History, User as UserIcon, ArrowLeft } from 'lucide-react';
import { TeacherHome } from './TeacherHome';
import { AttendanceHistory } from './AttendanceHistory';
import { TeacherProfile } from './TeacherProfile';
import { CheckinCard } from '@/components/check-in/CheckinCard';
import { useAuth } from '@/hooks/useAuth';
import { CenteredLottieLoader } from '@/components/ui/lottie-loader';

type ActiveView = 'home' | 'history' | 'profile' | 'checkin';

const NavLink = ({
  activeView,
  view,
  setView,
  children,
  label,
}: {
  activeView: ActiveView;
  view: ActiveView;
  setView: (view: ActiveView) => void;
  children: React.ReactNode;
  label: string;
}) => {
  return (
    <button
      onClick={() => setView(view)}
      className={`flex flex-col items-center justify-center w-1/3 pt-2 pb-1 ${
        activeView === view ? 'text-primary' : 'text-muted-foreground hover:text-primary'
      }`}
    >
      {children}
      <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );
};

export function MobileTeacherDashboard() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const { userProfile, loading } = useAuth();

  if (loading) {
      return <CenteredLottieLoader />;
  }
  if (!userProfile) {
      return <div>Data pengguna tidak ditemukan.</div>
  }

  const renderContent = () => {
    switch (activeView) {
      case 'home':
        return <TeacherHome setActiveView={setActiveView} />;
      case 'history':
        return <AttendanceHistory />;
      case 'profile':
        return <TeacherProfile />;
      case 'checkin':
        return (
          <>
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <button onClick={() => setActiveView('home')} className="p-1">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-foreground">Kehadiran</h1>
            </header>
            <div className="flex-grow flex items-center justify-center p-4">
              <CheckinCard onSuccess={() => setActiveView('home')} />
            </div>
          </>
        );
      default:
        return <TeacherHome setActiveView={setActiveView} />;
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
      <main className="flex-grow pb-20 overflow-y-auto">{renderContent()}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t p-1 flex justify-around">
        <NavLink activeView={activeView} view="home" setView={setActiveView} label="Beranda">
          <Home className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={activeView} view="history" setView={setActiveView} label="Riwayat">
          <History className="h-6 w-6" />
        </NavLink>
        <NavLink activeView={activeView} view="profile" setView={setActiveView} label="Profil">
          <UserIcon className="h-6 w-6" />
        </NavLink>
      </nav>
    </div>
  );
}
