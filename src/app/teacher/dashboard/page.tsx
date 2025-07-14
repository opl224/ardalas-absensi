
'use client';

import { useEffect, useState } from "react";
import { CenteredLoader } from "@/components/ui/loader";
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, MonitorOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export default function TeacherDashboard() {
  const { userProfile, loading: authLoading, logout } = useAuth();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);

  // This ensures we don't show the desktop warning on mobile, even for a split second.
  // It also prevents hydration errors.
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (authLoading || !isClient) {
    return <CenteredLoader />;
  }

  // If the user is a teacher and on a desktop device, show a restricted access message.
  if (userProfile?.role === 'guru' && !isMobile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <MonitorOff className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Akses Ditolak</h1>
        <p className="max-w-md text-muted-foreground">
          Untuk alasan keamanan dan fungsionalitas, aplikasi ini hanya dapat diakses melalui perangkat seluler untuk peran guru.
        </p>
        <Button onClick={() => logout()} variant="outline" className="mt-6">
            <LogOut className="mr-2 h-4 w-4" />
            Kembali ke Halaman Login
        </Button>
      </div>
    );
  }
  
  // Render the mobile dashboard for teachers on mobile devices
  return (
    <>
      <MobileTeacherDashboard />
    </>
  );
}
