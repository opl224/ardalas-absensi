
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
import { useAuth } from "@/hooks/useAuth";
import { CenteredLoader } from "@/components/ui/loader";
import { ThemeToggle } from "@/components/ThemeToggle";
import dynamic from 'next/dynamic';
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAdminDashboard } from "@/components/admin/MobileAdminDashboard";
import type { User } from "@/components/admin/UserManagement";
import { EditUserForm } from "@/components/admin/UserManagement";

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

const breadcrumbTitles: Record<ViewID | 'editUser', string> = {
  home: 'Beranda',
  users: 'Pengguna',
  reports: 'Laporan',
  attendance: 'Kehadiran',
  editUser: 'Edit Pengguna'
};

function AdminDashboardContent() {
  const { userProfile, loading } = useAuth();
  const [activeView, setActiveView] = useState<ViewID>('home');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const isMobile = useIsMobile();
  
  const handleEditUser = (user: User | null) => {
    setEditingUser(user);
  };

  const handleBackFromEdit = () => {
    setEditingUser(null);
  };
  
  const handleSuccessEdit = () => {
    setEditingUser(null); 
  }

  if (loading || !userProfile) {
    return <CenteredLoader />;
  }

  if (isMobile) {
    return <MobileAdminDashboard />;
  }
  
  const renderView = () => {
    if (editingUser) {
        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <EditUserForm 
                    user={editingUser} 
                    onBack={handleBackFromEdit}
                    onSuccess={handleSuccessEdit}
                    isMobile={false} 
                />
            </div>
        );
    }
    
    switch (activeView) {
      case 'users':
        return <UserManagement onEditUser={handleEditUser} />;
      case 'reports':
        return <Reports />;
      case 'attendance':
        return <Attendance />;
      case 'home':
      default:
        return <DashboardHome setActiveView={setActiveView} />;
    }
  }

  const currentBreadcrumb = editingUser ? breadcrumbTitles.editUser : breadcrumbTitles[activeView];

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon">
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activeView === 'home'} onClick={() => { setActiveView('home'); setEditingUser(null); }} tooltip="Beranda">
                <Home />
                <span>Beranda</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activeView === 'users'} onClick={() => { setActiveView('users'); setEditingUser(null); }} tooltip="Pengguna">
                <Users2 />
                <span>Pengguna</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activeView === 'attendance'} onClick={() => { setActiveView('attendance'); setEditingUser(null); }} tooltip="Kehadiran">
                <CheckSquare />
                <span>Kehadiran</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton isActive={activeView === 'reports'} onClick={() => { setActiveView('reports'); setEditingUser(null); }} tooltip="Laporan">
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
                        <Link href="#">{currentBreadcrumb}</Link>
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
