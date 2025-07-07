'use client';

import { useEffect, useState } from "react";
import { Home, LineChart, Search, GraduationCap, BookOpen, Users } from "lucide-react"
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

// TODO: Ganti dengan data asli dari Firestore
const studentAttendanceData: any[] = [];

export default function TeacherDashboard() {
  const { userProfile } = useAuth();
  
  if (!userProfile) {
      return <div>Memuat...</div>
  }

  const user = {
    name: userProfile.name,
    role: "Teacher" as const,
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
                  <SidebarMenuButton isActive tooltip="Dasbor">
                    <Home />
                    <span>Dasbor</span>
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
                            <Link href="#">Dasbor</Link>
                        </BreadcrumbLink>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                    </Breadcrumb>
                    <div className="relative ml-auto flex-1 md:grow-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari siswa..."
                        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    />
                    </div>
                    <UserNav />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {/* TODO: Fetch data from Firestore */}
                                <div className="text-2xl font-bold">45</div>
                                <p className="text-xs text-muted-foreground">di kelas Anda</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Hadir Hari Ini</CardTitle>
                                <GraduationCap className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-primary">40</div>
                                <p className="text-xs text-muted-foreground">di kelas Anda saat ini</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Absen Hari Ini</CardTitle>
                                <GraduationCap className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">5</div>
                                <p className="text-xs text-muted-foreground">termasuk 2 terlambat</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Jadwal Anda</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                            <div className="text-2xl font-bold">10:00 AM</div>
                            <p className="text-xs text-muted-foreground">Kelas berikutnya: Matematika 10B</p>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                            <CardTitle>Absensi Hari Ini - {user.subject}</CardTitle>
                            <CardDescription>
                                Catatan kehadiran siswa untuk kelas Anda hari ini.
                            </CardDescription>
                            </CardHeader>
                            <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>Siswa</TableHead>
                                    <TableHead className="hidden sm:table-cell">Waktu Check-in</TableHead>
                                    <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentAttendanceData.length === 0 && <TableRow><TableCell colSpan={3}>Belum ada data absensi hari ini.</TableCell></TableRow>}
                                    {studentAttendanceData.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                        <div className="font-medium">{item.name}</div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">{item.time}</TableCell>
                                        <TableCell>
                                        <Badge variant={
                                            item.status === 'Hadir' ? 'default' :
                                            item.status === 'Terlambat' ? 'secondary' : 
                                            item.status === 'Absen' ? 'outline' : 'destructive'
                                        }>{item.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <div className="lg:col-span-1">
                            <CheckinCard />
                        </div>
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
