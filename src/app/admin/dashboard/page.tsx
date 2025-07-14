
'use client';

import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { CenteredLoader } from "@/components/ui/loader";
import { ThemeToggle } from "@/components/ThemeToggle";
import dynamic from 'next/dynamic';
import { Capacitor } from "@capacitor/core";
import { Monitor, Smartphone } from "lucide-react";

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

function AdminDashboardContent() {
  const { userProfile, loading } = useAuth();
  const [activeView, setActiveView] = useState<ViewID>('home');
  const [isNativePlatform, setIsNativePlatform] = useState(false);
  const [platformCheckCompleted, setPlatformCheckCompleted] = useState(false);

  useEffect(() => {
    const checkPlatform = () => {
      setIsNativePlatform(Capacitor.isNativePlatform());
      setPlatformCheckCompleted(true);
    };
    checkPlatform();
  }, []);


  if (loading || !userProfile || !platformCheckCompleted) {
    return <CenteredLoader />;
  }

  if (isNativePlatform) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-8 text-center">
            <Monitor className="h-16 w-16 text-primary mb-4" />
            <h1 className="text-2xl font-bold">Akses Ditolak di Aplikasi</h1>
            <p className="text-muted-foreground mt-2 max-w-sm">
                Untuk keamanan dan fungsionalitas penuh, halaman admin hanya dapat diakses melalui browser web di desktop atau ponsel Anda.
            </p>
        </div>
    );
  }
  
  const renderView = () => {
    switch (activeView) {
      case 'users':
        return <UserManagement setIsEditingUser={() => {}} />;
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
            <div className="flex-1 overflow-auto">
                {renderView()}
            </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default dynamic(() => Promise.resolve(AdminDashboardContent), {
  ssr: false,
  loading: () => <CenteredLoader />,
});
