
'use client';

import { CenteredLoader } from "@/components/ui/loader";
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard";
import dynamic from 'next/dynamic'
import { useAuth } from "@/hooks/useAuth";

// This component will now only be rendered on the client,
// which is the safest way to avoid hydration errors and freezes in Capacitor.
function TeacherDashboardContent() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return <CenteredLoader />;
  }

  if (!userProfile) {
    // This case should ideally be handled by the AuthProvider redirect, 
    // but as a fallback, we show a message.
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <p>Profil pengguna tidak dapat dimuat. Mencoba mengalihkan...</p>
        </div>
    );
  }

  return (
    <>
      <MobileTeacherDashboard />
    </>
  );
}

// Use dynamic import to prevent SSR for this component entirely.
export default dynamic(() => Promise.resolve(TeacherDashboardContent), {
  ssr: false,
  loading: () => <CenteredLoader />,
});
