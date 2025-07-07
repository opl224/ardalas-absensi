'use client';
import { Home, BookOpen, GraduationCap, Search } from "lucide-react"
import Link from "next/link";
import { CheckinCard } from "@/components/check-in/CheckinCard";
import { UserNav } from "@/components/UserNav";
import { Logo } from "@/components/Logo";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from "@/components/ui/sidebar";
import { MobileStudentDashboard } from "@/components/student/MobileStudentDashboard";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function StudentDashboard() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <div>Memuat...</div>;
  }
  
  const user = {
    name: userProfile.name,
    role: "Student" as const,
    avatar: userProfile.avatar || "https://placehold.co/100x100.png"
  };

  return (
    <>
      {/* Desktop View */}
      <div className="hidden md:block">
        <SidebarProvider>
          <Sidebar side="left" collapsible="icon">
            <SidebarHeader>
              <Logo />
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Dasbor">
                    <Home />
                    <span>Dasbor</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Nilai Saya">
                    <GraduationCap />
                    <span>Nilai Saya</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Mata Pelajaran">
                    <BookOpen />
                    <span>Mata Pelajaran</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="flex min-h-screen w-full flex-col">
              <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
                <Breadcrumb className="hidden md:flex">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link href="#">Dasbor</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="relative ml-auto flex-1 md:grow-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cari..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                  />
                </div>
                <UserNav />
              </header>
              <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
                <CheckinCard />
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <MobileStudentDashboard />
      </div>
    </>
  );
}
