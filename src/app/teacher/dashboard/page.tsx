
'use client';

import { CenteredLoader } from "@/components/ui/loader";
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard";
import { useAuth } from "@/hooks/useAuth";

export default function TeacherDashboard() {
  const { userProfile } = useAuth();
  
  if (!userProfile) {
      return <CenteredLoader />
  }
  
  // Render only the mobile view for all screen sizes to enforce mobile-only access for teachers.
  return (
    <>
      <MobileTeacherDashboard />
    </>
  );
}
