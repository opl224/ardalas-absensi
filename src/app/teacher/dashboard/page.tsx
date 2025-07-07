'use client';

import { CheckinCard } from "@/components/check-in/CheckinCard";
import { UserNav } from "@/components/UserNav";
import { Logo } from "@/components/Logo";
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard";

export default function TeacherDashboard() {
  const user = { name: "John Smith", role: "Teacher" as const, avatar: "https://placehold.co/100x100.png", subject: "Mathematics" };

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        <MobileTeacherDashboard user={user} />
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex min-h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
          <Logo />
          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto">
              <UserNav user={user} />
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
          <CheckinCard user={user} />
        </main>
      </div>
    </>
  );
}