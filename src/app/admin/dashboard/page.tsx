
'use client';

import { useState } from "react";
import { Home, LineChart, Search, Users2, CheckSquare } from "lucide-react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { Input } from "@/components/ui/input"
import { UserNav } from "@/components/UserNav"
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarContent, SidebarHeader, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Logo } from "@/components/Logo"
import { MobileAdminDashboard } from "@/components/admin/MobileAdminDashboard"
import { useAuth } from "@/hooks/useAuth";
import { CenteredLoader } from "@/components/ui/loader";
import { ThemeToggle } from "@/components/ThemeToggle";
import dynamic from 'next/dynamic';

const DashboardHome = dynamic(() => import('@/components/admin/DashboardHome').then(mod => mod.DashboardHome), {
  loading: () => <CenteredLoader />,
});
const UserManagement = dynamic(() => import('@/components/admin/UserManagement'), {
  loading: () => <CenteredLoader />,
});
const Reports = dynamic(() => import('@/components/admin/Reports'), {
  loading: () => <CenteredLoader />,
});
const Attendance = dynamic(() => import('@/components/admin/Attendance'), {
  loading: () => <CenteredLoader />,
});


type ViewID = 'home' | 'users' | 'reports' | 'attendance';

const breadcrumbTitles: Record<ViewID, string> = {
  home: 'Beranda',
  users: 'Pengguna',
  reports: 'Laporan',
  attendance: 'Kehadiran'
};

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [activeView, setActiveView] = useState<ViewID>('home');
  // State to satisfy the prop requirement for UserManagement on desktop, though it won't be used visually here.
  const [isEditingUser, setIsEditingUser] = useState(false);

  if (!userProfile) return <CenteredLoader />;
  
  const renderView = () => {
    switch (activeView) {
      case 'users':
        return <UserManagement setIsEditingUser={setIsEditingUser} />;
      case 'reports':
        return <Reports />;
      case 'attendance':
        return <Attendance />;
      case 'home':
      default:
        return <DashboardHome />;
    }
  }

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
                  <SidebarMenuButton isActive={activeView === 'home'} onClick={() => setActiveView('home')} tooltip="Beranda">
                    <Home />
                    <span>Beranda</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeView === 'users'} onClick={() => setActiveView('users')} tooltip="Pengguna">
                    <Users2 />
                    <span>Pengguna</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeView === 'attendance'} onClick={() => setActiveView('attendance')} tooltip="Kehadiran">
                    <CheckSquare />
                    <span>Kehadiran</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeView === 'reports'} onClick={() => setActiveView('reports')} tooltip="Laporan">
                    <LineChart />
                    <span>Laporan</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="flex h-screen flex-col">
                <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 sm:h-16 lg:px-6">
                    <SidebarTrigger className="sm:hidden" />
                    <Breadcrumb className="hidden md:flex">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="#">{breadcrumbTitles[activeView]}</Link>
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
                    <ThemeToggle />
                    <UserNav />
                </header>
                {/* Main content is now conditionally rendered */}
                <div className="flex-1 overflow-auto">
                    {renderView()}
                </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      {/* Mobile View */}
      <div className="md:hidden">
        <MobileAdminDashboard />
      </div>
    </>
  )
}
