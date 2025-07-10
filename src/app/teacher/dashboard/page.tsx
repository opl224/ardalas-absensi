
'use client';

import { useEffect, useState } from "react";
import { Home, LineChart, Search, GraduationCap, BookOpen, Users, UserCheck, UserX, Clock } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserNav } from "@/components/UserNav"
import { Sidebar, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarContent, SidebarHeader, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Logo } from "@/components/Logo"
import { MobileTeacherDashboard } from "@/components/teacher/MobileTeacherDashboard"
import { CheckinCard } from "@/components/check-in/CheckinCard"
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getDocs, Timestamp, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CenteredLoader, Loader } from "@/components/ui/loader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";

interface StudentAttendanceRecord {
    id: string;
    name: string;
    checkInTime: Timestamp;
    status: 'Hadir' | 'Terlambat' | 'Tidak Hadir';
    isFraudulent?: boolean;
}

interface Stats {
    total: number;
    present: number;
    late: number;
    absent: number;
}

export default function TeacherDashboard() {
  const { userProfile } = useAuth();
  
  if (!userProfile) {
      return <CenteredLoader />
  }

  const user = {
    name: userProfile.name,
    role: "Guru" as const,
    avatar: userProfile.avatar || "https://placehold.co/100x100.png",
    subject: userProfile.subject || "Tidak diketahui"
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
                  <SidebarMenuButton isActive tooltip="Beranda">
                    <Home />
                    <span>Beranda</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Kelas Saya">
                    <BookOpen />
                    <span>Kelas Saya</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Siswa">
                    <GraduationCap />
                    <span>Siswa</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Laporan">
                    <LineChart />
                    <span>Laporan</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <SidebarTrigger className="sm:hidden" />
                    <Breadcrumb className="hidden md:flex">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="#">Beranda</Link>
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
                <main className="flex flex-1 items-center justify-center p-4 md:p-8">
                  <div className="w-full max-w-lg">
                    <CheckinCard />
                  </div>
                </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      {/* Mobile View */}
      <div className="md:hidden">
        <MobileTeacherDashboard />
      </div>
    </>
  );
}
