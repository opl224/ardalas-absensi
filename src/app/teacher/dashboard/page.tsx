
'use client';

import { CenteredLoader } from "@/components/ui/loader";
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard";
import dynamic from 'next/dynamic'

// This component will now only be rendered on the client,
// which is the safest way to avoid hydration errors and freezes in Capacitor.
function TeacherDashboardContent() {
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
