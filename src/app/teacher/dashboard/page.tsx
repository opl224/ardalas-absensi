
'use client';

import { useEffect, useState } from "react";
import { CenteredLoader } from "@/components/ui/loader";
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard";
import { useAuth } from "@/hooks/useAuth";
import { MonitorOff } from "lucide-react";

const DESKTOP_BREAKPOINT = 768; // Standard tablet portrait width

export default function TeacherDashboard() {
  const { userProfile, loading } = useAuth();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isCheckingDevice, setIsCheckingDevice] = useState(true);

  useEffect(() => {
    // This check runs only on the client side
    const checkDeviceType = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
      setIsCheckingDevice(false);
    };

    // Run once on mount
    checkDeviceType();

    // Optional: Add resize listener if you want it to be dynamic
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  if (loading || isCheckingDevice) {
    return <CenteredLoader />;
  }

  // If the user is a teacher and on a desktop device, show a restricted access message.
  if (userProfile?.role === 'guru' && isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <MonitorOff className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Akses Ditolak</h1>
        <p className="max-w-md text-muted-foreground">
          Untuk alasan keamanan dan fungsionalitas, aplikasi ini hanya dapat diakses melalui perangkat seluler untuk peran guru.
        </p>
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
